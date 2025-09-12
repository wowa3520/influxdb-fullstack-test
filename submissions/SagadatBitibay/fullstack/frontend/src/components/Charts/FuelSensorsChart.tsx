import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { FuelSensorData } from '../../types';
import { dateUtils } from '../../utils/dateUtils';

interface FuelSensorsChartProps {
  sensors: Record<string, FuelSensorData>;
}

const SENSOR_COLORS = ['#ff7300', '#8dd1e1', '#d084d0', '#ffb347'];

export const FuelSensorsChart: React.FC<FuelSensorsChartProps> = ({ sensors }) => {
  const sensorKeys = Object.keys(sensors);
  
  if (sensorKeys.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-gray-600">Нет данных с датчиков топлива</span>
      </div>
    );
  }

  const combinedData = new Map();
  
  sensorKeys.forEach((sensorKey) => {
    const sensorData = sensors[sensorKey];
    sensorData.data.forEach(point => {
      const displayTime = dateUtils.formatForChart(dateUtils.fromUTCString(point.time));
      if (!combinedData.has(displayTime)) {
        combinedData.set(displayTime, { displayTime });
      }
      combinedData.get(displayTime)[sensorKey] = point.value;
    });
  });

  const chartData = Array.from(combinedData.values()).sort((a, b) => 
    new Date(a.displayTime).getTime() - new Date(b.displayTime).getTime()
  );

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2.5 border border-gray-300 rounded shadow-sm">
          <p className="text-sm font-medium text-gray-900">{`Время: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${sensors[entry.dataKey].sensorId}: ${entry.value} ${sensors[entry.dataKey].unit}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700 mb-5">
        Датчики топлива
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="displayTime"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            label={{ value: 'Единицы', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={customTooltip} />
          <Legend />
          {sensorKeys.map((sensorKey, index) => (
            <Line 
              key={sensorKey}
              type="monotone" 
              dataKey={sensorKey} 
              stroke={SENSOR_COLORS[index % SENSOR_COLORS.length]}
              strokeWidth={2}
              name={`Датчик топлива ${sensors[sensorKey].sensorId} (${sensors[sensorKey].unit})`}
              connectNulls={false}
              dot={{ strokeWidth: 2, r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
