import { supabase } from '../supabaseClient';

/**
 * 1. 새 경기 기록 저장 (트랜잭션 형태)
 * matches 테이블에 먼저 넣고, 생성된 match_id로 세트 스코어들을 한번에 저장합니다.
 */
export const insertMatchResult = async (matchPayload) => {
  try {
    // [Step A] 경기 기본 정보 인서트
    const { data: matchData, error: matchError } = await supabase
      .from('games')
      .insert([
        {
          match_date: matchPayload.game_date,
          match_type: matchPayload.match_type,
          team1_p1_id: supabase.auth.user()?.id, // 현재 로그인한 내 유저 ID
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

export const signUpUser = async (email, password, name, phone) => {
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