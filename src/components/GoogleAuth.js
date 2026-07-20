'use client';

import React, { useEffect, useState } from 'react';
import { Button, Alert } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../components/AuthContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

const GoogleAuth = ({ onLogin }) => {
  const [authError, setAuthError] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { login } = useAuth();

  useEffect(() => {
    const loadGoogleScript = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/platform.js';
      script.async = true;
      script.defer = true;
      script.onload = initializeGapi;
      script.onerror = () => { // Add error handling
        console.error('Failed to load Google API script.');
        setLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeGapi = () => {
      if (!window.gapi) {
        console.error('Google API script not loaded correctly.');
        setLoading(false);
        return;
      }

      window.gapi.load('auth2', () => {
        console.log('auth2 module loaded.');
        try {
          const auth2 = window.gapi.auth2.init({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          });

          auth2.isSignedIn.listen(setIsSignedIn);
          setIsSignedIn(auth2.isSignedIn.get());

          if (auth2.isSignedIn.get()) {
            const profile = auth2.currentUser.get().getBasicProfile();
            setUser({
              name: profile.getName(),
              email: profile.getEmail(),
            });
          }

          setLoading(false);
        } catch (error) {
          console.error('Error initializing auth2:', error);
          setLoading(false);
        }
      });
    };

    // Call loadGoogleScript directly when the component mounts
    loadGoogleScript();

    return () => {
      // Cleanup if needed (e.g., remove event listeners)
      const script = document.querySelector('script[src="https://apis.google.com/js/platform.js"]');
      if (script && script.removeEventListener) {
        script.removeEventListener('load', initializeGapi);
        script.removeEventListener('error', () => {}); // Remove error listener as well
      }
    };
  }, []);

  const handleSignIn = async () => {
    if (!window.gapi || !window.gapi.auth2) {
      console.error('Google API is not initialized.');
      return;
    }

    setAuthError('');
    const auth2 = window.gapi.auth2.getAuthInstance();
    try {
      const googleUser = await auth2.signIn();
      const idToken = googleUser.getAuthResponse().id_token;

      // The backend verifies this token server-side and, only if the verified
      // email is authorized, issues the real session cookie. Nothing here is
      // trusted client-side — the resolved user/role comes back from that call.
      const response = await axios.post(`${BACKEND_URL}/api/auth/google`, { idToken });
      const userData = response.data.user;

      setUser(userData);
      setIsSignedIn(true);

      if (onLogin) {
        onLogin(userData);
      } else {
        login(userData);
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      const message = error.response?.data?.message || 'Google Sign-In failed. Please try again.';
      setAuthError(message);
      setIsSignedIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!window.gapi || !window.gapi.auth2) {
      console.error('Google API is not initialized.');
      return;
    }

    const auth2 = window.gapi.auth2.getAuthInstance();
    try {
      await auth2.signOut();
      setUser(null);
      setIsSignedIn(false);
    } catch (error) {
      console.error('Google Sign-Out failed:', error);
    }
  };

  if (loading) {
    return <p>Loading Google API...</p>;
  }

  return (
    <div>
      {authError && <Alert severity="error" sx={{ mb: 1 }}>{authError}</Alert>}
      {isSignedIn ? (
        <div>
          <p>Welcome, {user?.name}</p>
          <Button variant="contained" color="secondary" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      ) : (
        <Button variant="contained" color="primary" onClick={handleSignIn}>
          Sign In with Google
        </Button>
      )}
    </div>
  );
};

export default GoogleAuth;