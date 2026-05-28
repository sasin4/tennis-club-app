import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,           // 현재 로그인한 유저 객체 (id, name 등)
  isAuthenticated: false, // 로그인 상태
  
  // 로그인 성공 시 호출: 유저 정보 저장
  setUser: (userData) => set({ user: userData, isAuthenticated: true }),
  
  // 로그아웃 시 호출: 상태 초기화
  logout: () => set({ user: null, isAuthenticated: false }),
  
  // 프로필 정보 업데이트 (예: 이름 변경 시)
  updateProfile: (newProfile) => set((state) => ({ 
    user: { ...state.user, ...newProfile } 
  })),
}));