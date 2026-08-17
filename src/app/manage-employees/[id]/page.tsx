'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Container, Box, Button, Typography, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import EmployeeComplianceView, { EmployeeSelfData, Session } from '../../../components/EmployeeComplianceView';
import { useAuth } from '../../../components/AuthContext';
import { rolesAtLeast } from '../../../lib/roles';

// Note: `sessions` reflects the current calendar month only, matching the employee
// self-service view's contract (EmployeeComplianceView). Full session history could use
// GET /api/training-sessions/employee/:id in a future iteration, but that endpoint's
// response shape (no `hours`, no resolved trainer names) doesn't match this component today.
export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState<EmployeeSelfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editHours, setEditHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

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

  // UI-level gate only — the endpoint itself checks this live against
  // Firestore (see hasManualHoursPermission in trainingSessionsController.ts),
  // so a stale/incorrect role here just means the button is missing, never a
  // real permission bypass.
  const canEditSessions = !!user?.role && rolesAtLeast('seniorSupervisor').includes(user.role);

  const handleOpenEdit = (session: Session) => {
    setEditingSession(session);
    setEditHours(String(session.hours));
    setEditError('');
  };

  const handleCloseEdit = () => {
    setEditingSession(null);
    setEditHours('');
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingSession || !id) return;
    const parsed = parseFloat(editHours);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setEditError('Enter a non-negative number of hours.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      await axios.patch(`/api/training-sessions/${id}/${editingSession.id}`, { length: parsed });
      handleCloseEdit();
      setSnackbar({ open: true, message: 'Hours updated.', severity: 'success' });
      await fetchDetail();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update hours.';
      setEditError(message);
    } finally {
      setSaving(false);
    }
  };

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
      <EmployeeComplianceView
        employee={employee}
        compliance={compliance}
        sessions={sessions}
        incentive={incentive}
        onEditSessionHours={canEditSessions ? handleOpenEdit : undefined}
      />

      <Dialog open={!!editingSession} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
        <DialogTitle>Correct Session Hours</DialogTitle>
        <DialogContent>
          {editingSession && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {(editingSession.topics || []).join(', ')} — {editingSession.date}
            </Typography>
          )}
          <TextField
            autoFocus
            fullWidth
            type="number"
            label="Hours"
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            inputProps={{ step: 0.1, min: 0 }}
          />
          {editError && <Alert severity="error" sx={{ mt: 2 }}>{editError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
