'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GoogleAuth from './GoogleAuth';
import { CircularProgress, Box, Typography } from '@mui/material';

const AuthGuard = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      if (!window.gapi || !window.gapi.auth2) {
        console.error('Google API is not initialized.');
        setLoading(false);
        return;
      }

      const auth2 = window.gapi.auth2.getAuthInstance();
      const signedIn = auth2.isSignedIn.get();
      setIsSignedIn(signedIn);

      if (signedIn) {
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    // Wait for the Google API to load
    const script = document.querySelector('script[src="https://apis.google.com/js/platform.js"]');
    if (script) {
      script.addEventListener('load', checkAuth);
    } else {
      console.error('Google API script not found.');
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isSignedIn) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Please sign in to access the application.
        </Typography>
        <GoogleAuth />
      </Box>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;