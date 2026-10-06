/**
 * Dashboard Loading Skeleton
 * Provides a smooth loading experience with animated placeholders
 */

import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="h-5 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Collection & Media Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="h-5 bg-gray-200 rounded w-40 mb-6"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Recent Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="h-5 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-40"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Media */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="h-5 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square rounded-lg bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
