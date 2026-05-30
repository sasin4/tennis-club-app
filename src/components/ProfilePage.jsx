import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { verifyPassword, updateUserProfile, uploadProfileImage } from '../api/tennisApi';
import { User, Mail, Phone, Calendar, Hash, Lock, Camera, Loader2, ArrowLeft } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  
  // 화면 모드: 'view'(조회) | 'password'(비밀번호 확인) | 'edit'(수정)
  const [viewMode, setViewMode] = useState('view');
  const [isLoading, setIsLoading] = useState(true);
  
  // 원본 데이터 및 수정 폼 데이터
  const [profile, setProfile] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', name: '', phone: '' });
  
  // 사진 수정 관련 상태
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // 비밀번호 확인용 상태
  const [password, setPassword] = useState('');

  // 1. 초기 데이터 불러오기
  const fetchProfile = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setProfile(data);
        setEditForm({ email: data.email, name: data.name, phone: data.phone });
        setPreviewUrl(data.avatar_url);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // 2. 비밀번호 확인 로직
  const handlePasswordCheck = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await verifyPassword(profile.email, password);
    setIsLoading(false);

    if (result.success) {
      setPassword(''); // 비밀번호 초기화
      setViewMode('edit'); // 수정 화면으로 전환
    } else {
      alert(result.error);
    }
  };

  // 3. 프로필 저장 로직
  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    let finalAvatarUrl = profile.avatar_url;

    // 새 사진이 등록되었다면 업로드 먼저 진행
    if (avatarFile) {
      const uploadResult = await uploadProfileImage(profile.id, avatarFile);
      if (uploadResult.success) {
        finalAvatarUrl = uploadResult.url;
      } else {
        alert('사진 업로드 중 오류가 발생했습니다.');
        setIsLoading(false);
        return;
      }
    }

    // 이메일이 변경되었는지 체크
    const emailToUpdate = editForm.email !== profile.email ? editForm.email : null;

    // 프로필 업데이트
    const result = await updateUserProfile(
      profile.id, 
      emailToUpdate, 
      editForm.name, 
      editForm.phone, 
      finalAvatarUrl
    );

    setIsLoading(false);

    if (result.success) {
      alert('프로필이 성공적으로 업데이트 되었습니다.');
      await fetchProfile(); // 최신 데이터 다시 불러오기
      setViewMode('view'); // 조회 화면으로 복귀
    } else {
      alert(`업데이트 실패: ${result.error}`);
    }
  };

  // 사진 선택 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  if (isLoading && viewMode === 'view') {
    return <div className="min-h-screen bg-[#002B5C] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#002B5C] p-6 flex flex-col justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-auto relative">
        
        {/* 뒤로가기 버튼 */}
        <button onClick={() => navigate('/dashboard')} className="absolute top-6 left-6 text-gray-400 hover:text-[#002B5C] transition">
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* -------------------- [1] 조회 모드 -------------------- */}
        {viewMode === 'view' && profile && (
          <div className="mt-8">
            <h2 className="text-2xl font-black text-[#002B5C] mb-6 text-center">내 프로필</h2>
            
            <div className="flex justify-center mb-8">
              <div className="w-28 h-28 rounded-full border-4 border-gray-100 overflow-hidden shadow-sm">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="프로필" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center"><User className="w-10 h-10 text-gray-300" /></div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Hash className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">ID</p>
                  <p className="text-sm font-medium text-gray-800 break-all">{profile.id}</p>
                </div>
              </div>
        {/* 🚨 이메일 입력 및 안내문 추가 영역 */}
              {/* <div>
                  <input 
                  type="email" 
                  value={editForm.email} 
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full py-3 px-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#002B5C]" 
                  placeholder="이메일" 
                  required
                  />
                  <p className="text-xs text-red-500 mt-1 pl-1">
                  * 이메일 변경 시 확인 메일이 발송되며, 보안을 위해 자동으로 로그아웃될 수 있습니다.
                  </p>
              </div> 
              */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User className="w-5 h-5 text-gray-400" />
                <div><p className="text-xs text-gray-500">이메일(ID)</p><p className="text-sm font-medium text-gray-800">{profile.email}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User className="w-5 h-5 text-gray-400" />
                <div><p className="text-xs text-gray-500">이름</p><p className="text-sm font-medium text-gray-800">{profile.name}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Phone className="w-5 h-5 text-gray-400" />
                <div><p className="text-xs text-gray-500">휴대폰</p><p className="text-sm font-medium text-gray-800">{profile.phone}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div><p className="text-xs text-gray-500">가입일자</p><p className="text-sm font-medium text-gray-800">{new Date(profile.created_at).toLocaleDateString()}</p></div>
              </div>
            </div>

            <button 
              onClick={() => setViewMode('password')}
              className="mt-8 w-full bg-[#002B5C] text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition"
            >
              수정하기
            </button>
          </div>
        )}

        {/* -------------------- [2] 비밀번호 확인 모드 -------------------- */}
        {viewMode === 'password' && (
          <div className="mt-8 text-center">
            <Lock className="w-12 h-12 text-[#002B5C] mx-auto mb-4" />
            <h2 className="text-xl font-black text-[#002B5C] mb-2">비밀번호 확인</h2>
            <p className="text-sm text-gray-500 mb-6">안전한 정보 수정을 위해 비밀번호를 다시 입력해주세요.</p>
            
            <form onSubmit={handlePasswordCheck} className="space-y-4">
              <input 
                type="password" 
                placeholder="현재 비밀번호" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3 px-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#002B5C]"
                required
              />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setViewMode('view')} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">취소</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-xl font-bold bg-[#FFC510] text-[#002B5C] hover:bg-yellow-400 flex justify-center">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '확인'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* -------------------- [3] 수정 모드 -------------------- */}
        {viewMode === 'edit' && (
          <div className="mt-8">
            <h2 className="text-2xl font-black text-[#002B5C] mb-6 text-center">프로필 수정</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              {/* 사진 수정 UI */}
              <div className="flex justify-center mb-6">
                <label className="relative cursor-pointer group">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden group-hover:border-[#002B5C] transition relative">
                    {previewUrl ? (
                      <img src={previewUrl} alt="미리보기" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-300" />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              {/* 텍스트 입력 폼 */}
              <input 
                type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                className="w-full py-3 px-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#002B5C]" placeholder="이메일" required
              />
              <input 
                type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="w-full py-3 px-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#002B5C]" placeholder="이름" required
              />
              <div className="relative">
                <PhoneInput 
                  international defaultCountry="KR" value={editForm.phone} onChange={(val) => setEditForm({...editForm, phone: val})}
                  className="w-full py-3 px-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#002B5C]"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => { setViewMode('view'); setAvatarFile(null); setPreviewUrl(profile.avatar_url); }} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">취소</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-xl font-bold bg-[#002B5C] text-white hover:bg-blue-900 flex justify-center">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '저장'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}