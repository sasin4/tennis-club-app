import { supabase } from '../supabaseClient';

/**
 * 1. 새 경기 기록 저장 (트랜잭션 형태)
 * matches 테이블에 먼저 넣고, 생성된 match_id로 세트 스코어들을 한번에 저장합니다.
 */
export const insertMatchResult = async (matchPayload) => {
  try {
    // [Step A] 경기 기본 정보 인서트
    // get current authenticated user (v2 API)
    const { data: currentUserData } = await supabase.auth.getUser();
    const currentUserId = currentUserData?.user?.id || null;

    const { data: matchData, error: matchError } = await supabase
      .from('games')
      .insert([
        {
          game_date: matchPayload.game_date,
          game_number: 1, // DB에서 NOT NULL인 game_number 필드에 기본값 1을 추가합니다.
          match_type: matchPayload.match_type,
          team1_player1_id: currentUserId, // 현재 로그인한 내 유저 ID
          team1_player2_id: matchPayload.partner_id || null,
          team2_player1_id: matchPayload.opponent1_id,
          team2_player2_id: matchPayload.opponent2_id || null,
          winner_team: matchPayload.winner_team, // 폼에서 계산해서 넘겨준 승리팀 번호 (1 또는 2)
        }
      ])
      .select()
      .single(); // 생성된 단일 로우 데이터 가져오기

    if (matchError) throw new Error(`경기 정보 저장 실패: ${matchError.message}`);
    if (!matchData) throw new Error('경기 정보를 저장했으나 데이터를 반환받지 못했습니다. RLS 정책(SELECT)을 확인하세요.');

    const generatedMatchId = matchData.game_id;

    // [Step B] 세트 스코어 배열 조립 후 일괄(Bulk) 인서트
    const setsPayload = matchPayload.sets.map((set) => ({
      game_id: generatedMatchId,
      set_number: set.set_number,
      team1_score: set.team1_score,
      team2_score: set.team2_score,
      team1_tiebreak_score: set.team1_tiebreak,
      team2_tiebreak_score: set.team2_tiebreak,
    }));

    const { error: setsError } = await supabase
      .from('game_sets')
      .insert(setsPayload);

    if (setsError) throw setsError;

    return { success: true, matchId: generatedMatchId };
  } catch (error) {
    console.error('경기 기록 저장 중 오류 발생:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * 2. 전체 경기 기록 가져오기 (관계형 조인)
 * 한 테이블을 가져오면서 연관된 세트 스코어와 상대방 이름까지 한 번에 긁어옵니다.
 */
export const fetchMatchHistory = async (page = 1, pageSize = 5, filters = {}) => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Supabase(PostgREST)의 강력한 장점: 쿼리 한 줄로 하위 테이블 및 외래키 참조 테이블 조인이 가능합니다.
    let query = supabase
      .from('games')
      .select(`
        game_id,
        game_date,
        game_number,
        match_type,
        winner_team,
        game_sets (
          set_number,
          team1_score,
          team2_score,
          team1_tiebreak_score,
          team2_tiebreak_score
        ),
        partner:profiles!team1_player2_id(name),
        opponent1:profiles!team2_player1_id(name),
        opponent2:profiles!team2_player2_id(name)
      `);

    // 필터 조건 적용
    if (filters.startDate) query = query.gte('game_date', filters.startDate);
    if (filters.endDate) query = query.lte('game_date', filters.endDate);
    if (filters.result === 'win') query = query.eq('winner_team', 1);
    if (filters.result === 'lose') query = query.eq('winner_team', 2);
    
    // 추가 제안 필터: 경기 방식 (단식/복식)
    if (filters.matchType && filters.matchType !== 'all') {
      query = query.eq('match_type', filters.matchType);
    }

    const { data, error } = await query
      .order('game_date', { ascending: false }) // 최신순 정렬
      .range(from, to); // 오프셋 페이징 처리
    if (error) throw error;

    // 프론트엔드 UI 컴포넌트 형태에 맞게 데이터 가공(매핑)
    return data.map((match) => {
      const isMyTeamWin = match.winner_team === 1;
      return {
        id: match.game_id,
        date: match.game_date.replace(/-/g, '.'),
        type: match.match_type === 'Doubles' ? '복식' : '단식',
        partner: match.partner?.name || null,
        opponents: [match.opponent1?.name, match.opponent2?.name].filter(Boolean),
        setScores: match.game_sets
          .sort((a, b) => a.set_number - b.set_number)
          .map((s) => ({
            team1: s.team1_score,
            team2: s.team2_score,
            t1Tie: s.team1_tiebreak_score,
            t2Tie: s.team2_tiebreak_score,
          })),
        isWinner: isMyTeamWin,
      };
    });
  } catch (error) {
    console.error('기록 로드 중 오류 발생:', error.message);
    return [];
  }
};

export const fetchMatchDetail = async (matchId) => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select(`
        game_id,
        game_date,
        game_number,
        match_type,
        winner_team,
        game_sets (
          set_number,
          team1_score,
          team2_score,
          team1_tiebreak_score,
          team2_tiebreak_score    ),
        partner:profiles!team1_player2_id(name),  
        opponent1:profiles!team2_player1_id(name),
        opponent2:profiles!team2_player2_id(name)
      `)
      .eq('game_id', matchId)
      .single();

    if (error) throw error;

    const isMyTeamWin = data.winner_team === 1;
    return {
      id: data.game_id,
      date: data.game_date.replace(/-/g, '.'),
      type: data.match_type === 'Doubles' ? '복식' : '단식',
      partner: data.partner?.name || null,
      opponents: [data.opponent1?.name, data.opponent2?.name].filter(Boolean),    
      setScores: data.game_sets
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({  
          team1: s.team1_score,
          team2: s.team2_score,
          t1Tie: s.team1_tiebreak_score,
          t2Tie: s.team2_tiebreak_score,
        })),
      isWinner: isMyTeamWin,
    };
  } catch (error) {
    console.error('상세 기록 로드 중 오류 발생:', error.message);
    return null;
  }
};

