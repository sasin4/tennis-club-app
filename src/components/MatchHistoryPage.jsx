import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Calendar, ChevronDown, X } from 'lucide-react';
import { fetchMatchHistory } from '../api/tennisApi';

export default function MatchHistoryPage({ onBack }) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // 오늘 날짜와 한 달 전 날짜 계산 (기본 필터값)
  const today = new Date().toLocaleDateString('sv-SE');
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const oneMonthAgo = lastMonth.toLocaleDateString('sv-SE');

  // 필터 상태 관리
  const [filters, setFilters] = useState({
    startDate: oneMonthAgo,
    endDate: today,
    result: 'all', // all, win, lose
    matchType: 'all' // all, Singles, Doubles
  });

  const PAGE_SIZE = 5;

  // 실제 API를 호출하여 데이터를 가져오는 함수
  const loadMatches = async (pageNumber, isMore = false, currentFilters = filters) => {
    setIsLoading(true);
    const data = await fetchMatchHistory(pageNumber, PAGE_SIZE, currentFilters);
    
    // 가져온 데이터가 페이지 사이즈보다 작으면 더 이상 데이터가 없는 것으로 판단
    if (data.length < PAGE_SIZE) {
      setHasMore(false);
    }

    if (isMore) {
      setMatches((prev) => [...prev, ...data]);
    } else {
      setMatches(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadMatches(1, false);
  }, [filters]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMatches(nextPage, true);
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
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-full transition flex items-center gap-1 text-sm ${showFilters ? 'bg-blue-900 text-white' : 'hover:bg-blue-900 text-[#FFC510]'}`}
        >
          {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />} 
          필터
        </button>
      </header>

      {/* --- 필터 드로어 --- */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 p-4 space-y-4 shadow-sm animate-in slide-in-from-top duration-200">
          <div className="grid grid-cols-2 gap-4">
            {/* 날짜 필터 */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">From</label>
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002B5C]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">To</label>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002B5C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 승패 필터 */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Result</label>
              <div className="flex bg-gray-100 p-1 rounded">
                {['all', 'win', 'lose'].map(r => (
                  <button 
                    key={r}
                    onClick={() => setFilters(prev => ({ ...prev, result: r }))}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition ${filters.result === r ? 'bg-white text-[#002B5C] shadow-sm' : 'text-gray-400'}`}
                  >
                    {r === 'all' ? '전체' : r === 'win' ? '승' : '패'}
                  </button>
                ))}
              </div>
            </div>
            {/* 경기 방식 필터 */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Type</label>
              <div className="flex bg-gray-100 p-1 rounded">
                {['all', 'Singles', 'Doubles'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setFilters(prev => ({ ...prev, matchType: t }))}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition ${filters.matchType === t ? 'bg-white text-[#002B5C] shadow-sm' : 'text-gray-400'}`}
                  >
                    {t === 'all' ? '전체' : t === 'Singles' ? '단식' : '복식'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
        {hasMore && (
          <button 
            onClick={handleLoadMore}
            disabled={isLoading}
            className="w-full py-4 text-sm font-bold text-[#002B5C] bg-white border-2 border-blue-100 rounded-xl hover:bg-blue-50 transition flex justify-center items-center gap-2 mt-6 disabled:opacity-50"
          >
            {isLoading ? '불러오는 중...' : (
              <>더보기 <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </main>
    </div>
  );
}