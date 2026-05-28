import React from 'react';

export default function SkeletonLoader() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* 통계 카드 스켈레톤 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="h-28 bg-gray-200 rounded-2xl"></div>
        <div className="h-28 bg-gray-200 rounded-2xl"></div>
      </div>
      {/* 월별 추이 스켈레톤 */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-100 rounded-full w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}