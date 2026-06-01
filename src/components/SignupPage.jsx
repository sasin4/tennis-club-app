import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, ArrowLeft, Camera } from 'lucide-react';
import { signUpUser, uploadProfileImage } from '../api/tennisApi';
import { validateEmail } from '../utils/validation';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function SignupPage({ onBack }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 새롭게 추가된 사진 상태
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);


  // 사진 선택 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // 화면에 미리보기 띄우기
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      alert('유효한 휴대폰 번호를 입력해주세요.'); return;
    }

    if (!validateEmail(email)) {
      alert('올바른 이메일 주소 형식이 아닙니다.');
      return;
    }
    
    setIsLoading(true);
    
    // 1단계: 계정 생성 (텍스트 메타데이터만 전송)
    const result = await signUpUser(email, password, name, phone, avatarFile);
    
    if (result.success) {
      // signUpUser now handles avatar upload when provided and returns upload info in `result.upload`
      if (result.upload && result.upload.success === false) {
        alert('회원가입은 완료되었으나, 사진 업로드에 실패했습니다. (마이페이지에서 다시 시도해주세요)');
      }
      alert('회원가입 성공! 이메일을 확인하여 인증을 완료해주세요.');
      onBack();
    } else if (result.error === 'ALREADY_EXISTS') {
      if (window.confirm(`${result.message}\n이미 가입된 계정이 있습니다. 비밀번호 찾기 페이지로 이동하시겠습니까?`)) {
        navigate('/update-password');
      }
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
          {/* 사진 업로드 영역 */}
          <div className="flex justify-center mb-6">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden group-hover:border-[#002B5C] transition">
                {previewUrl ? (
                  <img src={previewUrl} alt="미리보기" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">사진 추가</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>

          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
            <input type="text" placeholder="이름 (성명)" value={name} onChange={(e) => setName(e.target.value)}
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