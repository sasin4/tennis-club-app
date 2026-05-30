import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../api/tennisApi';
import { Lock, Loader2 } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await updatePassword(newPassword);
    
    if (result.success) {
      alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
      navigate('/'); // 로그인 페이지로 강제 이동
    } else {
      alert(`변경 실패: ${result.error}`);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#002B5C] flex flex-col justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-auto">
        <h2 className="text-2xl font-black text-[#002B5C] mb-2">새 비밀번호 설정</h2>
        <p className="text-sm text-gray-500 mb-6">새롭게 사용할 비밀번호를 입력해주세요.</p>
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-300" />
            <input 
              type="password" 
              placeholder="새 비밀번호 (6자리 이상)" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#002B5C]" 
              required 
              minLength={6}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#FFC510] text-[#002B5C] py-3 rounded-xl font-black hover:bg-yellow-400 transition flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '비밀번호 변경하기'}
          </button>
        </form>
      </div>
    </div>
  );
}