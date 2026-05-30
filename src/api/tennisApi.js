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
          match_date: matchPayload.game_date,
          match_type: matchPayload.match_type,
          team1_p1_id: currentUserId, // 현재 로그인한 내 유저 ID
          team1_p2_id: matchPayload.partner_id || null,
          team2_p1_id: matchPayload.opponent1_id,
          team2_p2_id: matchPayload.opponent2_id || null,
          winner_team: matchPayload.winner_team, // 폼에서 계산해서 넘겨준 승리팀 번호 (1 또는 2)
        }
      ])
      .select()
      .single(); // 생성된 단일 로우 데이터 가져오기

    if (matchError) throw matchError;

    const generatedMatchId = matchData.id;

    // [Step B] 세트 스코어 배열 조립 후 일괄(Bulk) 인서트
    const setsPayload = matchPayload.sets.map((set) => ({
      match_id: generatedMatchId,
      set_number: set.set_number,
      team1_score: set.team1_score,
      team2_score: set.team2_score,
      team1_tiebreak: set.team1_tiebreak,
      team2_tiebreak: set.team2_tiebreak,
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
export const fetchMatchHistory = async (page = 1, pageSize = 5) => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Supabase(PostgREST)의 강력한 장점: 쿼리 한 줄로 하위 테이블 및 외래키 참조 테이블 조인이 가능합니다.
    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        match_date,
        match_type,
        winner_team,
        game_sets (
          set_number,
          team1_score,
          team2_score,
          team1_tiebreak,
          team2_tiebreak
        ),
        partner:profiles!team1_p2_id_fkey(name),
        opponent1:profiles!team2_p1_id_fkey(name),
        opponent2:profiles!team2_p2_id_fkey(name)
      `)
      .order('match_date', { ascending: false }) // 최신순 정렬
      .range(from, to); // 오프셋 페이징 처리

    if (error) throw error;

    // 프론트엔드 UI 컴포넌트 형태에 맞게 데이터 가공(매핑)
    return data.map((match) => {
      const isMyTeamWin = match.winner_team === 1;
      return {
        id: match.id,
        date: match.match_date.replace(/-/g, '.'),
        type: match.match_type === 'Doubles' ? '복식' : '단식',
        partner: match.partner?.name || null,
        opponents: [match.opponent1?.name, match.opponent2?.name].filter(Boolean),
        setScores: match.game_sets
          .sort((a, b) => a.set_number - b.set_number)
          .map((s) => ({
            team1: s.team1_score,
            team2: s.team2_score,
            t1Tie: s.team1_tiebreak,
            t2Tie: s.team2_tiebreak,
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
        id,
        match_date,
        match_type,
        winner_team,
        game_sets (
          set_number,
          team1_score,
          team2_score,
          team1_tiebreak,
          team2_tiebreak    ),
        partner:profiles!team1_p2_id_fkey(name),  
        opponent1:profiles!team2_p1_id_fkey(name),
        opponent2:profiles!team2_p2_id_fkey(name)
      `)
      .eq('id', matchId)
      .single();

    if (error) throw error;

    const isMyTeamWin = data.winner_team === 1;
    return {
      id: data.id,
      date: data.match_date.replace(/-/g, '.'),
      type: data.match_type === 'Doubles' ? '복식' : '단식',
      partner: data.partner?.name || null,
      opponents: [data.opponent1?.name, data.opponent2?.name].filter(Boolean),    
      setScores: data.game_sets
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({  
          team1: s.team1_score,
          team2: s.team2_score,
          t1Tie: s.team1_tiebreak,
          t2Tie: s.team2_tiebreak,
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
    // If an avatar file was provided, upload it and upsert the profile
    if (avatarFile && data?.user) {
      const uploadResult = await uploadProfileImage(data.user.id, avatarFile, name, phone, email);
      if (!uploadResult.success) {
        // Signup succeeded but avatar upload failed - return info so caller can notify user
        return { success: true, data, upload: { success: false, error: uploadResult.error } };
      }
      return { success: true, data, upload: { success: true, url: uploadResult.url } };
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