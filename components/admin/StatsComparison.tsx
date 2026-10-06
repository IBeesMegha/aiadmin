/**
 * Stats Comparison Component
 * Shows metric comparisons with visual indicators
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsComparisonProps {
  current: number;
  previous: number;
  label: string;
  format?: 'number' | 'percentage' | 'currency';
}

export const StatsComparison: React.FC<StatsComparisonProps> = ({
  current,
  previous,
  label,
  format = 'number',
}) => {
  const calculateChange = () => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const change = calculateChange();
  const isPositive = change > 0;
  const isNeutral = change === 0;

  const formatValue = (value: number) => {
    switch (format) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center">
        {isNeutral ? (
          <Minus className="text-gray-400" size={16} />
        ) : isPositive ? (
          <TrendingUp className="text-green-500" size={16} />
        ) : (
          <TrendingDown className="text-red-500" size={16} />
        )}
      </div>
      <div>
        <span
          className={`text-sm font-medium ${
            isNeutral
              ? 'text-gray-600'
              : isPositive
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {isPositive && '+'}
          {change}%
        </span>
        <span className="text-xs text-gray-500 ml-1">{label}</span>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: React.ReactNode;
  color: string;
  format?: 'number' | 'percentage' | 'currency';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  icon,
  color,
  format = 'number',
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${val}%`;
      case 'currency':
        return `$${val.toFixed(2)}`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-3">
            {formatValue(value)}
          </p>
          {previousValue !== undefined && (
            <StatsComparison
              current={value}
              previous={previousValue}
              label="vs last period"
              format={format}
            />
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
};
