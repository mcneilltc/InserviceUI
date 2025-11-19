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
      router.push('/manager-dashboard');
    } else {
      setLoading(false);
    }
  }, [user, router]);

  const checkWhitelistAndLogin = useCallback(async (userData) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/admin/check-whitelist`, {
        email: userData.email
      });
      
      if (response.data.isWhitelisted) {
        login(userData);
        router.push('/manager-dashboard');
      } else {
        setWhitelistError('Your email is not authorized to access this application. Please contact an administrator.');
      }
    } catch (error) {
      console.error('Error checking whitelist:', error);
      setWhitelistError('Failed to verify access. Please try again.');
    }
  }, [login, router]);

  useEffect(() => {
    // Handle Microsoft callback
    const microsoftUser = searchParams?.get('microsoft_user');
    if (microsoftUser) {
      try {
        const userData = JSON.parse(decodeURIComponent(microsoftUser));
        checkWhitelistAndLogin(userData);
      } catch (error) {
        console.error('Error parsing Microsoft user data:', error);
        setWhitelistError('Failed to process login');
      }
    }
  }, [searchParams, checkWhitelistAndLogin]);

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
        <MicrosoftAuth onLogin={checkWhitelistAndLogin} />
        <Divider>OR</Divider>
        <GoogleAuth onLogin={checkWhitelistAndLogin} />
      </Box>
    </Box>
  );
};

export default LoginPage;