export const signUpUser = async (email, password, name, phone, avatarFile = null) => {
  try {
    // 0. 중복 계정 확인 (이메일 또는 휴대폰 번호)
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('email, phone')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingUser) {
      const isEmailDup = existingUser.email === email;
      return { success: false, error: 'ALREADY_EXISTS', message: `이미 등록된 ${isEmailDup ? '이메일' : '휴대폰 번호'}입니다.` };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password, // 인증용 비밀번호 (Supabase가 알아서 안전하게 해싱하여 auth.users에 저장)
      options: {
        data: { 
          // DB 트리거의 new.raw_user_meta_data 로 전달될 데이터
          name: name,
          phone: phone
        } 
      }
    });

    if (error) throw error;

    if (data?.user) {
      // 사진이 있든 없든 프로필 테이블에 기본 정보 저장
      if (avatarFile) {
        const uploadResult = await uploadProfileImage(data.user.id, avatarFile, name, phone, email);
        if (!uploadResult.success) {
          return { success: true, data, upload: { success: false, error: uploadResult.error } };
        }
        return { success: true, data, upload: { success: true, url: uploadResult.url } };
      } else {
        // 사진이 없는 경우 텍스트 정보만 바로 저장
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: data.user.id, name, phone, email });
        if (profileError) throw profileError;
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error('회원가입 실패:', error.message);
    return { success: false, error: error.message };
  }
};

export const signInUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

// 🚨 [보완 1] Supabase가 반환한 인증 에러를 가장 먼저 체크합니다.
    if (error) {
      return { success: false, error: error.message }; 
      // 등록되지 않은 ID나 틀린 비밀번호면 여기서 걸러져 "Invalid login credentials" 등이 반환됩니다.
    }
    // 🚨 [보완 2] 데이터나 유저 객체가 실제로 존재하는지 한 번 더 안전하게 검사합니다.
    if (!data || !data.user) {
      return { success: false, error: '유저 정보를 찾을 수 없습니다.' };
    }
    // 모든 검증을 통과해야만 성공 반환
    return { success: true, data };

  } catch (error) {
    // 네트워크 오류 등 예기치 못한 시스템 예외 처리
    console.error('로그인 시스템 에러:', error.message);
    return { success: false, error: '로그인 중 오류가 발생했습니다. ID와 비밀번호를 다시 확인해주세요.' };
  }
};

