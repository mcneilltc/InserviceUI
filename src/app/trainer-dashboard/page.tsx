'use client';

import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import axios from 'axios';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../components/AuthContext';

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in-progress':
      return 'primary';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const TrainerDashboard = () => {
  const { user } = useAuth();

  const { data: trainer } = useQuery({
    queryKey: ['employee', user?.employeeId],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/employees/${user.employeeId}`);
      return data;
    },
    enabled: !!user?.employeeId,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sessions`);
      return data;
    },
  });

  const mySessions = (sessions as any[])
    .filter((session) => {
      const trainerIds = Array.isArray(session.trainer)
        ? session.trainer
        : session.trainer
        ? [session.trainer]
        : [];
      return trainerIds.includes(user?.employeeId);
    })
    .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());

  const completedCount = mySessions.filter((s) => s.status === 'completed').length;
  const scheduledCount = mySessions.filter((s) => s.status === 'scheduled').length;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Trainer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Hi {user?.name || trainer?.name}
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccessTimeIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Total Hours Led
                  </Typography>
                </Box>
                <Typography variant="h4">{trainer?.totalHoursLed ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body2" color="text.secondary">
                    Sessions Completed
                  </Typography>
                </Box>
                <Typography variant="h4">{completedCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <EventIcon color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Upcoming Sessions
                  </Typography>
                </Box>
                <Typography variant="h4">{scheduledCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button component={Link} href="/add-training" variant="contained" startIcon={<AddIcon />}>
            Add Training
          </Button>
          <Button component={Link} href="/upload-inservice" variant="outlined" startIcon={<CloudUploadIcon />}>
            Upload Sheet
          </Button>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            My Training Sessions
          </Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : mySessions.length === 0 ? (
            <Typography color="text.secondary">No training sessions yet.</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Topics</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Trainees</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mySessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.date}</TableCell>
                      <TableCell>{session.location}</TableCell>
                      <TableCell>
                        {(session.topics || (session.topic ? [session.topic] : [])).join(', ')}
                      </TableCell>
                      <TableCell>
                        <Chip label={session.status} color={getStatusColor(session.status) as any} size="small" />
                      </TableCell>
                      <TableCell align="right">{session.trainees?.length || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default TrainerDashboard;
