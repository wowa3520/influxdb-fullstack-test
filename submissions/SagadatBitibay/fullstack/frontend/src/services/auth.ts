import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
}

export interface User {
  id: string;
  email: string;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map(cb => cb(token));
  refreshSubscribers = [];
}

export class AuthService {
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  static async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/refresh');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
      isRefreshing = false;
      refreshSubscribers = [];
    } catch (error: any) {
      isRefreshing = false;
      refreshSubscribers = [];
    }
  }

  static async getProfile(): Promise<User> {
    try {
      const response = await apiClient.get('/auth/profile');
      return response.data.user;
    } catch (error: any) {
      throw error;
    }
  }

  static async checkAuth(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/') &&
        !originalRequest.url?.includes('/health')) {
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (token === 'success') {
              resolve(apiClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await AuthService.refreshToken();
        isRefreshing = false;
        onRefreshed('success');
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