// 1. 비밀번호 초기화 이메일 발송
export const resetPasswordForEmail = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // 이메일 링크 클릭 시 돌아올 앱 주소 (로컬 또는 Vercel 주소)
      redirectTo: `${window.location.origin}/update-password`, 
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('이메일 발송 실패:', error.message);
    return { success: false, error: error.message };
  }
};

// 2. 새 비밀번호로 업데이트 (이메일 링크를 타고 들어온 후 실행됨)
export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('비밀번호 변경 실패:', error.message);
    return { success: false, error: error.message };
  }
};

// 프로필 사진 업로드 및 DB 업데이트 함수 추가
export const uploadProfileImage = async (userId, file, name = null, phone = null, email = null) => {
  try {
    console.log('📸 [Step 1] 파일 업로드 시작', { userId, fileName: file.name, fileSize: file.size });
    
    // 1. 파일 이름 난수화 (중복 방지)
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    console.log('📝 [Step 1] 생성된 파일 경로:', filePath);

    // 2. Storage 'avatars' 버킷에 파일 업로드
    console.log('⬆️ [Step 2] Supabase Storage에 업로드 중...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      console.error('❌ [Step 2] 업로드 실패:', uploadError);
      throw uploadError;
    }
    console.log('✅ [Step 2] 업로드 성공:', uploadData);

    // 3. 업로드된 파일의 공개 URL 가져오기
    console.log('🔗 [Step 3] 공개 URL 생성 중...');
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;
    console.log('✅ [Step 3] 공개 URL:', publicUrl);

    // 4. profiles 테이블에 avatar_url을 삽입 또는 업데이트 (프로필이 없으면 생성)
    console.log('💾 [Step 4] DB에 저장 중...', { id: userId, avatar_url: publicUrl });
    
    // email이 전달되지 않으면 현재 인증된 사용자의 이메일 가져오기
    let userEmail = email;
    if (!userEmail) {
      const { data: currentUserData } = await supabase.auth.getUser();
      userEmail = currentUserData?.user?.email;
    }
    console.log('📧 현재 사용자 이메일:', userEmail);
    
    const profileData = { 
      id: userId, 
      avatar_url: publicUrl 
    };
    
    // 제공된 정보가 있으면 프로필에 포함
    if (userEmail) profileData.email = userEmail;
    if (name) profileData.name = name;
    if (phone) profileData.phone = phone;
    
    const { data: upsertData, error: updateError } = await supabase
      .from('profiles')
      .upsert(profileData);
    

    if (updateError) {
      console.error('❌ [Step 4] DB 저장 실패:', updateError);
      throw updateError;
    }
    console.log('✅ [Step 4] DB 저장 성공:', upsertData);

    console.log('🎉 [완료] 프로필 사진 업로드 완료!');
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('❌ [전체] 사진 업로드 에러:', error);
    console.error('📋 에러 상세:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
};
// 기존 코드 유지...

// 1. 비밀번호 확인용 (현재 로그인된 이메일과 입력한 비밀번호로 재로그인 시도)
export const verifyPassword = async (email, password) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: '비밀번호가 일치하지 않습니다.' };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 2. 프로필 통합 업데이트 (Auth 이메일 + Profiles 테이블)
export const updateUserProfile = async (userId, newEmail, name, phone, avatarUrl) => {
  try {
    // A. 이메일이 변경되었다면 Auth 정보 업데이트
    // (주의: Supabase 기본 설정상 새 이메일로 인증 링크가 발송될 수 있습니다.)
    if (newEmail) {
      const { error: authError } = await supabase.auth.updateUser({ email: newEmail });
      if (authError) throw authError;
    }

    // B. profiles 테이블 업데이트
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name, phone, avatar_url: avatarUrl })
      .eq('id', userId);

    if (profileError) throw profileError;

    return { success: true };
  } catch (error) {
    console.error('프로필 업데이트 실패:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * 이름으로 프로필 검색
 */
export const searchProfilesByName = async (nameQuery) => {
  if (!nameQuery || nameQuery.trim().length < 1) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .ilike('name', `%${nameQuery}%`)
      .limit(5);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('프로필 검색 중 오류 발생:', error.message);
    return [];
  }
};

/**
 * 4. 대시보드용 통계 데이터 계산
 * RPC 함수 없이 클라이언트 사이드에서 직접 집계합니다.
 */
export const fetchDashboardStats = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // [A] 내 통계용: 내가 참여한 모든 경기
    const { data: games, error } = await supabase
      .from('games')
      .select('game_date, winner_team')
      .or(`team1_player1_id.eq.${user.id},team1_player2_id.eq.${user.id},team2_player1_id.eq.${user.id},team2_player2_id.eq.${user.id}`)
      .order('game_date', { ascending: false });

    if (error) throw error;

    const recentGames = games.slice(0, 10);
    const recentWins = recentGames.filter(g => g.winner_team === 1).length;
    const recentTotal = recentGames.length;
    const winRate = recentTotal > 0 ? Math.round((recentWins / recentTotal) * 100) : 0;

    const statsMap = {};
    games.forEach(g => {
      const month = g.game_date.slice(0, 7); // "2024-05"
      statsMap[month] = (statsMap[month] || 0) + 1;
    });

    const monthlyTrends = Object.entries(statsMap)
      .map(([month, count]) => ({
        match_month: month.replace('-', '.'), // "2024.05"
        match_count: count
      }))
      .sort((a, b) => b.match_month.localeCompare(a.match_month))
      .slice(0, 5); // 최근 5개월만 표시

    // [B] 이달의 포인트 리더 계산 (클럽 전체 대상)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('sv-SE');

    const { data: allMonthGames, error: allMonthError } = await supabase
      .from('games')
      .select(`
        winner_team,
        t1p1:profiles!team1_player1_id(id, name, avatar_url),
        t1p2:profiles!team1_player2_id(id, name, avatar_url),
        t2p1:profiles!team2_player1_id(id, name, avatar_url),
        t2p2:profiles!team2_player2_id(id, name, avatar_url)
      `)
      .gte('game_date', firstDay);

    if (allMonthError) throw allMonthError;

    const winCounts = {};
    allMonthGames?.forEach(game => {
      const winners = game.winner_team === 1
        ? [game.t1p1, game.t1p2]
        : [game.t2p1, game.t2p2];
      
      winners.filter(Boolean).forEach(p => {
        if (!winCounts[p.id]) {
          winCounts[p.id] = { name: p.name, avatar_url: p.avatar_url, wins: 0 };
        }
        winCounts[p.id].wins += 1;
      });
    });

    const pointLeaders = Object.entries(winCounts)
      .map(([id, data]) => ({ 
        name: data.name, 
        wins: data.wins, 
        avatar_url: data.avatar_url 
      }))
      .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))
      .slice(0, 3);

    // [C] 영혼의 단짝 계산 (나와 함께한 복식 파트너)
    const { data: myDoubles, error: doublesError } = await supabase
      .from('games')
      .select(`
        winner_team,
        team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id,
        t1p1:profiles!team1_player1_id(id, name, avatar_url),
        t1p2:profiles!team1_player2_id(id, name, avatar_url),
        t2p1:profiles!team2_player1_id(id, name, avatar_url),
        t2p2:profiles!team2_player2_id(id, name, avatar_url)
      `)
      .eq('match_type', 'Doubles')
      .or(`team1_player1_id.eq.${user.id},team1_player2_id.eq.${user.id},team2_player1_id.eq.${user.id},team2_player2_id.eq.${user.id}`);

    if (doublesError) throw doublesError;

    const partnerMap = {};
    myDoubles?.forEach(game => {
      let partnerData = null;
      let isWin = false;

      if (game.team1_player1_id === user.id) { partnerData = game.t1p2; isWin = game.winner_team === 1; }
      else if (game.team1_player2_id === user.id) { partnerData = game.t1p1; isWin = game.winner_team === 1; }
      else if (game.team2_player1_id === user.id) { partnerData = game.t2p2; isWin = game.winner_team === 2; }
      else if (game.team2_player2_id === user.id) { partnerData = game.t2p1; isWin = game.winner_team === 2; }

      if (partnerData) {
        if (!partnerMap[partnerData.id]) {
          partnerMap[partnerData.id] = { name: partnerData.name, avatar_url: partnerData.avatar_url, wins: 0, losses: 0, total: 0 };
        }
        partnerMap[partnerData.id].total += 1;
        if (isWin) partnerMap[partnerData.id].wins += 1;
        else partnerMap[partnerData.id].losses += 1;
      }
    });

    const soulmates = Object.values(partnerMap)
      .sort((a, b) => b.total - a.total || b.wins - a.wins)
      .slice(0, 3);

    return {
      recent_win_rate: winRate,
      recent_wins: recentWins,
      recent_total: recentTotal,
      monthly_trends: monthlyTrends.reverse(), // 연대순 표시를 위해 반전
      point_leaders: pointLeaders,
      soulmates: soulmates,
      avg_points_per_set: 0 // 필요 시 추가 구현 가능
    };
  } catch (error) {
    console.error('대시보드 통계 계산 실패:', error.message);
    return null;
  }
};

