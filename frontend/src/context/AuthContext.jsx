import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        if (parsed.dark_mode) document.documentElement.classList.add('dark');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const params = new URLSearchParams({ username: email, password });
    const { data } = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    localStorage.setItem('accessToken', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
    const { data: me } = await api.get('/auth/me');
    setUser(me);
    localStorage.setItem('user', JSON.stringify(me));
    if (me.dark_mode) document.documentElement.classList.add('dark');
    toast.success(`Welcome back, ${me.name}!`);
    return me;
  }, []);

  const register = useCallback(async (userData) => {
    await api.post('/auth/register', userData);
    toast.success('Account created! Please login.');
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    delete api.defaults.headers.common['Authorization'];
    document.documentElement.classList.remove('dark');
    setUser(null);
  }, []);

  const toggleDarkMode = useCallback(async () => {
    const newMode = !user?.dark_mode;
    document.documentElement.classList.toggle('dark', newMode);
    const { data } = await api.put('/auth/me', { dark_mode: newMode });
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
  }, [user]);

  const updateUser = useCallback((updated) => {
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, toggleDarkMode, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
