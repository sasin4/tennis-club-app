import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPasswordForEmail, updatePassword } from '../api/tennisApi';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [mode, setMode] = useState('request'); // 'request' (이메일 입력) | 'update' (새 비번 입력)
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Supabase 인증 상태 변경 감지 (이메일 링크 클릭 시 PASSWORD_RECOVERY 이벤트 발생)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update');
      }
    });

    // 2. URL 해시나 쿼리 파라미터에 recovery 정보가 있는지 직접 확인 (보조 수단)
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery') && hash.includes('access_token=')) {
      setMode('update');
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // 1단계: 비밀번호 재설정 이메일 요청
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await resetPasswordForEmail(email);
    setIsLoading(false);

    if (result.success) {
      setIsEmailSent(true);
    } else {
      alert(`오류 발생: ${result.error}`);
    }
  };

  // 2단계: 새 비밀번호로 업데이트
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    const result = await updatePassword(newPassword);
    setIsLoading(false);
    
    if (result.success) {
      alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
      await supabase.auth.signOut(); // 변경 후 기존 세션 정리
      navigate('/');
    } else {
      alert(`변경 실패: ${result.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#002B5C] flex flex-col justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-auto">
        
        <button onClick={() => navigate('/')} className="mb-6 text-gray-400 hover:text-[#002B5C] transition flex items-center gap-1 text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> 로그인으로 돌아가기
        </button>

        {mode === 'request' ? (
          !isEmailSent ? (
            <>
              <h2 className="text-2xl font-black text-[#002B5C] mb-2">비밀번호 찾기</h2>
              <p className="text-sm text-gray-500 mb-6">가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.</p>
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
                  <input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                         className="w-full pl-10 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#002B5C]" required />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-[#FFC510] text-[#002B5C] py-3 rounded-xl font-black hover:bg-yellow-400 transition flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '재설정 메일 보내기'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-[#002B5C] mb-2">메일 발송 완료</h2>
              <p className="text-sm text-gray-600 mb-8">입력하신 메일함의 링크를 클릭하여 비밀번호 변경을 완료해주세요.</p>
              <button onClick={() => navigate('/')} className="w-full bg-[#002B5C] text-white py-3 rounded-xl font-bold">확인</button>
            </div>
          )
        ) : (
          <>
            <h2 className="text-2xl font-black text-[#002B5C] mb-2">새 비밀번호 설정</h2>
            <p className="text-sm text-gray-500 mb-6">새롭게 사용할 비밀번호를 입력해주세요.</p>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
                <input type="password" placeholder="새 비밀번호 (6자리 이상)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                       className="w-full pl-10 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#002B5C]" required minLength={6} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
                <input type="password" placeholder="비밀번호 확인" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                       className="w-full pl-10 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#002B5C]" required minLength={6} />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-[#FFC510] text-[#002B5C] py-3 rounded-xl font-black hover:bg-yellow-400 transition flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '비밀번호 변경하기'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}