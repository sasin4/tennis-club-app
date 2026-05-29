import React, { useEffect, useState } from 'react';
import { Activity, Trophy, TrendingUp, ChevronRight, Plus } from 'lucide-react';

import SkeletonLoader from './SkeletonLoader';
import { fetchDashboardStats } from '../supabaseClient';

export default function MainDashboard({ onLogout, onNavigateToHistory, onNavigateToRegister }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const safeStats = stats ?? { recent_win_rate: 0, recent_wins: 0, recent_total: 0, monthly_trends: [] };

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
     {/* 헤더 */}
      <header className="bg-white px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="font-black text-xl text-[#002B5C]">MY DASHBOARD</h1>
        <button onClick={onLogout} className="text-xs text-gray-400 font-bold hover:text-red-500">로그아웃</button>
      </header>

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

        {/* 활동 추이 섹션 */}
        <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-[#002B5C] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#FFC510]" /> 월별 활동 추이
          </h2>
          <div className="space-y-3">
            {safeStats.monthly_trends.map((m) => (
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