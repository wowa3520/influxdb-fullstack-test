import axios from 'axios';
import type { TelemetryResponse, DataAvailability } from '../types';

const RAW_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const API_BASE = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE.replace(/\/$/, '')}/api`;

// Используем тот же экземпляр axios, что и в auth.ts для единообразия
import apiClient from './auth';

// Создаем отдельный клиент для API с правильным baseURL
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true, // Важно для работы с HTTP-only cookies
});

// Добавляем интерцептор для автоматического обновления токенов
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Обрабатываем только 401 ошибки
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Импортируем AuthService динамически, чтобы избежать циклических зависимостей
        const { AuthService } = await import('./auth');
        await AuthService.refreshToken();
        return api(originalRequest);
      } catch (refreshError) {
        // Если refresh не удался, перенаправляем на страницу входа
        console.log('Refresh token failed, redirecting to login');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  async getImeis(): Promise<string[]> {
    const response = await api.get('/imeis');
    return response.data;
  },

  async getFields(imei: string): Promise<string[]> {
    const response = await api.get('/fields', {
      params: { imei }
    });
    return response.data;
  },

  async getFuelSensors(imei: string): Promise<string[]> {
    const response = await api.get('/fuel-sensors', {
      params: { imei }
    });
    return response.data;
  },

  async getRecommendedTimeRange(imei: string): Promise<{ start: string; end: string; }>{
    const response = await api.get('/recommended-time-range', {
      params: { imei }
    });
    return response.data;
  },

  async checkDataAvailability(imei: string, start: string, end: string): Promise<DataAvailability> {
    const response = await api.get('/check-data', {
      params: { imei, start, end }
    });
    return response.data;
  },

  async getTelemetryData(imei: string, start: string, end: string): Promise<TelemetryResponse> {
    const response = await api.get('/telemetry', {
      params: { imei, start, end }
    });
    return response.data;
  }
};