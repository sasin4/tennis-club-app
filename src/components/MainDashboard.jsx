import React, { useEffect, useState } from 'react';
// ... 기존 import 생략
import SkeletonLoader from './SkeletonLoader';

const getDashboardStats = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats', { p_user_id: userId });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase Auth 상태 감지
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    }); 
    // 초기 로그인 상태 체크
    const session = supabase.auth.getSession();
    setIsAuthenticated(!!session);

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Routes>
      {/* 1. 로그인 페이지 */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute isAuthenticated={!isAuthenticated}> {/* 로그인 안된 상태에서만 접근 가능 */}
            <LoginPage onNavigateToRegister={() => navigate('/register')} />
          </ProtectedRoute>
        } 
      />

      {/* 2. 메인 대시보드 (Protected) */}
      <Route 
        path="/dashboard" 
        element={         <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MainDashboard 
              onLogout={() => supabase.auth.signOut()}
              onNavigateToHistory={() => navigate('/history')}
              onNavigateToRegister={() => navigate('/register')}
            />
          </ProtectedRoute>
        } 
      />

      {/* 3. 전체 경기 기록 리스트 (Protected) */}
      <Route 
        path="/history" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MatchHistoryPage onBack={() => navigate('/dashboard')} />
          </ProtectedRoute>
        } 
      />

      {/* 4. 새 경기 등록 폼 (Protected) */}
      <Route 
        path="/register" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MatchRegistrationForm 
              onBack={() => navigate(-1)} // 이전 페이지로 돌아가기
              onSubmitSuccess={() => navigate('/dashboard')} // 등록 성공 시 대시보드로 이동
            />
          </ProtectedRoute>
        } 
      />
      
      {/* 404 잘못된 경로 처리 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



export default function MainDashboard({ onLogout, onNavigateToHistory, onNavigateToRegister }) {
  const [stats, setStats] = useState(null); // 초기값 null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    getDashboardStats(userId).then(data => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  // [로딩 중일 때]
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 shadow-sm"><div className="h-6 w-32 bg-gray-200 rounded"></div></header>
        <SkeletonLoader />
      </div>
    );
  }

  // [데이터 로딩 완료 후]
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
     {/* 헤더 */}
      <header className="bg-white px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="font-black text-xl text-[#002B5C]">MY DASHBOARD</h1>
        <button onClick={onLogout} className="text-xs text-gray-400 font-bold hover:text-red-500">로그아웃</button>
      </header>

      <main className="p-4 space-y-4">
        {/* 승률 통계 카드 */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-[#002B5C] p-4 rounded-2xl text-white shadow-lg">
            <Trophy className="w-6 h-6 text-[#FFC510] mb-2" />
            <div className="text-3xl font-black">{stats.recent_win_rate}%</div>
            <div className="text-[10px] text-blue-200 mt-1">최근 10경기 승률</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <Activity className="w-6 h-6 text-gray-400" />
            <div>
              <div className="text-2xl font-black text-[#002B5C]">{stats.recent_wins}승 {stats.recent_total - stats.recent_wins}패</div>
              <div className="text-[10px] text-gray-400">최근 10경기 전적</div>
            </div>
          </div>
        </section>

        {/* 활동 추이 섹션 */}
        <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-[#002B5C] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#FFC510]" /> 월별 활동 추이
          </h2>
          <div className="space-y-3">
            {stats.monthly_trends.map((m) => (
              <div key={m.match_month} className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">{m.match_month}</span>
                <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FFC510]" style={{ width: `${(m.match_count / 10) * 100}%` }}></div>
                </div>
                <span className="text-xs font-black text-[#002B5C]">{m.match_count} 경기</span>
              </div>
            ))}
          </div>
        </section>

        {/* 전체 기록 이동 버튼 */}
        <button 
          onClick={onNavigateToHistory}
          className="w-full bg-white py-4 px-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center hover:bg-gray-50 transition"
        >
          <span className="text-sm font-bold text-[#002B5C]">전체 기록 확인하기</span>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </button>
      </main>

      {/* 플로팅 액션 버튼 (FAB) */}
      <button 
        onClick={onNavigateToRegister}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#FFC510] text-[#002B5C] rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform z-50"
      >
        <Plus className="w-8 h-8 font-black" />
      </button>
    </div>
  );
}