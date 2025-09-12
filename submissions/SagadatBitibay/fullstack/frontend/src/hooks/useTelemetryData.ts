import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { TelemetryResponse, DataAvailability } from '../types';

export const useTelemetryData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TelemetryResponse | null>(null);
  const [dataAvailability, setDataAvailability] = useState<DataAvailability | null>(null);

  const checkDataAvailability = useCallback(async (imei: string, start: string, end: string) => {
    if (!imei) return;
    
    try {
      setLoading(true);
      setError(null);
      const availability = await apiService.checkDataAvailability(imei, start, end);
      setDataAvailability(availability);
      return availability;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка проверки доступности данных');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTelemetryData = useCallback(async (imei: string, start: string, end: string) => {
    if (!imei) return;

    try {
      setLoading(true);
      setError(null);
      
      const availability = await apiService.checkDataAvailability(imei, start, end);
      setDataAvailability(availability);
      
      if (!availability.hasData) {
        setError('Данные за выбранный период отсутствуют');
        setData(null);
        return;
      }

      const telemetryData = await apiService.getTelemetryData(imei, start, end);
      setData(telemetryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setDataAvailability(null);
    setError(null);
  }, []);

  return {
    data,
    dataAvailability,
    loading,
    error,
    fetchTelemetryData,
    checkDataAvailability,
    clearData
  };
};

