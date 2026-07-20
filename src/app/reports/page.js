'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import axios from 'axios';
import moment from 'moment';

const LOCATIONS = ['MCAC', 'Ramsey Creek Beach', 'Double Oaks', 'Cordelia'];

const Reports = () => {
  // State for filters — these match what routes/reports.ts actually supports
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [nameFilter, setNameFilter] = useState('');
  const [workSite, setWorkSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [error, setError] = useState('');

  // Fetch report data based on selected criteria
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/reports', {
        params: {
          startDate: startDate ? startDate.format('YYYY-MM-DD') : undefined,
          endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
          name: nameFilter || undefined,
          workSite: workSite || undefined,
        },
      });
      setReportData(response.data);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to fetch report data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Reports
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* Date Range Filters */}
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          {/* Name Filter */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </Grid>

          {/* Work Site Filter */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Work Site</InputLabel>
              <Select
                value={workSite}
                label="Work Site"
                onChange={(e) => setWorkSite(e.target.value)}
              >
                <MenuItem value="">All Sites</MenuItem>
                {LOCATIONS.map((location) => (
                  <MenuItem key={location} value={location}>
                    {location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Fetch Report Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={fetchReportData}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate Report'}
            </Button>
          </Grid>
        </Grid>

        {/* Error Message */}
        {error && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {/* Report Table */}
        {reportData.length > 0 && (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Work Site</TableCell>
                <TableCell>Check-in Time</TableCell>
                <TableCell>Training Hours Completed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.map((checkin, index) => (
                <TableRow key={`${checkin.email}-${checkin.checkinTime}-${index}`}>
                  <TableCell>{checkin.name}</TableCell>
                  <TableCell>{checkin.email}</TableCell>
                  <TableCell>{checkin.phone}</TableCell>
                  <TableCell>{checkin.workSite}</TableCell>
                  <TableCell>{checkin.checkinTime ? moment(checkin.checkinTime).format('MMM D, YYYY h:mm A') : ''}</TableCell>
                  <TableCell>{checkin.trainingHoursCompleted}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Container>
  );
};

export default Reports;
