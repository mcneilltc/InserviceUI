'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useRouter } from 'next/navigation';
import { Box, Typography, Divider, Alert, TextField, Button, CircularProgress, Stack } from '@mui/material';
import { Google as GoogleIcon, Microsoft as MicrosoftIcon } from '@mui/icons-material';
import axios from 'axios';
import { redirectToGoogle, redirectToMicrosoft, redirectToYahoo } from '../../lib/oauthProviders';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

// Each provider's callback route stashes its token under a distinct
// sessionStorage key so a completed flow can be told apart from the others.
const TOKEN_HANDLERS = [
  { storageKey: 'google_id_token', backendPath: '/api/auth/google', bodyKey: 'idToken' },
  { storageKey: 'microsoft_access_token', backendPath: '/api/auth/microsoft', bodyKey: 'accessToken' },
  { storageKey: 'yahoo_access_token', backendPath: '/api/auth/yahoo', bodyKey: 'accessToken' },
];

const LoginPage = () => {
  const { user, login } = useAuth();
  const [whitelistError, setWhitelistError] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [showManualPicker, setShowManualPicker] = useState(false);

  useEffect(() => {
    if (user) {
      router.push(user.role === 'trainer' ? '/trainer-dashboard' : '/manager-dashboard');
    } else {
      setLoading(false);
    }
  }, [user, router]);

  // Whichever provider's callback just ran hands its token back here via
  // sessionStorage — verify it server-side and log in, same flow regardless
  // of which of the three providers it came from.
  const handleProviderToken = useCallback(async (backendPath, bodyKey, token) => {
    try {
      const response = await axios.post(`${BACKEND_URL}${backendPath}`, { [bodyKey]: token });
      login(response.data.user);
    } catch (error) {
      console.error('Login failed:', error);
      const message = error.response?.data?.message || 'Failed to verify sign-in. Please try again.';
      setWhitelistError(message);
    }
  }, [login]);

  useEffect(() => {
    for (const { storageKey, backendPath, bodyKey } of TOKEN_HANDLERS) {
      const token = sessionStorage.getItem(storageKey);
      if (token) {
        sessionStorage.removeItem(storageKey);
        handleProviderToken(backendPath, bodyKey, token);
        break;
      }
    }
  }, [handleProviderToken]);

  const handleContinue = async (e) => {
    e.preventDefault();
    setWhitelistError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setDetecting(true);
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/auth/detect-provider`, {
        params: { email: trimmedEmail },
      });
      if (data.provider === 'google') redirectToGoogle(trimmedEmail);
      else if (data.provider === 'microsoft') redirectToMicrosoft(trimmedEmail);
      else if (data.provider === 'yahoo') redirectToYahoo(trimmedEmail);
      else setShowManualPicker(true);
    } catch (error) {
      console.error('Provider detection failed:', error);
      setShowManualPicker(true);
    } finally {
      setDetecting(false);
    }
  };

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

      <Box component="form" onSubmit={handleContinue} sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          fullWidth
          required
        />
        <Button type="submit" variant="contained" size="large" disabled={detecting} fullWidth>
          {detecting ? <CircularProgress size={24} /> : 'Continue'}
        </Button>
      </Box>

      {showManualPicker && (
        <Box sx={{ minWidth: 300 }}>
          <Divider sx={{ my: 2 }}>Couldn&apos;t detect your provider — choose one</Divider>
          <Stack spacing={1.5}>
            <Button variant="outlined" startIcon={<GoogleIcon />} onClick={() => redirectToGoogle(email.trim())} fullWidth>
              Sign in with Google
            </Button>
            <Button variant="outlined" startIcon={<MicrosoftIcon />} onClick={() => redirectToMicrosoft(email.trim())} fullWidth>
              Sign in with Microsoft
            </Button>
            <Button variant="outlined" onClick={() => redirectToYahoo(email.trim())} fullWidth>
              Sign in with Yahoo
            </Button>
          </Stack>
        </Box>
      )}
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
