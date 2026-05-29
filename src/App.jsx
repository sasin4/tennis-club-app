import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// 앞서 만든 컴포넌트들을 불러옵니다
import LoginPage from './components/LoginPage';
import MainDashboard from './components/MainDashboard';
import MatchHistoryPage from './components/MatchHistoryPage';
import MatchRegistrationForm from './components/MatchRegistrationForm';
import { useAuthStore } from './store/authStore';
import { supabase } from './supabaseClient';

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
  const { isAuthenticated, login, logout } = useAuthStore();

  // 로그인 성공 시 처리
  const handleLogin = () => {
    login();
    navigate('/dashboard');
  };

  // 로그아웃 처리
  const handleLogout = () => {
    logout();
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

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

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