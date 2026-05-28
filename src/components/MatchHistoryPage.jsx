import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Calendar, ChevronDown } from 'lucide-react';
// import { tennisApi } from '../api/tennisApi'; // 실제 API 연동 시 사용

export default function MatchHistoryPage({ onBack }) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // 더미 데이터 생성 함수 (API 호출을 대체)
  const generateMockMatches = (pageNumber) => {
    return Array.from({ length: 5 }).map((_, i) => {
      const id = (pageNumber - 1) * 5 + i + 1;
      const isWin = Math.random() > 0.4; // 60% 확률로 승리
      const isDoubles = Math.random() > 0.5; // 단식/복식 랜덤
      return {
        id,
        date: `2026.05.${28 - id < 10 ? `0${28 - id}` : 28 - id}`,
        type: isDoubles ? '복식' : '단식',
        partner: isDoubles ? '홍길동' : null,
        opponents: isDoubles ? ['김철수', '이영희'] : ['박민수'],
        setScores: [
          { team1: isWin ? 6 : 4, team2: isWin ? 4 : 6 },
          { team1: isWin ? 7 : 3, team2: isWin ? 5 : 6, t1Tie: isWin ? 7 : null, t2Tie: isWin ? null : 4 },
        ],
        isWinner: isWin
      };
    });
  };

  useEffect(() => {
    // 초기 데이터 로드
    setIsLoading(true);
    setTimeout(() => {
      setMatches(generateMockMatches(1));
      setIsLoading(false);
    }, 500);
  }, []);

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      const newPage = page + 1;
      setMatches((prev) => [...prev, ...generateMockMatches(newPage)]);
      setPage(newPage);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      
      {/* --- TOP NAVIGATION --- */}
      <header className="bg-[#002B5C] text-white sticky top-0 z-50 shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-blue-900 rounded-full transition">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="font-bold text-lg tracking-tight">전체 경기 기록</h1>
        </div>
        <button className="p-2 hover:bg-blue-900 rounded-full transition flex items-center gap-1 text-sm text-[#FFC510]">
          <Filter className="w-4 h-4" /> 필터
        </button>
      </header>

      {/* --- MAIN LIST CONTAINER --- */}
      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-4">
        
        {/* 요약 바 */}
        <div className="flex justify-between items-center text-sm text-gray-500 px-1 border-b pb-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" /> 2026년 전체 기록
          </span>
          <span>총 {matches.length}경기 표시됨</span>
        </div>

        {/* 경기 리스트 매핑 */}
        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
              
              {/* 왼쪽: 날짜 및 승패 표시 구역 */}
              <div className={`p-4 flex md:flex-col justify-between items-center md:justify-center md:w-28 ${
                match.isWinner ? 'bg-blue-50' : 'bg-gray-50'
              } border-b md:border-b-0 md:border-r border-gray-100`}>
                <span className="text-sm font-bold text-gray-700">{match.date}</span>
                <span className={`px-3 py-1 mt-0 md:mt-2 rounded-full text-xs font-black uppercase ${
                  match.isWinner ? 'bg-[#002B5C] text-[#FFC510]' : 'bg-gray-200 text-gray-600'
                }`}>
                  {match.isWinner ? 'WIN' : 'LOSE'}
                </span>
              </div>

              {/* 오른쪽: 상세 매치 정보 */}
              <div className="p-4 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-white bg-gray-400 px-2 py-0.5 rounded">
                    {match.type}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm md:text-base font-semibold text-gray-800 mb-3">
                  <span className="flex-1 text-right truncate">나{match.partner && ` & ${match.partner}`}</span>
                  <span className="text-gray-300 font-black italic">VS</span>
                  <span className="flex-1 text-left truncate">{match.opponents.join(' & ')}</span>
                </div>

                {/* 세트 스코어 바 */}
                <div className="flex gap-2 justify-center bg-gray-50 py-2 rounded-lg text-sm font-mono border border-gray-100">
                  {match.setScores.map((set, idx) => (
                    <div key={idx} className="flex flex-col items-center px-3 border-r last:border-r-0 border-gray-200">
                      <span className="text-[10px] text-gray-400 mb-0.5">SET {idx + 1}</span>
                      <span className="font-bold text-gray-700">
                        <span className={set.team1 > set.team2 ? 'text-[#002B5C]' : ''}>{set.team1}</span>
                        <span className="mx-0.5">-</span>
                        <span className={set.team2 > set.team1 ? 'text-[#002B5C]' : ''}>{set.team2}</span>
                      </span>
                      {/* 타이브레이크 점수 표시 */}
                      {(set.t1Tie || set.t2Tie) && (
                        <span className="text-[9px] text-blue-500 font-normal">
                          ({set.t1Tie || 0}-{set.t2Tie || 0})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* 더보기 버튼 (Pagination 처리용) */}
        <button 
          onClick={handleLoadMore}
          disabled={isLoading}
          className="w-full py-4 text-sm font-bold text-[#002B5C] bg-white border-2 border-blue-100 rounded-xl hover:bg-blue-50 transition flex justify-center items-center gap-2 mt-6"
        >
          {isLoading ? '불러오는 중...' : (
            <>더보기 <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      </main>
    </div>
  );
}