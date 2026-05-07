import { useState } from 'react';
import { authAPI } from '../api/client';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(username, password);
      localStorage.setItem('token', res.data.token);
      return res.data;
    } catch (e: any) {
      setError(e.response?.data?.error || '登录失败');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, password: string, nickname: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.register(username, password, nickname);
      localStorage.setItem('token', res.data.token);
      return res.data;
    } catch (e: any) {
      setError(e.response?.data?.error || '注册失败');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
  };

  return { login, register, logout, loading, error };
}
