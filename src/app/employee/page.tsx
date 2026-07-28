'use client';

import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  CircularProgress, Alert, Divider, Stack, InputAdornment,
} from '@mui/material';
import {
  Badge as BadgeIcon,
  Person as PersonIcon,
  Login as LoginIcon,
  FactCheck as FactCheckIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '../../components/BrandLogo';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

type View = 'landing' | 'lookup';

export default function EmployeePortal() {
  const [view, setView] = useState<View>('landing');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim() || !badgeNumber.trim()) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/employee/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          badgeNumber: badgeNumber.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || data?.message || 'Lookup failed. Please check your information.');
        setLoading(false);
        return;
      }
      try {
        sessionStorage.setItem('employeeSelfData', JSON.stringify(data));
        // Persisted separately (and longer-lived) so the dashboard can
        // silently re-fetch fresh data after the tab closes, instead of
        // just dead-ending once the sessionStorage snapshot is gone.
        localStorage.setItem('employeeLookupCredentials', JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          badgeNumber: badgeNumber.trim(),
        }));
      } catch (_) {}
      router.push('/employee/dashboard');
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Landing view ─────────────────────────────── */
  if (view === 'landing') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #06102C 0%, #0B1B45 55%, #06102C 100%)',
          p: 2,
        }}
      >
        <BrandLogo variant="stacked" iconSize={80} fontSize={32} forceLight sx={{ mb: 1 }} />
        <Typography variant="subtitle1" color="rgba(255,255,255,0.75)" sx={{ mb: 5 }}>
          Inservice Training Portal
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          sx={{ width: '100%', maxWidth: 560 }}
        >
          {/* Manager Login */}
          <Card
            component={Link}
            href="/login"
            sx={{
              flex: 1,
              textDecoration: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: 8 },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Manager Login
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to manage employees, sessions, and compliance reports
              </Typography>
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{ mt: 2 }}
                tabIndex={-1}
              >
                Log In
              </Button>
            </CardContent>
          </Card>

          {/* Employee Check */}
          <Card
            onClick={() => setView('lookup')}
            sx={{
              flex: 1,
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: 8 },
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <FactCheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Check Your Inservice
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View your hours, compliance status, and this month&apos;s sessions
              </Typography>
              <Button
                variant="contained"
                color="success"
                endIcon={<ArrowForwardIcon />}
                sx={{ mt: 2 }}
                tabIndex={-1}
              >
                Check Hours
              </Button>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    );
  }

  /* ── Lookup form view ─────────────────────────── */
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%)',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440, borderRadius: 3, boxShadow: 12 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <FactCheckIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>
              Check Your Inservice Hours
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Enter your details to view your compliance status
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box component="form" onSubmit={handleLookup} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="First Name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                fullWidth
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Last Name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Badge Number"
                value={badgeNumber}
                onChange={e => setBadgeNumber(e.target.value)}
                fullWidth
                inputProps={{ inputMode: 'numeric' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              {error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 'bold' }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'View My Hours'}
              </Button>

              <Button
                variant="text"
                color="inherit"
                onClick={() => { setView('landing'); setError(''); }}
                sx={{ color: 'text.secondary' }}
              >
                ← Back
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
