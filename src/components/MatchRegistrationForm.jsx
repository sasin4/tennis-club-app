import React, { useState, useEffect } from 'react';
import { Calendar, Users, Swords, PlusCircle, MinusCircle, Check, ArrowLeft, Loader2 } from 'lucide-react';
// 방금 만든 Supabase API 함수를 가져옵니다.
import { insertMatchResult, searchProfilesByName } from '../api/tennisApi';

export default function MatchRegistrationForm({ onBack, onSubmitSuccess }) {
  // 브라우저 현지 시간 기준 오늘 날짜 (YYYY-MM-DD)
  const today = new Date().toLocaleDateString('sv-SE');

  const [matchDate, setMatchDate] = useState(today);
  const [matchType, setMatchType] = useState('Doubles');
  
  // 플레이어 정보를 객체 형태로 관리 (이름과 ID 분리)
  const [partner, setPartner] = useState({ id: '', name: '' });
  const [opponent1, setOpponent1] = useState({ id: '', name: '' });
  const [opponent2, setOpponent2] = useState({ id: '', name: '' });

  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchField, setActiveSearchField] = useState(null); // 'partner' | 'opponent1' | 'opponent2'
  
  // 저장 중 버튼을 중복 클릭하지 못하게 막는 전역 로딩 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sets, setSets] = useState([
    { id: 1, team1: '', team2: '', t1Tie: '', t2Tie: '' }
  ]);

  // 검색 로직
  const handleNameInputChange = async (field, value) => {
    // 1. UI용 이름 업데이트
    const updateFunc = field === 'partner' ? setPartner : field === 'opponent1' ? setOpponent1 : setOpponent2;
    updateFunc({ id: '', name: value }); // 직접 입력 시에는 ID를 초기화

    // 2. 검색 수행
    setActiveSearchField(field);
    if (value.trim().length > 0) {
      const results = await searchProfilesByName(value);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectPlayer = (field, player) => {
    const updateFunc = field === 'partner' ? setPartner : field === 'opponent1' ? setOpponent1 : setOpponent2;
    updateFunc({ id: player.id, name: player.name });
    
    // 검색 결과 초기화
    setSearchResults([]);
    setActiveSearchField(null);
  };

  const handleAddSet = () => {
    if (sets.length < 5) {
      setSets([...sets, { id: sets.length + 1, team1: '', team2: '', t1Tie: '', t2Tie: '' }]);
    }
  };

  const handleRemoveSet = (setId) => {
    if (sets.length > 1) {
      setSets(sets.filter(set => set.id !== setId).map((set, index) => ({ ...set, id: index + 1 })));
    }
  };

  const handleScoreChange = (id, field, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setSets(sets.map(set => set.id === id ? { ...set, [field]: numericValue } : set));
  };

  // --- 핵심: 실제 백엔드 연동 제출 핸들러 ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 0. 날짜 유효성 2차 검사 (UI 우회 방지)
    if (matchDate > today) {
      alert('미래의 날짜는 기록할 수 없습니다. 오늘 또는 과거 날짜를 선택해주세요.');
      return;
    }

    // 1. 기본 라인업 유효성 검사
    if (!opponent1.name || (matchType === 'Doubles' && (!partner.name || !opponent2.name))) {
      alert('모든 플레이어 이름을 입력해주세요.');
      return;
    }

    // 2. 세트 스코어 공란 검사
    const hasEmptyScore = sets.some(set => set.team1 === '' || set.team2 === '');
    if (hasEmptyScore) {
      alert('모든 세트의 게임 스코어를 입력해주세요.');
      return;
    }

    // 3. 승리 팀 자동 계산 알고리즘 (과반수 세트를 가져간 팀이 매치 승리)
    let team1WinSets = 0;
    let team2WinSets = 0;

    sets.forEach(set => {
      const score1 = parseInt(set.team1, 10);
      const score2 = parseInt(set.team2, 10);
      if (score1 > score2) team1WinSets++;
      if (score2 > score1) team2WinSets++;
    });

    if (team1WinSets === team2WinSets) {
      alert('세트 스코어가 무승부입니다. 테니스는 최종 승리 팀이 결정되어야 합니다.');
      return;
    }
    const finalWinnerTeam = team1WinSets > team2WinSets ? 1 : 2;

    // 4. 로딩 락(Lock) 활성화
    setIsSubmitting(true);

    // 5. API 규격에 맞게 데이터 가공 (Payload 생성)
    const payload = {
      game_date: matchDate,
      match_type: matchType,
      partner_id: (matchType === 'Doubles' && partner.id) ? partner.id : null,
      opponent1_id: opponent1.id || null,
      opponent2_id: (matchType === 'Doubles' && opponent2.id) ? opponent2.id : null,
      winner_team: finalWinnerTeam,
      sets: sets.map((set, index) => ({
        set_number: index + 1,
        team1_score: parseInt(set.team1, 10),
        team2_score: parseInt(set.team2, 10),
        team1_tiebreak: set.t1Tie ? parseInt(set.t1Tie, 10) : null,
        team2_tiebreak: set.t2Tie ? parseInt(set.t2Tie, 10) : null,
      }))
    };

    // 6. Supabase API 호출
    const result = await insertMatchResult(payload);

    setIsSubmitting(false);

    if (result.success) {
      alert('🎉 경기 기록이 데이터베이스에 성공적으로 저장되었습니다!');
      if (onSubmitSuccess) {
        onSubmitSuccess(); // 대시보드로 이동시키는 라우터 액션 유도
      }
    } else {
      alert(`저장에 실패했습니다: ${result.error}`);
    }
  };

  // 검색 드롭다운 컴포넌트
  const Shortlist = ({ field }) => {
    if (activeSearchField !== field || searchResults.length === 0) return null;
    
    return (
      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
        {searchResults.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => handleSelectPlayer(field, player)}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 border-b last:border-0 border-gray-50 transition flex items-center justify-between"
          >
            <span className="font-medium text-gray-700">{player.name}</span>
            <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded">회원</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      
      <header className="bg-[#002B5C] text-white sticky top-0 z-50 shadow-md px-4 py-3 flex items-center">
        <button type="button" onClick={onBack} disabled={isSubmitting} className="p-1 mr-3 hover:bg-blue-900 rounded-full transition disabled:opacity-50">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="font-bold text-lg tracking-tight text-[#FFC510]">새 경기 기록</h1>
      </header>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 mt-6 space-y-6">
        
        {/* 경기 기본 정보 섹션 */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-[#002B5C] flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-[#FFC510]" /> 경기 기본 정보
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">경기 일자</label>
              <input 
                type="date" 
                value={matchDate} 
                onChange={(e) => setMatchDate(e.target.value)} 
                disabled={isSubmitting}
                max={today} // 오늘 이후 날짜 선택 방지
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5C] outline-none disabled:bg-gray-100" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">경기 종류</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button type="button" onClick={() => setMatchType('Singles')} disabled={isSubmitting}
                        className={`flex-1 py-1.5 text-sm font-bold rounded-md transition ${matchType === 'Singles' ? 'bg-white text-[#002B5C] shadow-sm' : 'text-gray-400'}`}>
                  단식 (Singles)
                </button>
                <button type="button" onClick={() => setMatchType('Doubles')} disabled={isSubmitting}
                        className={`flex-1 py-1.5 text-sm font-bold rounded-md transition ${matchType === 'Doubles' ? 'bg-white text-[#002B5C] shadow-sm' : 'text-gray-400'}`}>
                  복식 (Doubles)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 라인업 섹션 */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-[#002B5C] flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#FFC510]" /> 라인업 (Team 1 vs Team 2)
          </h2>
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FFC510] text-[#002B5C] text-xs font-black p-1 rounded-full border-2 border-white z-10">VS</div>
            
            <div className="space-y-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
              <div className="text-center text-xs font-bold text-[#002B5C] mb-2">우리 팀</div>
              <input type="text" value="나 (본인)" disabled className="w-full px-3 py-2 bg-gray-200 border-transparent rounded-lg text-sm text-gray-500 font-bold text-center" />
              <div className="relative">
                {matchType === 'Doubles' && (
                  <>
                    <input type="text" value={partner.name} onChange={(e) => handleNameInputChange('partner', e.target.value)} placeholder="파트너 이름" disabled={isSubmitting}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#002B5C] outline-none disabled:bg-gray-100" required />
                    <Shortlist field="partner" />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div className="text-center text-xs font-bold text-gray-600 mb-2">상대 팀</div>
              <div className="relative">
                <input type="text" value={opponent1.name} onChange={(e) => handleNameInputChange('opponent1', e.target.value)} placeholder="상대편 1" disabled={isSubmitting}
                       className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#002B5C] outline-none disabled:bg-gray-100" required />
                <Shortlist field="opponent1" />
              </div>
              <div className="relative">
                {matchType === 'Doubles' && (
                  <>
                    <input type="text" value={opponent2.name} onChange={(e) => handleNameInputChange('opponent2', e.target.value)} placeholder="상대편 2" disabled={isSubmitting}
                           className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#002B5C] outline-none disabled:bg-gray-100" required />
                    <Shortlist field="opponent2" />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 스코어 입력 섹션 */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-[#002B5C] flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#FFC510]" /> 세트 스코어
            </h2>
          </div>
          <div className="space-y-3">
            {sets.map((set, index) => (
              <div key={set.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 relative">
                <span className="w-12 text-center text-xs font-bold text-gray-500">SET {set.id}</span>
                <div className="flex items-center gap-1">
                  <input type="text" maxLength="1" value={set.team1} onChange={(e) => handleScoreChange(set.id, 'team1', e.target.value)} placeholder="0" disabled={isSubmitting}
                         className="w-10 text-center py-2 font-bold text-lg border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5C] outline-none disabled:bg-gray-100" required />
                  <input type="text" maxLength="2" value={set.t1Tie} onChange={(e) => handleScoreChange(set.id, 't1Tie', e.target.value)} placeholder="TB" disabled={isSubmitting}
                         className="w-8 text-center py-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded focus:ring-1 focus:ring-blue-400 outline-none disabled:bg-gray-100" />
                </div>
                <span className="text-gray-300 font-black">:</span>
                <div className="flex items-center gap-1">
                  <input type="text" maxLength="2" value={set.t2Tie} onChange={(e) => handleScoreChange(set.id, 't2Tie', e.target.value)} placeholder="TB" disabled={isSubmitting}
                         className="w-8 text-center py-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded focus:ring-1 focus:ring-gray-400 outline-none disabled:bg-gray-100" />
                  <input type="text" maxLength="1" value={set.team2} onChange={(e) => handleScoreChange(set.id, 'team2', e.target.value)} placeholder="0" disabled={isSubmitting}
                         className="w-10 text-center py-2 font-bold text-lg border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5C] outline-none disabled:bg-gray-100" required />
                </div>
                {sets.length > 1 && index === sets.length - 1 && !isSubmitting && (
                  <button type="button" onClick={() => handleRemoveSet(set.id)} className="absolute -right-2 -top-2 text-red-500 bg-white rounded-full"><MinusCircle className="w-5 h-5" /></button>
                )}
              </div>
            ))}
          </div>
          {sets.length < 5 && !isSubmitting && (
            <button type="button" onClick={handleAddSet} className="w-full mt-3 py-2 border-2 border-dashed border-blue-200 text-[#002B5C] text-sm font-bold rounded-xl hover:bg-blue-50 transition flex items-center justify-center gap-1">
              <PlusCircle className="w-4 h-4" /> 세트 추가
            </button>
          )}
        </section>

        {/* 제출 버튼 */}
        <button type="submit" disabled={isSubmitting}
                className="w-full bg-[#002B5C] hover:bg-blue-900 text-white font-bold py-4 rounded-xl transition text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#FFC510]" />
              서버에 기록 저장 중...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 text-[#FFC510]" />
              경기 기록 저장하기
            </>
          )}
        </button>
      </form>
    </div>
  );
}