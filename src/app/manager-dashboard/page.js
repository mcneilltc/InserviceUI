'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import axios from 'axios';
import moment from 'moment';
import { Download as DownloadIcon } from '@mui/icons-material';
import EmployeeHoursTracker from '../../components/EmployeeHoursTracker';
import { useAuth } from '../../components/AuthContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  
  // Filter states
  const [workSite, setWorkSite] = useState('all');
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(moment().startOf('month'));
  const [endDate, setEndDate] = useState(moment().endOf('month'));
  const [showEmployeesNeedingTraining, setShowEmployeesNeedingTraining] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [checkInLocationFilter, setCheckInLocationFilter] = useState('all');

  const workSites = ['all', 'MCAC', 'Cordelia', 'Double Oaks', 'Ramsey Creek Beach'];

  useEffect(() => {
    fetchEmployees();
    fetchStats();
    fetchCheckIns();
    fetchCompletedSessions();
  }, [workSite, period, startDate, endDate, checkInLocationFilter]);

  const fetchCompletedSessions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/sessions`);
      let completed = response.data.filter(s => s.status === 'completed');
      
      // Filter by workSite if specified
      if (workSite !== 'all') {
        completed = completed.filter(s => s.location === workSite);
      }
      
      setCompletedSessions(completed);
    } catch (error) {
      console.error('Error fetching completed sessions:', error);
      setCompletedSessions([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = {
        period: period !== 'custom' ? period : undefined,
        startDate: period === 'custom' ? startDate.toISOString() : undefined,
        endDate: period === 'custom' ? endDate.toISOString() : undefined,
        workSite: workSite !== 'all' ? workSite : undefined,
      };

      const response = await axios.get(`${BACKEND_URL}/api/dashboard/stats`, { params });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckIns = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/checkin`);
      let checkInsData = response.data || [];
      
      // Filter by location if specified
      if (checkInLocationFilter !== 'all') {
        checkInsData = checkInsData.filter(checkIn => 
          checkIn.location === checkInLocationFilter
        );
      }
      
      setCheckIns(checkInsData);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      setCheckIns([]);
    }
  };

  const handleDateChange = (newValue, setter) => {
    if (newValue && moment.isMoment(newValue)) {
      setter(newValue);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const params = {
        workSite: workSite !== 'all' ? workSite : undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const response = await axios.get(`${BACKEND_URL}/api/reports`, { params });
      const reportData = response.data;

      // Convert to CSV
      const headers = ['Name', 'Email', 'Phone', 'Work Site', 'Check-in Time', 'Training Hours Completed'];
      const csvContent = [
        headers.join(','),
        ...reportData.map(row => [
          `"${row.name || ''}"`,
          `"${row.email || ''}"`,
          `"${row.phone || ''}"`,
          `"${row.workSite || ''}"`,
          `"${row.checkinTime || ''}"`,
          row.trainingHoursCompleted || 0
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `training_report_${moment().format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Manager Dashboard
            </Typography>
            {user && (
              <Typography variant="h6" color="text.secondary">
                Hi {user.name || user.email}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadReport}
          >
            Download Report
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Work Site</InputLabel>
              <Select
                value={workSite}
                label="Work Site"
                onChange={(e) => setWorkSite(e.target.value)}
              >
                {workSites.map((site) => (
                  <MenuItem key={site} value={site}>
                    {site === 'all' ? 'All Sites' : site}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Period</InputLabel>
              <Select
                value={period}
                label="Period"
                onChange={(e) => setPeriod(e.target.value)}
              >
                {/* <MenuItem value="day">Day</MenuItem>
                <MenuItem value="week">Week</MenuItem>
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="year">Year</MenuItem> */}
                <MenuItem value="custom">Select Date Range</MenuItem>
              </Select>
            </FormControl>

            {period === 'custom' && (
              <>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => handleDateChange(newValue, setStartDate)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => handleDateChange(newValue, setEndDate)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </>
            )}
          </Stack>
        </Paper>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Completions
              </Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : (
                <Typography variant="h4">
                  {stats?.completions || 0}
                </Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Need to Complete
              </Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : (
                <Typography variant="h4" color="error">
                  {stats?.needToComplete || 0}
                </Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Training Completed {workSite !== 'all' ? `(${workSite})` : '(All Sites)'}
              </Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : (
                <Typography variant="h4">
                  {workSite !== 'all' ? (stats?.trainingCompleted || 0) : (stats?.trainingCompletedAllSites || 0)}
                </Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Total Sessions
              </Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : (
                <Typography variant="h4">
                  {stats?.totalSessions || 0}
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Employees Needing Training */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Employees Needing Training
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Filter by Site</InputLabel>
                <Select
                  value={employeeFilter}
                  label="Filter by Site"
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                >
                  <MenuItem value="all">All Sites</MenuItem>
                  {workSites.filter(site => site !== 'all').map((site) => (
                    <MenuItem key={site} value={site}>
                      {site}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                onClick={() => setShowEmployeesNeedingTraining(!showEmployeesNeedingTraining)}
              >
                {showEmployeesNeedingTraining ? 'Hide' : 'Show'} List
              </Button>
            </Box>
          </Box>
          {showEmployeesNeedingTraining && stats?.employeesNeedingTraining && (
            <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Hours Left</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.employeesNeedingTraining
                    .filter(emp => employeeFilter === 'all' || emp.location === employeeFilter)
                    .map((emp) => {
                      const getStatusColor = () => {
                        if (emp.status === 'complete') return '#4caf50'; // Green
                        if (emp.status === 'atRisk') return '#ffeb3b'; // Yellow
                        return '#f44336'; // Red
                      };
                      
                      const getStatusLabel = () => {
                        if (emp.status === 'complete') return 'Complete';
                        if (emp.status === 'atRisk') return 'At Risk';
                        return 'Incomplete';
                      };
                      
                      return (
                        <TableRow 
                          key={emp.id}
                          sx={{
                            bgcolor: getStatusColor(),
                            '&:hover': { bgcolor: getStatusColor(), opacity: 0.8 }
                          }}
                        >
                          <TableCell>{emp.name}</TableCell>
                          <TableCell>{emp.location}</TableCell>
                          <TableCell align="right">{emp.hoursLeft ? emp.hoursLeft.toFixed(1) : '0.0'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={getStatusLabel()} 
                              size="small"
                              color={
                                emp.status === 'complete' ? 'success' :
                                emp.status === 'atRisk' ? 'warning' : 'error'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Employee Hours Tracker */}
        <EmployeeHoursTracker />

        {/* Completed Trainings */}
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Completed Trainings
          </Typography>
          {loading ? (
            <CircularProgress />
          ) : (
            <List>
              {completedSessions.length > 0 ? (
                completedSessions.slice(0, 10).map((session) => (
                  <ListItem key={session.id || `session-${session.topic}-${session.date}`}>
                    <ListItemText
                      primary={session.topic || session.name || 'Training Session'}
                      secondary={`Date: ${session.date || 'N/A'}, Location: ${session.location || 'N/A'}, Trainees: ${session.trainees?.length || 0}`}
                    />
                  </ListItem>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No completed trainings found
                </Typography>
              )}
            </List>
          )}
        </Paper>

        {/* Recent Check-Ins */}
        <Paper sx={{ p: 4, mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              Recent Check-Ins
            </Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Filter by Location</InputLabel>
              <Select
                value={checkInLocationFilter}
                label="Filter by Location"
                onChange={(e) => setCheckInLocationFilter(e.target.value)}
              >
                <MenuItem value="all">All Locations</MenuItem>
                {workSites.filter(site => site !== 'all').map((site) => (
                  <MenuItem key={site} value={site}>
                    {site}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <List>
            {checkIns.slice(0, 10).map((checkIn) => (
              <ListItem key={checkIn.id}>
                <ListItemText
                  primary={`${checkIn.name} (${checkIn.email})`}
                  secondary={`Phone: ${checkIn.phone}, Location: ${checkIn.location}, Time: ${moment(checkIn.checkinTime).format('MM/DD/YYYY HH:mm')}`}
                />
              </ListItem>
            ))}
            {checkIns.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No check-ins found
              </Typography>
            )}
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default ManagerDashboard;
