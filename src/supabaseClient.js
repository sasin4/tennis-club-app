import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인해 주세요.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const fetchDashboardStats = async () => {
  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('대시보드 통계 가져오기 실패:', error);
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

export const fetchMatchDetails = async (matchId) => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        match_date,
        match_type,
        winner_team,
        partner:profiles!partner_id(name),
        opponent1:profiles!opponent1_id(name),
        opponent2:profiles!opponent2_id(name),
        game_sets (
          set_number,
          team1_score,
          team2_score,
          team1_tiebreak,
          team2_tiebreak
        )
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
    console.error('경기 상세 정보 가져오기 실패:', error.message);
    return null;
  }
};

export const fetchMatchHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        match_date,
        match_type,
        winner_team,
        partner:profiles!partner_id(name),
        opponent1:profiles!opponent1_id(name),
        opponent2:profiles!opponent2_id(name),
        game_sets (
          set_number,
          team1_score,
          team2_score,
          team1_tiebreak,
          team2_tiebreak
        )
      `)
      .or(`team1_id.eq.${userId},team2_id.eq.${userId}`)
      .order('match_date', { ascending: false });

    if (error) throw error;

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

export const fetchPaginatedMatchHistory = async (userId, page, pageSize) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

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
          team2_tiebreak
        ),
        partner:profiles!partner_id(name),
        opponent1:profiles!opponent1_id(name),
        opponent2:profiles!opponent2_id(name)
      `)
      .or(`team1_id.eq.${userId},team2_id.eq.${userId}`)
      .order('match_date', { ascending: false })
      .range(from, to);

    if (error) throw error;

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

export const fetchMatchDetailsWithPagination = async (matchId) => {
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
          team2_tiebreak
        ),
        partner:profiles!partner_id(name),
        opponent1:profiles!opponent1_id(name),
        opponent2:profiles!opponent2_id(name)
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
    console.error('경기 상세 정보 가져오기 실패:', error.message);
    return null;
  }
};

export const fetchAllMatchHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        match_date,
        match_type,
        winner_team,
        partner:profiles!partner_id(name),
        opponent1:profiles!opponent1_id(name),
        opponent2:profiles!opponent2_id(name),
        game_sets (
          set_number,
          team1_score,
          team2_score,
          team1_tiebreak,
          team2_tiebreak
        )
      `)
      .or(`team1_id.eq.${userId},team2_id.eq.${userId}`)
      .order('match_date', { ascending: false });

    if (error) throw error;

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

export const fetchMatchHistoryWithPagination = async (userId, page, pageSize) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

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
           team2_tiebreak
        ),
        partner:profiles!partner_id(name),
        opponent1:profiles!opponent1_id(name),
        opponent2:profiles!opponent2_id(name)
      `)
      .or(`team1_id.eq.${userId},team2_id.eq.${userId}`)
      .order('match_date', { ascending: false })
      .range(from, to);

    if (error) throw error;

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

export const fetchMatchDetailWithPagination = async (matchId) => {
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
           team2_tiebreak
        ),
        partner:profiles!partner_id(name),
        opponent1:profiles!opponent1_id(name),
        opponent2:profiles!opponent2_id(name)
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
    console.error('경기 상세 정보 가져오기 실패:', error.message);
    return null;
  }
};

export const fetchAllMatchHistoryWithPagination = async (userId, page, pageSize) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        match_date,
        match_type,
        winner_team,
        partner:profiles!partner_id(name),
        opponent1:profiles!opponent1_id(name),
        opponent2:profiles!opponent2_id(name),
        game_sets (
          set_number,
          team1_score,
          team2_score,
          team1_tiebreak,
          team2_tiebreak
        )
      `)
      .or(`team1_id.eq.${userId},team2_id.eq.${userId}`)
      .order('match_date', { ascending: false })
      .range(from, to);

    if (error) throw error;

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
