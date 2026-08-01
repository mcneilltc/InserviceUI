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
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tooltip,
  Chip,
  Snackbar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

interface Tier {
  id: string;
  streakLength: number;
  rewardLabel: string;
}

interface EmployeeStatus {
  employeeId: string;
  name: string;
  homeLocation: string;
  hoursByThe15th: number;
  hoursNeeded: number;
  qualifiedThisMonth: boolean | undefined;
  deadlinePassed: boolean;
  currentStreak: number;
  currentTier: Tier | null;
  nextTier: Tier | null;
  monthsUntilNextTier: number | null;
  annual: {
    year: number;
    monthsQualified: number;
    monthsDecided: number;
    months: { year: number; month: number; hours: number; qualified: boolean | undefined }[];
  };
}

interface StatusResponse {
  asOfMonth: string;
  employees: EmployeeStatus[];
  qualifiedCount: number;
  totalCount: number;
}

export default function ManageIncentivesPage() {
  const queryClient = useQueryClient();
  const [asOfMonth, setAsOfMonth] = useState(moment().format('YYYY-MM'));

  const [newStreakLength, setNewStreakLength] = useState('');
  const [newRewardLabel, setNewRewardLabel] = useState('');
  const [editTier, setEditTier] = useState<string | null>(null);
  const [editStreakLength, setEditStreakLength] = useState('');
  const [editRewardLabel, setEditRewardLabel] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const { data: tiers = [] } = useQuery<Tier[]>({
    queryKey: ['incentive-tiers'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/incentives/tiers`);
      return (data as Tier[]).sort((a, b) => a.streakLength - b.streakLength);
    },
  });

  const { data: status, isLoading: statusLoading, error: statusError } = useQuery<StatusResponse>({
    queryKey: ['incentive-status', asOfMonth],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/incentives/status`, { params: { asOf: asOfMonth } });
      return data;
    },
  });

  const handleError = (err: any, defaultMessage: string) => {
    console.error(err);
    setSnackbar({ open: true, message: err.response?.data?.error?.message || defaultMessage, severity: 'error' });
  };

  const createMutation = useMutation({
    mutationFn: (tier: { streakLength: number; rewardLabel: string }) =>
      axios.post(`${BACKEND_URL}/api/incentives/tiers`, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['incentive-status'] });
      setNewStreakLength('');
      setNewRewardLabel('');
      setSnackbar({ open: true, message: 'Tier added', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to add tier'),
  });

  const updateMutation = useMutation({
    mutationFn: (tier: { id: string; streakLength: number; rewardLabel: string }) =>
      axios.put(`${BACKEND_URL}/api/incentives/tiers/${tier.id}`, { streakLength: tier.streakLength, rewardLabel: tier.rewardLabel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['incentive-status'] });
      setEditTier(null);
      setSnackbar({ open: true, message: 'Tier updated', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to update tier'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BACKEND_URL}/api/incentives/tiers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['incentive-status'] });
      setSnackbar({ open: true, message: 'Tier deleted', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to delete tier'),
  });

  const handleAddTier = () => {
    const streakLength = parseInt(newStreakLength, 10);
    if (!streakLength || streakLength < 1 || !newRewardLabel.trim()) {
      setSnackbar({ open: true, message: 'Enter a streak length (months) and a reward.', severity: 'error' });
      return;
    }
    createMutation.mutate({ streakLength, rewardLabel: newRewardLabel.trim() });
  };

  const startEditing = (tier: Tier) => {
    setEditTier(tier.id);
    setEditStreakLength(String(tier.streakLength));
    setEditRewardLabel(tier.rewardLabel);
  };

  const handleSaveEdit = (id: string) => {
    const streakLength = parseInt(editStreakLength, 10);
    if (!streakLength || streakLength < 1 || !editRewardLabel.trim()) {
      setSnackbar({ open: true, message: 'Enter a streak length (months) and a reward.', severity: 'error' });
      return;
    }
    updateMutation.mutate({ id, streakLength, rewardLabel: editRewardLabel.trim() });
  };

  const monthGrid = status?.employees[0]?.annual.months || [];

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Incentive Program
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Lifeguards who record all 4 hours of inservice before the 15th of the month qualify for that
          month&apos;s incentive. The reward grows the longer their streak of consecutive qualifying months runs —
          set the reward tiers below.
        </Typography>

        {/* Reward tiers */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Reward Tiers
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Streak Length (months)"
              type="number"
              value={newStreakLength}
              onChange={(e) => setNewStreakLength(e.target.value)}
              inputProps={{ min: 1 }}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="Reward"
              value={newRewardLabel}
              onChange={(e) => setNewRewardLabel(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={handleAddTier} sx={{ minWidth: 120 }}>
              Add Tier
            </Button>
          </Stack>

          <List>
            {tiers.map((tier) => (
              <ListItem key={tier.id} divider>
                {editTier === tier.id ? (
                  <ListItemText
                    primary={
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                        <TextField
                          label="Streak Length (months)"
                          type="number"
                          size="small"
                          value={editStreakLength}
                          onChange={(e) => setEditStreakLength(e.target.value)}
                          sx={{ minWidth: 180 }}
                        />
                        <TextField
                          label="Reward"
                          size="small"
                          value={editRewardLabel}
                          onChange={(e) => setEditRewardLabel(e.target.value)}
                          fullWidth
                        />
                        <Button size="small" variant="contained" onClick={() => handleSaveEdit(tier.id)}>
                          Save
                        </Button>
                      </Stack>
                    }
                  />
                ) : (
                  <ListItemText
                    primary={`${tier.streakLength}-month streak`}
                    secondary={tier.rewardLabel}
                  />
                )}
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => (editTier === tier.id ? setEditTier(null) : startEditing(tier))}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" color="error" onClick={() => deleteMutation.mutate(tier.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {tiers.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                No reward tiers set yet — add one above (e.g. a 1-month streak for a first-time reward).
              </Typography>
            )}
          </List>
        </Paper>

        {/* Monthly + annual tracking */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">
              {moment(asOfMonth, 'YYYY-MM').format('MMMM YYYY')} Tracking
            </Typography>
            <TextField
              label="Month"
              type="month"
              value={asOfMonth}
              onChange={(e) => setAsOfMonth(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
          </Stack>

          {statusLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : statusError ? (
            <Alert severity="error">Failed to load incentive tracking.</Alert>
          ) : (
            <>
              <Chip
                sx={{ mb: 2 }}
                color={(status?.qualifiedCount || 0) > 0 ? 'success' : 'default'}
                label={`${status?.qualifiedCount || 0} of ${status?.totalCount || 0} employees qualified`}
              />
              <TableContainer sx={{ mb: 4 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Home Site</TableCell>
                      <TableCell>Hours by 15th</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Streak</TableCell>
                      <TableCell>Current Reward</TableCell>
                      <TableCell>Next Reward</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(status?.employees || []).map((e) => (
                      <TableRow key={e.employeeId}>
                        <TableCell>{e.name}</TableCell>
                        <TableCell>{e.homeLocation}</TableCell>
                        <TableCell>{e.hoursByThe15th} / 4</TableCell>
                        <TableCell>
                          {e.qualifiedThisMonth === true ? (
                            <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Qualified" />
                          ) : e.qualifiedThisMonth === false ? (
                            <Chip size="small" color="error" icon={<CancelIcon />} label="Missed" />
                          ) : (
                            <Chip size="small" color="warning" label="In Progress" />
                          )}
                        </TableCell>
                        <TableCell>{e.currentStreak}</TableCell>
                        <TableCell>{e.currentTier?.rewardLabel || '—'}</TableCell>
                        <TableCell>
                          {e.nextTier ? `${e.nextTier.rewardLabel} (${e.monthsUntilNextTier} mo. away)` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="h6" gutterBottom>
                {status?.employees[0]?.annual.year || moment().year()} Annual Progress
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Home Site</TableCell>
                      {monthGrid.map((m) => (
                        <TableCell key={m.month} align="center">{moment().month(m.month - 1).format('MMM')}</TableCell>
                      ))}
                      <TableCell align="center">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(status?.employees || []).map((e) => (
                      <TableRow key={e.employeeId}>
                        <TableCell>{e.name}</TableCell>
                        <TableCell>{e.homeLocation}</TableCell>
                        {e.annual.months.map((m) => (
                          <TableCell key={m.month} align="center">
                            {m.qualified === undefined ? (
                              <Tooltip title="Still in progress">
                                <RemoveIcon fontSize="small" color="disabled" />
                              </Tooltip>
                            ) : m.qualified ? (
                              <CheckCircleIcon fontSize="small" color="success" />
                            ) : (
                              <CancelIcon fontSize="small" color="error" />
                            )}
                          </TableCell>
                        ))}
                        <TableCell align="center">
                          <Chip size="small" label={`${e.annual.monthsQualified}/${e.annual.monthsDecided}`} color={e.annual.monthsQualified > 0 ? 'success' : 'default'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}
