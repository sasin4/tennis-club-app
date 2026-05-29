import { supabase } from '../supabaseClient';

/**
 * 1. 새 경기 기록 저장 (트랜잭션 형태)
 * matches 테이블에 먼저 넣고, 생성된 match_id로 세트 스코어들을 한번에 저장합니다.
 */
export const insertMatchResult = async (matchPayload) => {
  try {
    // [Step A] 경기 기본 정보 인서트
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
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
      .from('match_sets')
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
      .from('matches')
      .select(`
        id,
        match_date,
        match_type,
        winner_team,
        match_sets (
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
        setScores: match.match_sets
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
      .from('matches')
      .select(`
        id,
        match_date,
        match_type,
        winner_team,
        match_sets (
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
      setScores: data.match_sets
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

export const signUpUser = async (email, password, fullName) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName } // 트리거에서 이 값을 받아 profiles.name에 저장합니다.
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

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('로그인 실패:', error.message);
    return { success: false, error: error.message };
  }
};