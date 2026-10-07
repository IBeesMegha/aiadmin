/**
 * Dashboard Loading Skeleton
 */

import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen animate-pulse">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-72 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-7 bg-gray-200 rounded w-14"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-7 bg-gray-200 rounded w-14"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="h-5 bg-gray-200 rounded w-40 mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-40"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
