'use client';

import React, { useEffect, useState } from 'react';
import {
  Box, Card, Typography, Button,
  CircularProgress,
} from '@mui/material';
import {
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import EmployeeComplianceView, { EmployeeSelfData } from '../../../components/EmployeeComplianceView';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

export default function EmployeeDashboard() {
  const [data, setData] = useState<EmployeeSelfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchFailed, setRefetchFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const refetch = async () => {
      let credentials: { firstName: string; lastName: string; badgeNumber: string } | null = null;
      try {
        const raw = localStorage.getItem('employeeLookupCredentials');
        if (raw) credentials = JSON.parse(raw);
      } catch (_) {}

      if (!credentials) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/employee/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        const fresh = await res.json();
        if (!res.ok) throw new Error('lookup failed');
        if (cancelled) return;
        setData(fresh);
        try { sessionStorage.setItem('employeeSelfData', JSON.stringify(fresh)); } catch (_) {}
      } catch (_) {
        if (!cancelled) setRefetchFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // The sessionStorage snapshot only survives this tab session — prefer it
    // when present (no network round-trip), but transparently re-fetch with
    // the remembered credentials instead of dead-ending once it's gone.
    try {
      const raw = sessionStorage.getItem('employeeSelfData');
      if (raw) {
        setData(JSON.parse(raw));
        setLoading(false);
        return;
      }
    } catch (_) {}

    refetch();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #06102C 0%, #0B1B45 55%, #06102C 100%)',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #06102C 0%, #0B1B45 55%, #06102C 100%)',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%', borderRadius: 3, textAlign: 'center', p: 4 }}>
          <ErrorIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>{refetchFailed ? 'Could Not Load Your Hours' : 'Session Expired'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please look up your hours again.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/employee')}
          >
            Go Back
          </Button>
        </Card>
      </Box>
    );
  }

  const { employee, compliance, sessions, incentive } = data;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #06102C 0%, #0B1B45 55%, #06102C 100%)',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/employee')}
            sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            Back
          </Button>
          <Typography variant="h6" color="white" sx={{ ml: 'auto', opacity: 0.85 }}>
            {compliance.month}
          </Typography>
        </Box>

        <EmployeeComplianceView employee={employee} compliance={compliance} sessions={sessions} incentive={incentive} />

      </Box>
    </Box>
  );
}
