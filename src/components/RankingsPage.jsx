import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Trophy, Medal, ChevronLeft, ChevronRight, Loader2, ChevronDown, Check } from 'lucide-react';
import { fetchMonthlyRankings } from '../api/tennisApi';

export default function RankingsPage({ onBack }) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);

  const loadRankings = async () => {
    setIsLoading(true);
    const data = await fetchMonthlyRankings(currentYear, currentMonth);
    setRankings(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRankings();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    setIsEditingDate(false);
    if (currentMonth === 1) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setIsEditingDate(false);
    if (currentMonth === 12) {
      setCurrentYear(prev => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const years = Array.from({ length: now.getFullYear() - 2024 + 1 }, (_, i) => 2024 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* 헤더 */}
      <header className="bg-[#002B5C] text-white sticky top-0 z-50 shadow-md px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1 hover:bg-blue-900 rounded-full transition">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="font-bold text-lg tracking-tight">이달의 랭킹</h1>
      </header>

      {/* 월 선택기 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-[52px] z-40 shadow-sm">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        
        {!isEditingDate ? (
          <div 
            className="text-lg font-black text-[#002B5C] flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-3 py-1 rounded-lg transition"
            onClick={() => setIsEditingDate(true)}
          >
            {currentYear}. {String(currentMonth).padStart(2, '0')}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        ) : (
          <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
            <select 
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 rounded-md px-1 py-1 text-sm font-bold text-[#002B5C] outline-none focus:ring-1 focus:ring-[#002B5C]"
            >
              {years.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select 
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 rounded-md px-1 py-1 text-sm font-bold text-[#002B5C] outline-none focus:ring-1 focus:ring-[#002B5C]"
            >
              {months.map(m => (
                <option key={m} value={m} disabled={currentYear === now.getFullYear() && m > now.getMonth() + 1}>
                  {m}월
                </option>
              ))}
            </select>
            <button 
              onClick={() => setIsEditingDate(false)}
              className="ml-1 p-1.5 bg-[#002B5C] text-white rounded-full shadow-sm hover:bg-blue-900 transition"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        )}

        <button 
          onClick={handleNextMonth} 
          disabled={currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1}
          className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-20"
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <main className="max-w-2xl mx-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">데이터를 분석 중입니다...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">해당 월의 경기 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="py-4 pl-4 text-left w-16">순위</th>
                  <th className="py-4 text-left">플레이어</th>
                  <th className="py-4 text-center">게임</th>
                  <th className="py-4 text-center text-blue-600">승</th>
                  <th className="py-4 pr-4 text-center text-red-500">패</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rankings.map((player, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition">
                    <td className="py-4 pl-4">
                      <div className="flex justify-center items-center w-8 h-8">
                        {idx === 0 ? <Trophy className="w-5 h-5 text-[#FFC510]" /> : 
                         idx === 1 ? <Medal className="w-5 h-5 text-gray-400" /> :
                         idx === 2 ? <Medal className="w-5 h-5 text-amber-600" /> :
                         <span className="font-bold text-gray-300">{idx + 1}</span>}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shadow-sm">
                          {player.avatar_url ? (
                            <img src={player.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <User className="w-full h-full p-1.5 text-gray-300" />
                          )}
                        </div>
                        <span className="font-bold text-[#002B5C]">{player.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-center font-medium text-gray-500">{player.total}</td>
                    <td className="py-4 text-center font-black text-[#002B5C]">{player.wins}</td>
                    <td className="py-4 pr-4 text-center font-medium text-gray-400">{player.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}