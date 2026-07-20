'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import GoogleAuth from '../../components/GoogleAuth';
import MicrosoftAuth from '../../components/MicrosoftAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Typography, Divider, Alert } from '@mui/material';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

const LoginPage = () => {
  const { user, login } = useAuth();
  const [whitelistError, setWhitelistError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      router.push(user.role === 'trainer' ? '/add-training' : '/manager-dashboard');
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

  // The Microsoft callback route hands us a raw access token via the redirect
  // URL (not a resolved identity) — verify it server-side here, same as Google.
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
    const microsoftToken = searchParams?.get('microsoft_token');
    if (microsoftToken) {
      handleMicrosoftToken(microsoftToken);
    }
  }, [searchParams, handleMicrosoftToken]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 10, gap: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Login
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

export default LoginPage;
