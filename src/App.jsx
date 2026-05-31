import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// 앞서 만든 컴포넌트들을 불러옵니다
import LoginPage from './components/LoginPage';
import MainDashboard from './components/MainDashboard';
import MatchHistoryPage from './components/MatchHistoryPage';
import MatchRegistrationForm from './components/MatchRegistrationForm';
import ProfilePage from './components/ProfilePage';
import RankingsPage from './components/RankingsPage';
import PartnerRankingsPage from './components/PartnerRankingsPage';
import { useAuthStore } from './store/authStore';
import { supabase } from './supabaseClient';
import UpdatePasswordPage from './components/UpdatePasswordPage';
import SignupPage from './components/SignupPage';
import SkeletonLoader from './components/SkeletonLoader';
import { signInUser, resetPasswordForEmail } from './api/tennisApi';
import { Loader2 } from 'lucide-react';

// 로그인 상태를 확인하여 접근을 제어하는 래퍼 컴포넌트
const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// 라우팅 이동을 관리하는 메인 컨테이너 컴포넌트
function AppContent() {
  const navigate = useNavigate();
  const { isAuthenticated, setUser, logout } = useAuthStore();

  // 🚨 추가: 전역 인증 상태 관리 및 비밀번호 재설정 이벤트 처리
  useEffect(() => {
    // 1. 앱 로드시 기존 세션 확인 (인증 상태 동기화)
    const syncAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };
    syncAuth();

    // 2. 비밀번호 재설정 링크 클릭 시 발생하는 PASSWORD_RECOVERY 이벤트 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('🔑 비밀번호 복구 이벤트 감지: 재설정 페이지로 이동합니다.');
        navigate('/update-password');
      } else if (event === 'SIGNED_OUT') {
        logout();
      }
    });

    return () => subscription?.unsubscribe();
  }, [setUser, logout, navigate]);


  // 로그인 성공 시 처리
  const handleLogin = (user) => {
    setUser(user);
    navigate('/dashboard');
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <Routes>
      {/* 1. 로그인 페이지 (Public) */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        } 
      />

      {/* 2. 메인 대시보드 (Protected) */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MainDashboard 
              onLogout={handleLogout}
              onNavigateToHistory={() => navigate('/history')}
              onNavigateToRegister={() => navigate('/register')}
              onNavigateToDashboard={() => navigate('/dashboard')}
              onNavigateToProfile={() => navigate('/profile')}
              onNavigateToRankings={() => navigate('/rankings')}
              onNavigateToPartnerRankings={() => navigate('/partner-rankings')}
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
      
      {/* 5. 프로필 페이지 (Protected) */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ProfilePage />
          </ProtectedRoute>
        } 
      />

      {/* 5. 전체 순위 페이지 (Protected) */}
      <Route 
        path="/rankings" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <RankingsPage onBack={() => navigate('/dashboard')} />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/partner-rankings" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <PartnerRankingsPage onBack={() => navigate('/dashboard')} />
          </ProtectedRoute>
        } 
      />

      {/* 6. 비밀번호 변경 페이지 (재설정 플로우를 위해 공개) */}
      <Route 
        path="/update-password" 
        element={<UpdatePasswordPage />} 
      />
      
      {/* 404 잘못된 경로 처리 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
