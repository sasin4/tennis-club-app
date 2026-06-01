import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Home, User, LogOut, Activity, Trophy, TrendingUp, ChevronRight, Plus, Award, Users } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';
import { supabase } from '../supabaseClient';
import { fetchDashboardStats } from '../api/tennisApi';
import { SpeedInsights } from "@vercel/speed-insights/next"


export default function MainDashboard({ onLogout, onNavigateToHistory, onNavigateToRegister, onNavigateToDashboard, onNavigateToProfile, onNavigateToRankings, onNavigateToPartnerRankings }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const safeStats = {
    recent_win_rate: 0,
    recent_wins: 0,
    recent_total: 0,
    monthly_trends: [],
    point_leaders: [],
    soulmates: [],
    avg_points_per_set: 0,
    ...stats,
  };
  // 🚨 추가 1: 프로필 사진 URL을 담을 상태
  const [avatarUrl, setAvatarUrl] = useState(null);
  


  // 🚨 추가 2: 대시보드 로딩 시 유저의 아바타 URL을 가져오는 로직
  useEffect(() => {
    const fetchUserProfile = async () => {
      // 1. 현재 로그인된 세션/유저 정보 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 2. profiles 테이블에서 내 avatar_url만 쏙 빼오기
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      }
    };
    fetchUserProfile();
  }, []);


  // 햄버거 메뉴와 Dashboard 바로가기, 프로파일, 로그아웃 버튼 추가
  const navigate = useNavigate();
  // 🚨 추가: 메뉴 열림/닫힘 상태 관리
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // 🚨 추가: 메뉴 바깥을 클릭하면 드롭다운이 닫히도록 하는 안전 장치
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  //메뉴 추가 end


  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const data = await fetchDashboardStats();
        if (isMounted) {
          setStats(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  // [로딩 중일 때]
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 shadow-sm"><div className="h-6 w-32 bg-gray-200 rounded"></div></header>
        <SkeletonLoader />
      </div>
    );
  }

  // [데이터 로딩 완료 후]
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 대시보드 상단 헤더 영역 */}
      <header className="flex justify-between items-center mb-8 relative">
        {/* 🚨 교체된 타이틀 영역: 사진 + 텍스트 */}
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => {
            onNavigateToProfile ? onNavigateToProfile() : navigate('/profile');
          }}
        >
          {avatarUrl ? (
            // 사진이 있는 경우 (동그랗게 크롭)
            <img 
              src={avatarUrl} 
              alt="프로필" 
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            // 사진이 없는 경우 (기본 유저 아이콘)
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <h1 className="text-2xl font-black text-[#002B5C]">MY DASHBOARD</h1>
        </div>
        {/* 🚨 교체된 햄버거 메뉴 영역 */}
        <div className="relative" ref={menuRef}>
          {/* 햄버거 버튼 */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition flex items-center justify-center"
          >
            <Menu className="w-6 h-6 text-[#002B5C]" />
          </button>

          {/* 드롭다운 메뉴 (isMenuOpen이 true일 때만 보임) */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 overflow-hidden flex flex-col">
              
              <button 
                onClick={() => { onNavigateToDashboard ? onNavigateToDashboard() : navigate('/dashboard'); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <Home className="w-4 h-4 text-gray-500" />
                Main
              </button>

              <button 
                onClick={() => { 
                  onNavigateToProfile ? onNavigateToProfile() : navigate('/profile'); 
                  setIsMenuOpen(false); 
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <User className="w-4 h-4 text-gray-500" />
                프로파일
              </button>

              <div className="border-t border-gray-100 my-1"></div> {/* 구분선 */}

              <button 
                onClick={() => { onLogout(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                로그아웃
              </button>
              
            </div>
          )}
        </div>
      </header>
      {/* 헤더 공간 종료 */}

      <main className="p-4 space-y-4">
        {/* 승률 통계 카드 */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-[#002B5C] p-4 rounded-2xl text-white shadow-lg">
            <Trophy className="w-6 h-6 text-[#FFC510] mb-2" />
            <div className="text-3xl font-black">{safeStats.recent_win_rate}%</div>
            <div className="text-[10px] text-blue-200 mt-1">최근 10경기 승률</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <Activity className="w-6 h-6 text-gray-400" />
            <div>
              <div className="text-2xl font-black text-[#002B5C]">{safeStats.recent_wins}승 {safeStats.recent_total - safeStats.recent_wins}패</div>
              <div className="text-[10px] text-gray-400">최근 10경기 전적</div>
            </div>
          </div>
        </section>

        {/* 이달의 Point Leader Top 3 섹션 */}
        <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-[#002B5C] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FFC510]" /> 이달의 Point Leader Top 3
            </h2>
            <button 
              onClick={onNavigateToRankings}
              className="text-[10px] font-bold text-blue-500 hover:underline flex items-center"
            >
              전체순위보기 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="flex justify-around items-end pt-4 pb-2 h-40">
            {/* 2위 */}
            {safeStats.point_leaders[1] ? (
              <div className="flex flex-col items-center flex-1">
                <div className="text-[10px] font-bold text-gray-400 mb-1">{safeStats.point_leaders[1].wins}승</div>
                <div className="w-12 h-12 rounded-full border-2 border-gray-100 overflow-hidden mb-2 shadow-sm bg-gray-50">
                  {safeStats.point_leaders[1].avatar_url ? (
                    <img src={safeStats.point_leaders[1].avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <User className="w-full h-full p-2 text-gray-300" />
                  )}
                </div>
                <div className="w-10 bg-gray-100 rounded-t-lg flex items-end justify-center pb-1 h-12 shadow-inner">
                  <span className="text-gray-400 font-black text-sm">2</span>
                </div>
                <div className="text-[10px] mt-2 font-bold text-gray-600 truncate w-full text-center px-1">
                  {safeStats.point_leaders[1].name}
                </div>
              </div>
            ) : <div className="flex-1"></div>}

            {/* 1위 */}
            {safeStats.point_leaders[0] ? (
              <div className="flex flex-col items-center flex-1">
                <div className="text-xs font-bold text-[#002B5C] mb-1">{safeStats.point_leaders[0].wins}승</div>
                <div className="w-14 h-14 rounded-full border-2 border-[#FFC510] overflow-hidden mb-2 shadow-md bg-gray-50">
                  {safeStats.point_leaders[0].avatar_url ? (
                    <img src={safeStats.point_leaders[0].avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <User className="w-full h-full p-2 text-gray-300" />
                  )}
                </div>
                <div className="w-12 bg-[#002B5C] rounded-t-lg flex items-end justify-center pb-2 h-16 shadow-lg">
                  <span className="text-[#FFC510] font-black text-xl">1</span>
                </div>
                <div className="text-xs mt-2 font-black text-[#002B5C] truncate w-full text-center px-1">
                  {safeStats.point_leaders[0].name}
                </div>
              </div>
            ) : (
              <div className="flex-1 text-center text-xs text-gray-300 pb-4">데이터 없음</div>
            )}

            {/* 3위 */}
            {safeStats.point_leaders[2] ? (
              <div className="flex flex-col items-center flex-1">
                <div className="text-[10px] font-bold text-gray-400 mb-1">{safeStats.point_leaders[2].wins}승</div>
                <div className="w-10 h-10 rounded-full border border-gray-100 overflow-hidden mb-2 shadow-sm bg-gray-50">
                  {safeStats.point_leaders[2].avatar_url ? (
                    <img src={safeStats.point_leaders[2].avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <User className="w-full h-full p-2 text-gray-300" />
                  )}
                </div>
                <div className="w-10 bg-gray-50 rounded-t-lg flex items-end justify-center pb-1 h-8 border-x border-t border-gray-100">
                  <span className="text-gray-300 font-black text-xs">3</span>
                </div>
                <div className="text-[10px] mt-2 font-bold text-gray-500 truncate w-full text-center px-1">
                  {safeStats.point_leaders[2].name}
                </div>
              </div>
            ) : <div className="flex-1"></div>}
          </div>
        </section>

        {/* 영혼의 단짝 섹션 추가 */}
        <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-[#002B5C] flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> 영혼의 단짝 (Soulmates)
            </h2>
            <button 
              onClick={onNavigateToPartnerRankings}
              className="text-[10px] font-bold text-blue-500 hover:underline flex items-center"
            >
              전체파트너보기 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {safeStats.soulmates.length > 0 ? (
              safeStats.soulmates.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-200">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User className="w-full h-full p-2 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#002B5C] truncate">{p.name}</div>
                    <div className="text-[10px] text-gray-400">총 {p.total}회 페어</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-center">
                      <div className="text-[10px] font-black text-blue-600">{p.wins}</div>
                      <div className="text-[8px] text-gray-400 uppercase">Win</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-red-400">{p.losses}</div>
                      <div className="text-[8px] text-gray-400 uppercase">Lose</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-gray-300">
                아직 복식 경기 기록이 없습니다.
              </div>
            )}
          </div>
        </section>

        {/* 활동 추이 섹션 */}
        <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-[#002B5C] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#FFC510]" /> 월별 활동 추이
          </h2>
          <div className="space-y-3">
            {(safeStats.monthly_trends ?? []).map((m) => (
              <div key={m.match_month} className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">{m.match_month}</span>
                <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FFC510]" style={{ width: `${(m.match_count / 10) * 100}%` }}></div>
                </div>
                <span className="text-xs font-black text-[#002B5C]">{m.match_count} 경기</span>
              </div>
            ))}
          </div>
        </section>

        {/* 전체 기록 이동 버튼 */}
        <button 
          onClick={onNavigateToHistory}
          className="w-full bg-white py-4 px-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center hover:bg-gray-50 transition"
        >
          <span className="text-sm font-bold text-[#002B5C]">전체 기록 확인하기</span>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </button>
      </main>

      {/* 플로팅 액션 버튼 (FAB) */}
      <button 
        onClick={onNavigateToRegister}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#FFC510] text-[#002B5C] rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform z-50"
      >
        <Plus className="w-8 h-8 font-black" />
      </button>
    </div>
  );
}