import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { signUpUser } from '../api/tennisApi';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function SignupPage({ onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // 유효성 검사 방어 로직
    if (!phone || phone.length < 10) {
      alert('유효한 휴대폰 번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    const result = await signUpUser(email, password, name, phone);
    
    if (result.success) {
      alert('회원가입 성공! 이메일을 확인하여 인증을 완료해주세요.');
      onBack(); // 로그인 페이지로 복귀
    } else {
      alert(`가입 실패: ${result.error}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#002B5C] p-6 flex flex-col justify-center">
      <button onClick={onBack} className="text-white mb-6 flex items-center gap-1 text-sm font-bold">
        <ArrowLeft className="w-4 h-4" /> 뒤로가기
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-black text-[#002B5C] mb-6">계정 만들기</h2>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
            <input type="text" placeholder="이름 (닉네임)" value={name} onChange={(e) => setName(e.target.value)}
                   className="w-full pl-10 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#002B5C]" required />
          </div>
          {/* 🚨 업그레이드된 휴대폰 번호 입력란 */}
          <div className="relative">
            <PhoneInput
              international
              defaultCountry="KR"
              value={phone}
              onChange={setPhone}
              className="w-full py-3 px-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#002B5C] transition"
            />
            <p className="text-xs text-gray-400 mt-1 pl-1">
              * 국가 코드를 포함한 형식으로 자동 저장됩니다.
            </p>
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
            <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)}
                   className="w-full pl-10 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#002B5C]" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
            <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-10 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#002B5C]" required />
          </div>
          <button type="submit" disabled={isLoading}
                  className="w-full bg-[#FFC510] text-[#002B5C] py-3 rounded-xl font-black hover:bg-yellow-400 transition flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '가입 완료하기'}
          </button>
        </form>
      </div>
    </div>
  );
}