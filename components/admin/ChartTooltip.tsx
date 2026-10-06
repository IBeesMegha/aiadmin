/**
 * Custom Chart Tooltip Component
 * Provides beautiful, consistent tooltips for all charts
 */

import React from 'react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any) => string;
  labelFormatter?: (label: string) => string;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[150px]">
      {label && (
        <p className="text-sm font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-2">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600 capitalize">
                {entry.name}
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CustomLegendProps {
  payload?: any[];
}

export const CustomLegend: React.FC<CustomLegendProps> = ({ payload }) => {
  if (!payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};
