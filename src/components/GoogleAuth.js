'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Alert } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../components/AuthContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

// Google's legacy Sign-In library (gapi.auth2) is dead — Google shut down its
// backend years ago, so its signIn() call fails silently with no popup. This
// uses Google Identity Services (GIS), the current supported replacement,
// via its ID-token button flow. GIS hands back the same kind of ID token
// POST /api/auth/google already verifies server-side, so no backend change
// was needed for this migration.
const GoogleAuth = ({ onLogin }) => {
  const buttonContainerRef = useRef(null);
  // Guards against React Strict Mode's dev-only double-invocation of effects —
  // without this, initialize()/renderButton() would run twice on the same
  // container, and Google's injected DOM would conflict with React's when it
  // tries to reconcile, throwing "removeChild ... not a child of this node".
  const initializedRef = useRef(false);
  const { login } = useAuth();
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCredentialResponse = async (response) => {
      setAuthError('');
      try {
        const idToken = response.credential;
        // The backend verifies this token server-side and, only if the verified
        // email is authorized, issues the real session cookie. Nothing here is
        // trusted client-side — the resolved user/role comes back from that call.
        const apiResponse = await axios.post(`${BACKEND_URL}/api/auth/google`, { idToken });
        const userData = apiResponse.data.user;

        if (onLogin) {
          onLogin(userData);
        } else {
          login(userData);
        }
      } catch (error) {
        console.error('Google Sign-In failed:', error);
        const message = error.response?.data?.message || 'Google Sign-In failed. Please try again.';
        setAuthError(message);
      }
    };

    const initializeGis = () => {
      if (initializedRef.current) return;

      if (!window.google?.accounts?.id) {
        console.error('Google Identity Services script not loaded correctly.');
        setLoading(false);
        return;
      }

      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      if (buttonContainerRef.current) {
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: 'filled_blue',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
        });
      }

      setLoading(false);
    };

    if (window.google?.accounts?.id) {
      initializeGis();
      return;
    }

    const existingScript = document.querySelector(`script[src="${GSI_SCRIPT_SRC}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', initializeGis);
      return () => existingScript.removeEventListener('load', initializeGis);
    }

    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initializeGis;
    script.onerror = () => {
      console.error('Failed to load Google Identity Services script.');
      setLoading(false);
    };
    document.body.appendChild(script);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {authError && <Alert severity="error" sx={{ mb: 1 }}>{authError}</Alert>}
      {/* This container is handed off to Google's script, which injects its
          own DOM (an iframe) into it directly — it must never have React-
          managed children, or React's reconciler and Google's DOM mutations
          will conflict and throw on cleanup/re-render. */}
      {loading && <p>Loading Google Sign-In...</p>}
      <div ref={buttonContainerRef} />
    </div>
  );
};

export default GoogleAuth;
