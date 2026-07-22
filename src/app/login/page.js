'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import GoogleAuth from '../../components/GoogleAuth';
import MicrosoftAuth from '../../components/MicrosoftAuth';
import { useRouter } from 'next/navigation';
import { Box, Typography, Divider, Alert } from '@mui/material';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

const LoginPage = () => {
  const { user, login } = useAuth();
  const [whitelistError, setWhitelistError] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      router.push(user.role === 'trainer' ? '/trainer-dashboard' : '/manager-dashboard');
    } else {
      setLoading(false);
    }
  }, [user, router]);

  // GoogleAuth already calls POST /api/auth/google itself and hands back the
  // fully resolved, server-verified user — login() picks the right redirect
  // based on its role.
  const handleGoogleLogin = useCallback((userData) => {
    login(userData);
  }, [login]);

  // The Microsoft callback route hands us a raw access token via sessionStorage
  // (not a resolved identity, and not the URL) — verify it server-side here,
  // same as Google.
  const handleMicrosoftToken = useCallback(async (accessToken) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/microsoft`, { accessToken });
      login(response.data.user);
    } catch (error) {
      console.error('Microsoft login failed:', error);
      const message = error.response?.data?.message || 'Failed to verify Microsoft login. Please try again.';
      setWhitelistError(message);
    }
  }, [login]);

  useEffect(() => {
    const microsoftToken = sessionStorage.getItem('microsoft_access_token');
    if (microsoftToken) {
      sessionStorage.removeItem('microsoft_access_token');
      handleMicrosoftToken(microsoftToken);
    }
  }, [handleMicrosoftToken]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 10, gap: 3 }}>
      <Box
        component="img"
        src="/logo-full.png"
        alt="UpSkilled"
        sx={{ width: '100%', maxWidth: 200, borderRadius: 3, mb: 1 }}
      />
      <Typography variant="h6" component="h1" color="text.secondary" gutterBottom>
        Sign in
      </Typography>
      {whitelistError && (
        <Alert severity="error" sx={{ minWidth: 300 }}>
          {whitelistError}
        </Alert>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
        <MicrosoftAuth />
        <Divider>OR</Divider>
        <GoogleAuth onLogin={handleGoogleLogin} />
      </Box>
    </Box>
  );
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}
