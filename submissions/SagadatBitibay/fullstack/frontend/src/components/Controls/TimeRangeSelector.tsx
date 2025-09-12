import React from 'react';
import { dateUtils } from '../../utils/dateUtils';

interface TimeRangeSelectorProps {
  startTime: Date;
  endTime: Date;
  onStartTimeChange: (date: Date) => void;
  onEndTimeChange: (date: Date) => void;
  disabled?: boolean;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false
}) => {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    onStartTimeChange(date);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    onEndTimeChange(date);
  };

  const setQuickRange = (hours: number) => {
    const now = new Date();
    const almatyNow = dateUtils.fromUTCString(now.toISOString());
    const start = new Date(almatyNow.getTime() - hours * 60 * 60 * 1000);
    
    onStartTimeChange(start);
    onEndTimeChange(almatyNow);
  };

  return (
    <div className="flex flex-col gap-4 bg-gray-50 p-5 rounded-lg border border-gray-200">
      <h3 className="text-base text-gray-700 font-medium">
        Временной диапазон (время Алматы)
      </h3>
      
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">От:</label>
          <input
            type="datetime-local"
            value={dateUtils.formatForInput(startTime)}
            onChange={handleStartChange}
            disabled={disabled}
            className="px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">До:</label>
          <input
            type="datetime-local"
            value={dateUtils.formatForInput(endTime)}
            onChange={handleEndChange}
            disabled={disabled}
            className="px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex gap-2.5 flex-wrap items-center">
        <span className="text-sm font-medium text-gray-700">
          Быстрый выбор:
        </span>
        {[1, 6, 12, 24, 48].map(hours => (
          <button
            key={hours}
            onClick={() => setQuickRange(hours)}
            disabled={disabled}
            className="px-3 py-1.5 border border-gray-500 bg-white rounded text-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hours === 1 ? '1 час' : hours < 24 ? `${hours} ч` : `${hours / 24} дн`}
          </button>
        ))}
      </div>
    </div>
  );
};
