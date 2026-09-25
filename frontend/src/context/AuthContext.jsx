import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [limiares, setLimiares] = useState({ l1: 2, l2: 5 });
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me/');
      setUser(res.data.user);
      setLimiares(res.data.limiares);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login/', { username, password });
    setUser(res.data.user);
    setLimiares(res.data.limiares);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout/');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, limiares, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
