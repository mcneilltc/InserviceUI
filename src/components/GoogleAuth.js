'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@mui/material';
import axios from 'axios';

const GoogleAuth = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

    const auth2 = window.gapi.auth2.getAuthInstance();
    try {
      const googleUser = await auth2.signIn();
      const idToken = googleUser.getAuthResponse().id_token; // Get the ID token
      const profile = googleUser.getBasicProfile();

      // Send the ID token to the backend for verification
      const response = await axios.post('/api/google-signin', { idToken });
      console.log('Backend response:', response.data);

      setUser({
        name: profile.getName(),
        email: profile.getEmail(),
      });
      setIsSignedIn(true);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
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
      await auth2.disconnect();
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