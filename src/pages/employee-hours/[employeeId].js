import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';

// Set up moment.js for react-big-calendar
const localizer = momentLocalizer(moment);

const EmployeeHours = () => {
  const router = useRouter();
  const { employeeId } = router.query;
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: null,
    endDate: null,
  });

  // Fetch training sessions when employeeId is available
  useEffect(() => {
    if (employeeId) {
      fetchSessions();
    }
  }, [employeeId]);

  // Apply filters when sessions or filters change
  useEffect(() => {
    applyFilters();
  }, [sessions, filters]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/training-sessions/employee/${employeeId}`);
      setSessions(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching training sessions:', error);
      setError('Failed to fetch training sessions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(session => session.status === filters.status);
    }

    // Apply date range filter
    if (filters.startDate) {
      filtered = filtered.filter(session => 
        moment(session.date).isSameOrAfter(filters.startDate, 'day')
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(session => 
        moment(session.date).isSameOrBefore(filters.endDate, 'day')
      );
    }

    setFilteredSessions(filtered);
  };

  // Calculate total training hours
  const calculateTotalHours = () => {
    return filteredSessions.reduce((total, session) => {
      const start = moment(`${session.date}T${session.startTime}`);
      const end = moment(`${session.date}T${session.endTime}`);
      return total + end.diff(start, 'hours', true);
    }, 0);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Topic', 'Start Time', 'End Time', 'Duration (hours)', 'Location', 'Trainer', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredSessions.map(session => {
        const start = moment(`${session.date}T${session.startTime}`);
        const end = moment(`${session.date}T${session.endTime}`);
        const duration = end.diff(start, 'hours', true);
        return [
          session.date,
          `"${session.topic}"`,
          session.startTime,
          session.endTime,
          duration,
          `"${session.location}"`,
          `"${session.trainer}"`,
          session.status
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `training_hours_${moment().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert training sessions to calendar events
  const events = filteredSessions.map((session) => ({
    id: session.id,
    title: session.topic,
    start: new Date(`${session.date}T${session.startTime}`),
    end: new Date(`${session.date}T${session.endTime}`),
    resource: session,
  }));

  // Custom event component
  const EventComponent = ({ event }) => {
    return (
      <Box
        sx={{
          padding: '2px 4px',
          backgroundColor: event.resource.status === 'completed' ? '#e8f5e9' : '#fff3e0',
          borderRadius: '4px',
          fontSize: '0.875rem',
        }}
      >
        <Typography variant="subtitle2">{event.title}</Typography>
        <Typography variant="caption" display="block">
          {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
        </Typography>
      </Box>
    );
  };

  // Handle event click
  const handleEventClick = (event) => {
    setSelectedSession(event.resource);
    setOpenDialog(true);
  };

  // Format time in calendar
  const formats = {
    timeGutterFormat: (date) => moment(date).format('h:mm A'),
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: 'all',
      startDate: null,
      endDate: null,
    });
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Training Hours Calendar
        </Typography>

        {/* Summary Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Summary</Typography>
                <Typography variant="body1">
                  Total Training Hours: {calculateTotalHours().toFixed(1)} hours
                </Typography>
                <Typography variant="body1">
                  Total Sessions: {filteredSessions.length}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
                <Button
                  variant="contained"
                  startIcon={<FileDownloadIcon />}
                  onClick={exportToCSV}
                >
                  Export to CSV
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h6">Filters</Typography>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={resetFilters}
                disabled={filters.status === 'all' && !filters.startDate && !filters.endDate}
              >
                Reset Filters
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(newValue) => setFilters({ ...filters, startDate: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(newValue) => setFilters({ ...filters, endDate: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>

        {/* Calendar */}
        <Box sx={{ height: 'calc(100vh - 450px)', mt: 2 }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            components={{
              event: EventComponent,
            }}
            formats={formats}
            onSelectEvent={handleEventClick}
            views={['month', 'week', 'day']}
            defaultView="month"
            tooltipAccessor={(event) => `${event.title} (${moment(event.start).format('h:mm A')} - ${moment(event.end).format('h:mm A')})`}
          />
        </Box>
      </Paper>

      {/* Session Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        {selectedSession && (
          <>
            <DialogTitle>Training Session Details</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Topic:</strong> {selectedSession.topic}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Date:</strong> {moment(selectedSession.date).format('MMMM D, YYYY')}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Time:</strong> {selectedSession.startTime} - {selectedSession.endTime}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Location:</strong> {selectedSession.location}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Trainer:</strong> {selectedSession.trainer}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Status:</strong>{' '}
                  <span style={{ textTransform: 'capitalize' }}>{selectedSession.status}</span>
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default EmployeeHours; 