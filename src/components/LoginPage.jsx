import React, { useState } from 'react';
import { Mail, Lock, Trophy, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import SignupPage from './SignupPage';

export default function LoginPage() {
  const setUser = useAuthStore((state) => state.setUser);

  const handleLogin = async () => {
    // Supabase 로그인 성공 가정...
    const mockUserData = { id: 'uuid-123', name: '테니스왕' };
    
    // 전역 상태에 즉시 반영
    setUser(mockUserData); 
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 실제 Supabase Auth 연동 시 이곳에서 supabase.auth.signInWithPassword 호출
    setTimeout(() => {
      setIsLoading(false);
      handleLogin(); // 성공 시 로그인 상태 변경
    }, 1500);
  };
  if (isSignup) {
    return <SignupPage onBack={() => setIsSignup(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#002B5C] flex flex-col items-center justify-center p-4">
      {/* 로고 영역 */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-[#FFC510] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Trophy className="w-10 h-10 text-[#002B5C]" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">TENNIS CLUB</h1>
        <p className="text-blue-200 text-sm mt-1">로그인하여 경기 기록을 관리하세요</p>
      </div>

      {/* 로그인 폼 */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#002B5C] transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#002B5C] transition"
                required
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full mt-6 bg-[#002B5C] text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> 확인 중...</>
          ) : '로그인'}
        </button>
      </form>

      {/* 하단 링크 */}
      <div className="mt-8 text-center text-blue-200 text-xs">
      {/* ... 폼 ... */}
        <p>계정이 없으신가요? 
          <span onClick={() => setIsSignup(true)} className="text-[#FFC510] font-bold cursor-pointer underline ml-1">
            회원가입
          </span>
        </p>
      </div>
    </div>
  );
}