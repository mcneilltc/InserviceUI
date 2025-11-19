'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../components/AuthContext';

const MicrosoftAuth = ({ onLogin }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { login } = useAuth();

  useEffect(() => {
    // Check if user is already signed in
    const checkAuth = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('microsoft_user'));
        if (storedUser) {
          setUser(storedUser);
          setIsSignedIn(true);
        }
      } catch (error) {
        console.error('Error checking Microsoft auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      // Redirect to Microsoft OAuth
      const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
      const redirectUri = `${window.location.origin}/api/microsoft-callback`;
      const scope = 'openid profile email';
      const responseType = 'code';
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=${responseType}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_mode=query&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=12345`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Microsoft Sign-In failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('microsoft_user');
      setUser(null);
      setIsSignedIn(false);
    } catch (error) {
      console.error('Microsoft Sign-Out failed:', error);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      {isSignedIn ? (
        <div>
          <p>Welcome, {user?.name}</p>
          <Button variant="contained" color="secondary" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      ) : (
        <Button variant="contained" color="primary" onClick={handleSignIn}>
          Sign In with Microsoft
        </Button>
      )}
    </div>
  );
};

export default MicrosoftAuth;