/**
 * 5. 월별 전체 순위 데이터 가져오기
 */
export const fetchMonthlyRankings = async (year, month) => {
  try {
    // 해당 월의 시작일과 종료일 계산
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const { data: games, error } = await supabase
      .from('games')
      .select(`
        winner_team,
        t1p1:profiles!team1_player1_id(id, name, avatar_url),
        t1p2:profiles!team1_player2_id(id, name, avatar_url),
        t2p1:profiles!team2_player1_id(id, name, avatar_url),
        t2p2:profiles!team2_player2_id(id, name, avatar_url)
      `)
      .gte('game_date', startDate)
      .lte('game_date', endDate);

    if (error) throw error;

    const playerMap = {}; // { id: { name, avatar_url, wins, losses, total } }

    games?.forEach(game => {
      const team1 = [game.t1p1, game.t1p2].filter(Boolean);
      const team2 = [game.t2p1, game.t2p2].filter(Boolean);
      
      const processPlayer = (player, isWin) => {
        if (!playerMap[player.id]) {
          playerMap[player.id] = { name: player.name, avatar_url: player.avatar_url, wins: 0, losses: 0, total: 0 };
        }
        playerMap[player.id].total += 1;
        if (isWin) playerMap[player.id].wins += 1;
        else playerMap[player.id].losses += 1;
      };

      const winnerTeamNum = game.winner_team;
      team1.forEach(p => processPlayer(p, winnerTeamNum === 1));
      team2.forEach(p => processPlayer(p, winnerTeamNum === 2));
    });

    return Object.values(playerMap).sort((a, b) => {
      // 1순위: 승수, 2순위: 적은 패수, 3순위: 이름순
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('순위 데이터 로드 실패:', error.message);
    return [];
  }
};

/**
 * 6. 전체 파트너 순위 데이터 가져오기
 */
export const fetchPartnerRankings = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: games, error } = await supabase
      .from('games')
      .select(`
        winner_team,
        team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id,
        t1p1:profiles!team1_player1_id(id, name, avatar_url),
        t1p2:profiles!team1_player2_id(id, name, avatar_url),
        t2p1:profiles!team2_player1_id(id, name, avatar_url),
        t2p2:profiles!team2_player2_id(id, name, avatar_url)
      `)
      .eq('match_type', 'Doubles')
      .or(`team1_player1_id.eq.${user.id},team1_player2_id.eq.${user.id},team2_player1_id.eq.${user.id},team2_player2_id.eq.${user.id}`);

    if (error) throw error;

    const partnerMap = {};
    games?.forEach(game => {
      let p = null;
      let isWin = false;

      if (game.team1_player1_id === user.id) { p = game.t1p2; isWin = game.winner_team === 1; }
      else if (game.team1_player2_id === user.id) { p = game.t1p1; isWin = game.winner_team === 1; }
      else if (game.team2_player1_id === user.id) { p = game.t2p2; isWin = game.winner_team === 2; }
      else if (game.team2_player2_id === user.id) { p = game.t2p1; isWin = game.winner_team === 2; }

      if (p) {
        if (!partnerMap[p.id]) {
          partnerMap[p.id] = { id: p.id, name: p.name, avatar_url: p.avatar_url, wins: 0, losses: 0, total: 0 };
        }
        partnerMap[p.id].total += 1;
        if (isWin) partnerMap[p.id].wins += 1;
        else partnerMap[p.id].losses += 1;
      }
    });

    return Object.values(partnerMap).sort((a, b) => b.total - a.total || b.wins - a.wins);
  } catch (error) {
    console.error('파트너 데이터 로드 실패:', error.message);
    return [];
  }
};