import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Trophy, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { signInUser } from '../api/tennisApi';
import SignupPage from './SignupPage';

export default function LoginPage() {
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // 보완된 로그인 API 호출
    const result = await signInUser(email, password);
    if (result.success) {
      // 💡 로그인 성공 시에만 다음 단계(대시보드 이동, 세션 저장 등) 진행
      setUser(result.data.user); // 로그인한 유저 정보 저장
      navigate('/dashboard'); //또는 화면 전환 로직
    } else {
      // 🚨 [보완 3] 실패 시 절대로 화면을 넘기지 않고 에러를 사용자에게 알림
      // result.error에는 "Invalid login credentials" (잘못된 인증 정보) 등의 메시지가 담겨 있습니다.
      alert(`Beep! Beep!: ${result.error}`);
    }
    setIsLoading(false);
  };

  /* handle login으로 정상작동 시 삭제 대상
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 실제 Supabase Auth 연동 시 이곳에서 supabase.auth.signInWithPassword 호출
    setTimeout(() => {
      setIsLoading(false);
      handleLogin(); // 성공 시 로그인 상태 변경
    }, 1500);
  };

  */

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
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl">
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
            {/* 비밀번호 재설정 바로가기 추가 */}
            <div className="flex justify-end mt-2">
              <button 
                type="button"
                onClick={() => navigate('/update-password')}
                className="text-xs text-gray-400 hover:text-[#002B5C] transition underline"
              >
                비밀번호를 잊으셨나요?
              </button>
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