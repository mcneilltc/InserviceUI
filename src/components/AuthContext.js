import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Load user from localStorage/sessionStorage on mount
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) setUser(storedUser);
  }, []);

  // Persist user to localStorage
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  // Inactivity timeout logic
  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(() => {
      setUser(null);
      router.push('/login');
    }, 30 * 60 * 1000); // 30 minutes

    const resetTimer = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [user, lastActivity, router]);

  // Call this on successful login. redirectTo defaults based on role if not provided.
  const login = useCallback((userData, redirectTo) => {
    setUser(userData);
    setLastActivity(Date.now());
    const destination = redirectTo || (userData.role === 'trainer' ? '/add-training' : '/manager-dashboard');
    router.push(destination);
  }, [router]);

  // Call this on logout
  const logout = useCallback(() => {
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);