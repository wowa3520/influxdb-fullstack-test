import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { type TelemetryPoint } from '../../types';
import { dateUtils } from '../../utils/dateUtils';

interface VoltageChartProps {
  data: TelemetryPoint[];
}

export const VoltageChart: React.FC<VoltageChartProps> = ({ data }) => {
  const formattedData = data.map(point => ({
    ...point,
    displayTime: dateUtils.formatForDisplay(dateUtils.fromUTCString(point.time))
  }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2.5 border border-gray-300 rounded shadow-sm">
          <p className="text-sm font-medium text-gray-900">{`Время: ${label}`}</p>
          <p className="text-sm" style={{ color: '#82ca9d' }}>
            {`Напряжение: ${payload[0].value} В`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-gray-600">Нет данных о напряжении</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700 mb-5">
        Напряжение питания (В)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="displayTime"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            label={{ value: 'В', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={customTooltip} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#82ca9d" 
            strokeWidth={2}
            dot={{ fill: '#82ca9d', strokeWidth: 2, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
