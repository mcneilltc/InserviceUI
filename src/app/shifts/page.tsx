'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import moment from 'moment';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';
const localizer = momentLocalizer(moment);

type Shift = {
  id: string;
  start: string;
  end: string;
  notes?: string;
  siteId?: string | null;
};

async function fetchShifts(): Promise<Shift[]> {
  const { data } = await axios.get(`${BACKEND_URL}/api/shifts`);
  return data;
}

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [snackbar, setSnackbar] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  const { data: shifts = [], isLoading } = useQuery({ queryKey: ['shifts'], queryFn: fetchShifts });

  const pickupMutation = useMutation({
    mutationFn: (shiftId: string) => axios.post(`${BACKEND_URL}/api/shifts/${shiftId}/pickup`),
    onSuccess: () => {
      setSnackbar({ severity: 'success', message: 'Shift picked up!' });
      setSelectedShift(null);
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (error: any) => {
      setSnackbar({ severity: 'error', message: error.response?.data?.message || 'Could not pick up this shift.' });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const events = useMemo(
    () =>
      shifts.map((shift) => ({
        ...shift,
        title: shift.notes || 'Inservice Shift',
        start: new Date(shift.start),
        end: new Date(shift.end),
      })),
    [shifts]
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Available Shifts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Open inservice shifts you can pick up. Click a shift for details.
      </Typography>

      <Paper sx={{ p: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 'calc(100vh - 320px)' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={['month', 'week', 'day']}
              defaultView="week"
              onSelectEvent={(event: any) => setSelectedShift(event)}
            />
          </Box>
        )}
      </Paper>

      <Dialog open={!!selectedShift} onClose={() => setSelectedShift(null)} maxWidth="sm" fullWidth>
        {selectedShift && (
          <>
            <DialogTitle>{selectedShift.notes || 'Inservice Shift'}</DialogTitle>
            <DialogContent>
              <Typography variant="body1">
                {moment(selectedShift.start).format('dddd, MMMM D, YYYY')}
              </Typography>
              <Typography variant="body1">
                {moment(selectedShift.start).format('h:mm A')} – {moment(selectedShift.end).format('h:mm A')}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedShift(null)}>Cancel</Button>
              <Button
                variant="contained"
                color="secondary"
                disabled={pickupMutation.isPending}
                onClick={() => pickupMutation.mutate(selectedShift.id)}
              >
                {pickupMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Pick Up This Shift'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
