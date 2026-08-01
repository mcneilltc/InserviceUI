'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import EmployeeComplianceView, { EmployeeSelfData } from '../../../components/EmployeeComplianceView';

// Note: `sessions` reflects the current calendar month only, matching the employee
// self-service view's contract (EmployeeComplianceView). Full session history could use
// GET /api/training-sessions/employee/:id in a future iteration, but that endpoint's
// response shape (no `hours`, no resolved trainer names) doesn't match this component today.
export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [data, setData] = useState<EmployeeSelfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await axios.get(`/api/employees/${id}/detail`);
      setData(res.data);
    } catch (err: any) {
      setErrorStatus(err.response?.status || 0);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const backButton = (
    <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/manage-employees')}>
      Back to Employees
    </Button>
  );

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (errorStatus === 404) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        {backButton}
        <Alert severity="error" sx={{ mt: 2 }}>Employee not found.</Alert>
      </Container>
    );
  }

  if (errorStatus === 403) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        {backButton}
        <Alert severity="error" sx={{ mt: 2 }}>You don&apos;t have permission to view this employee.</Alert>
      </Container>
    );
  }

  if (errorStatus !== null || !data) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        {backButton}
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          action={<Button color="inherit" size="small" onClick={fetchDetail}>Retry</Button>}
        >
          Failed to load employee details.
        </Alert>
      </Container>
    );
  }

  const { employee, compliance, sessions, incentive } = data;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {backButton}
      <Typography variant="h4" sx={{ my: 2 }}>
        {employee.firstName} {employee.lastName}
      </Typography>
      <EmployeeComplianceView employee={employee} compliance={compliance} sessions={sessions} incentive={incentive} />
    </Container>
  );
}
