import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Users, Loader2, Heart } from 'lucide-react';
import { fetchPartnerRankings } from '../api/tennisApi';

export default function PartnerRankingsPage({ onBack }) {
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchPartnerRankings();
      setRankings(data);
      setIsLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-[#002B5C] text-white sticky top-0 z-50 shadow-md px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1 hover:bg-blue-900 rounded-full transition">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400 fill-red-400" /> 영혼의 단짝 리스트
        </h1>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">단짝을 찾는 중입니다...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">함께한 파트너 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">
                  <th className="py-4 pl-4 text-left">플레이어</th>
                  <th className="py-4">페어</th>
                  <th className="py-4 text-blue-600">승</th>
                  <th className="py-4 text-red-500">패</th>
                  <th className="py-4 pr-4">승률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-center">
                {rankings.map((p, idx) => {
                  const winRate = p.total > 0 ? Math.round((p.wins / p.total) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-blue-50/30 transition">
                      <td className="py-4 pl-4 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-100">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <User className="w-full h-full p-1.5 text-gray-300" />
                            )}
                          </div>
                          <span className="font-bold text-[#002B5C]">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-4 font-medium text-gray-500">{p.total}</td>
                      <td className="py-4 font-black text-[#002B5C]">{p.wins}</td>
                      <td className="py-4 font-medium text-gray-400">{p.losses}</td>
                      <td className="py-4 pr-4 font-black text-[#002B5C]">{winRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}