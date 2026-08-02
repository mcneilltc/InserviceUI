'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stack,
  FormControlLabel,
  Switch,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
} from '@mui/material';
import { Warning as WarningIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

interface AttendanceRow {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  badgeNumber: string | null;
  homeLocation: string;
  start: string;
  end: string;
  notes: string;
  attended: boolean;
}

async function fetchAttendance(onlyMissed: boolean): Promise<AttendanceRow[]> {
  const { data } = await axios.get(`${BACKEND_URL}/api/shifts/attendance`, {
    params: { onlyMissed: onlyMissed ? 'true' : 'false' },
  });
  return data;
}

export default function ShiftAttendancePage() {
  const [onlyMissed, setOnlyMissed] = useState(true);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['shift-attendance', onlyMissed],
    queryFn: () => fetchAttendance(onlyMissed),
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            Inservice Shift Attendance
          </Typography>
          <FormControlLabel
            control={<Switch checked={onlyMissed} onChange={(e) => setOnlyMissed(e.target.checked)} />}
            label="Only show missed shifts"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          When I Work shows who was scheduled for an inservice shift — it is never treated as proof they trained.
          This cross-references assigned inservice shifts against actual check-ins (via the training link or a manual add)
          so you can follow up on employees who were scheduled but never showed up.
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!!error && <Alert severity="error">Failed to load shift attendance.</Alert>}

        {!isLoading && !error && rows.length === 0 && (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            {onlyMissed
              ? 'No missed inservice shifts — every assigned shift so far has a matching check-in.'
              : 'No assigned inservice shifts have started yet.'}
          </Alert>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <Paper sx={{ borderRadius: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Badge</TableCell>
                    <TableCell>Home Location</TableCell>
                    <TableCell>Shift Start</TableCell>
                    <TableCell>Shift End</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.shiftId}>
                      <TableCell>{row.employeeName}</TableCell>
                      <TableCell>{row.badgeNumber || '—'}</TableCell>
                      <TableCell>{row.homeLocation || '—'}</TableCell>
                      <TableCell>{moment(row.start).format('MMM D, YYYY h:mm A')}</TableCell>
                      <TableCell>{moment(row.end).format('h:mm A')}</TableCell>
                      <TableCell>
                        {row.attended ? (
                          <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Checked In" />
                        ) : (
                          <Chip size="small" color="error" icon={<WarningIcon />} label="Missed" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </Container>
  );
}
