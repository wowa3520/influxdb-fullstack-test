import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const userProfile = await AuthService.getProfile();
      setUser(userProfile);
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await AuthService.login({ email, password });
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const response = await AuthService.register({ email, password });
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    register,
    logout,
    checkAuth,
    refreshAuth: checkAuth,
  };
};
