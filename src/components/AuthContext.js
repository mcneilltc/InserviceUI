import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Paint-cache: show the last-known user immediately (avoids a flash of
  // logged-out UI), then reconcile with the server below — this is a UX nicety,
  // never the source of truth for what the user can actually do.
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser) setUser(storedUser);
    } catch {
      // ignore malformed cache
    }
  }, []);

  // The real source of truth: ask the backend to validate the session cookie.
  useEffect(() => {
    const hydrate = async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/auth/session`);
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setAuthLoading(false);
      }
    };
    hydrate();
  }, []);

  // Inactivity timeout logic (client-side UX only — the session itself also
  // expires server-side regardless of this).
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

  // Call this after a successful /api/auth/google or /api/auth/microsoft call
  // — the session cookie is already set by that response; this just records
  // the user for display and navigates.
  const login = useCallback((userData, redirectTo) => {
    const safeUserData = userData ? { ...userData } : null;
    delete safeUserData?.accessToken;
    setUser(safeUserData);
    setAuthLoading(false);
    setLastActivity(Date.now());
    localStorage.setItem('user', JSON.stringify(safeUserData));
    const destination = redirectTo || (safeUserData?.role === 'trainer' ? '/trainer-dashboard' : '/manager-dashboard');
    router.push(destination);
  }, [router]);

  // Call this on logout
  const logout = useCallback(async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`);
    } catch {
      // best-effort — clear local state regardless
    }
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
