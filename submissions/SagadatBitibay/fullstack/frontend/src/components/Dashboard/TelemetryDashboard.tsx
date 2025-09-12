import React, { useState, useEffect } from 'react';
import { useTelemetryData } from '../../hooks/useTelemetryData';
import { apiService } from '../../services/api';
import { dateUtils } from '../../utils/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrackMap } from '../Map/TrackMap';
import { Calendar, Clock, MapPin, Activity, Zap, Fuel, Download, RefreshCw, Info, AlertCircle } from 'lucide-react';

export const TelemetryDashboard: React.FC = () => {
  const [imeis, setImeis] = useState<string[]>([]);
  const [selectedImei, setSelectedImei] = useState<string>('');
  const [, setFields] = useState<string[]>([]);
  const [, setFuelSensors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const defaultTimeRange = dateUtils.getDefaultTimeRange();
  const [startDate, setStartDate] = useState<string>(dateUtils.formatForInput(defaultTimeRange.start));
  const [endDate, setEndDate] = useState<string>(dateUtils.formatForInput(defaultTimeRange.end));

  const { data, dataAvailability, loading: dataLoading, error: dataError, fetchTelemetryData } = useTelemetryData();

  useEffect(() => {
    loadImeis();
  }, []);

  useEffect(() => {
    if (selectedImei) {
      loadFields(selectedImei);
      loadFuelSensors(selectedImei);
      apiService.getRecommendedTimeRange(selectedImei).then((range) => {
        setStartDate(dateUtils.formatForInput(dateUtils.fromUTCString(range.start)));
        setEndDate(dateUtils.formatForInput(dateUtils.fromUTCString(range.end)));
      }).catch(() => {});
    }
  }, [selectedImei]);

  const loadImeis = async () => {
    try {
      setLoading(true);
      setError(null);
      const imeisData = await apiService.getImeis();
      setImeis(imeisData);
      if (imeisData.length > 0) {
        setSelectedImei(imeisData[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки IMEI');
    } finally {
      setLoading(false);
    }
  };

  const loadFields = async (imei: string) => {
    try {
      const fieldsData = await apiService.getFields(imei);
      setFields(fieldsData);
    } catch (err) {
      console.error('Error loading fields:', err);
    }
  };

  const loadFuelSensors = async (imei: string) => {
    try {
      const sensorsData = await apiService.getFuelSensors(imei);
      setFuelSensors(sensorsData);
    } catch (err) {
      console.error('Error loading fuel sensors:', err);
    }
  };

  const handleLoadData = async () => {
    if (!selectedImei) return;
    const startUTC = dateUtils.toUTCString(startDate);
    const endUTC = dateUtils.toUTCString(endDate);
    await fetchTelemetryData(selectedImei, startUTC, endUTC);
  };

  const setQuickTimeRange = (hours: number) => {
    const now = new Date();
    const almatyNow = dateUtils.fromUTCString(now.toISOString());
    const start = new Date(almatyNow.getTime() - hours * 60 * 60 * 1000);
    
    setStartDate(dateUtils.formatForInput(start));
    setEndDate(dateUtils.formatForInput(almatyNow));
  };

  // Enforce max 90-day range on the client
  const clampToMaxRange = (start: string, end: string) => {
    const startD = new Date(start);
    const endD = new Date(end);
    const maxMs = 90 * 24 * 60 * 60 * 1000;
    if (endD.getTime() - startD.getTime() > maxMs) {
      const clampedStart = new Date(endD.getTime() - maxMs);
      setStartDate(dateUtils.formatForInput(clampedStart));
    }
  };

  const formatChartData = (data: Array<{time: string, value: number}>) => {
    if (!data || data.length === 0) return [] as Array<{time: string, value: number, shortTime: string}>;
    
    return data.map(point => ({
      time: point.time,
      value: point.value,
      shortTime: dateUtils.formatForChart(dateUtils.fromUTCString(point.time))
    }));
  };

  const formatFuelSensorsData = (fuelSensors: Record<string, any>) => {
    const combinedData = new Map();
    
    Object.entries(fuelSensors).forEach(([sensorKey, sensorData]) => {
      sensorData.data.forEach((point: any) => {
        const displayTime = dateUtils.formatForChart(dateUtils.fromUTCString(point.time));
        if (!combinedData.has(displayTime)) {
          combinedData.set(displayTime, { displayTime, time: point.time });
        }
        combinedData.get(displayTime)[sensorKey] = point.value;
      });
    });

    return Array.from(combinedData.values()).sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  };

  const exportData = () => {
    if (!data) return;
    
    const exportObj = {
      imei: selectedImei,
      timeRange: {
        start: startDate,
        end: endDate
      },
      data: data
    };
    
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_${selectedImei}_${startDate.split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-lg font-medium text-gray-700">Загрузка данных...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Показания устройств</h1>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Время: Алматы (UTC+6)</span>
            </div>
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <div className="text-red-700">{error}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Параметры запроса
          </h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Устройство (IMEI)
            </label>
            <select 
              value={selectedImei} 
              onChange={(e) => setSelectedImei(e.target.value)}
              className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Выберите устройство</option>
              {imeis.map(imei => (
                <option key={imei} value={imei}>{imei}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Временной период
            </label>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { hours: 1, label: '1 час' },
                { hours: 6, label: '6 часов' },
                { hours: 12, label: '12 часов' },
                { hours: 24, label: '1 день' },
                { hours: 48, label: '2 дня' },
                { hours: 168, label: '7 дней' }
              ].map(({ hours, label }) => (
                <button
                  key={hours}
                  onClick={() => setQuickTimeRange(hours)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Начало
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); clampToMaxRange(e.target.value, endDate); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Конец
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); clampToMaxRange(startDate, e.target.value); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLoadData}
              disabled={!selectedImei || dataLoading}
              className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {dataLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Activity className="w-4 h-4 mr-2" />
              )}
              {dataLoading ? 'Загрузка...' : 'Загрузить данные'}
            </button>

            {data && (
              <button
                onClick={exportData}
                className="flex items-center px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Экспорт
              </button>
            )}
          </div>
        </div>

        {dataError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Ошибка загрузки данных:</span>
            </div>
            <p className="text-red-700 mt-1">{dataError}</p>
          </div>
        )}

        {dataAvailability && !dataAvailability.hasData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-center text-yellow-800">
              <Info className="w-5 h-5 mr-2" />
              <span className="font-medium">Данные за выбранный период отсутствуют</span>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Info className="w-5 h-5 mr-2" />
                Сводка по данным
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{data.dataInfo.totalPoints}</div>
                  <div className="text-sm text-gray-600">Всего точек данных</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600">Период данных</div>
                  <div className="text-sm font-medium">
                    {dateUtils.formatForDisplay(dateUtils.fromUTCString(data.dataInfo.timeRange.start))}
                  </div>
                  <div className="text-sm font-medium">
                    {dateUtils.formatForDisplay(dateUtils.fromUTCString(data.dataInfo.timeRange.end))}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600">Датчики топлива</div>
                  <div className="text-sm font-medium">
                    {data.dataInfo.availableSensors.length > 0 ? data.dataInfo.availableSensors.join(', ') : 'Не обнаружены'}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600">Агрегация</div>
                  <div className="text-sm font-medium">
                    {data.dataInfo.aggregationUsed ? 'Применена' : 'Не применена'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {data.series.speed && data.series.speed.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    Скорость (км/ч)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={formatChartData(data.series.speed)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="shortTime"
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <YAxis 
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #ccc',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelFormatter={(label, payload) => `Время: ${payload?.[0]?.payload?.time || label}`}
                        formatter={(value) => [`${value} км/ч`, 'Скорость']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {data.series.main_power_voltage && data.series.main_power_voltage.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-green-600" />
                    Напряжение питания (В)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={formatChartData(data.series.main_power_voltage)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="shortTime"
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <YAxis 
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #ccc',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelFormatter={(label, payload) => `Время: ${payload?.[0]?.payload?.time || label}`}
                        formatter={(value) => [`${value} В`, 'Напряжение']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {Object.entries(data.fuelSensors).some(([_, sensorData]) => sensorData.data.length > 0) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Fuel className="w-5 h-5 mr-2 text-orange-600" />
                  Датчики топлива
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={formatFuelSensorsData(data.fuelSensors)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="displayTime"
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#666"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Единицы', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelFormatter={(label, payload) => `Время: ${payload?.[0]?.payload?.time || label}`}
                    />
                    <Legend />
                    {Object.entries(data.fuelSensors).map(([sensorKey, sensorData], index) => {
                      const colors = ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                      return (
                        <Line 
                          key={sensorKey}
                          type="monotone" 
                          dataKey={sensorKey} 
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                          dot={{ strokeWidth: 2, r: 3 }}
                          name={`Датчик топлива ${sensorData.sensorId} (${sensorData.unit})`}
                          connectNulls={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.track && data.track.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-20">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-red-600" />
                    Маршрут движения
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({data.track.length} точек)
                    </span>
                  </h3>
                </div>
                <TrackMap trackData={data.track} />
              </div>
            )}
          </div>
        )}
      </div>
      
      <style>
        {`
          .custom-div-icon {
            background: none !important;
            border: none !important;
          }
          
          .custom-start-icon {
            background: none !important;
            border: none !important;
          }
          
          .custom-end-icon {
            background: none !important;
            border: none !important;
          }
        `}
      </style>
    </div>
  );
};
