'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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

const Reports = () => {
  // State for filters
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [topics, setTopics] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [error, setError] = useState('');

  // Fetch topics and trainers on component mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const topicsResponse = await axios.get('/api/topics');
        const trainersResponse = await axios.get('/api/trainers');
        setTopics(topicsResponse.data);
        setTrainers(trainersResponse.data);
      } catch (err) {
        console.error('Error fetching filters:', err);
        setError('Failed to load filter options.');
      }
    };
    fetchFilters();
  }, []);

  // Fetch report data based on selected criteria
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/reports', {
        params: {
          startDate: startDate ? startDate.format('YYYY-MM-DD') : null,
          endDate: endDate ? endDate.format('YYYY-MM-DD') : null,
          topic: selectedTopic,
          trainer: selectedTrainer,
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
                renderInput={(params) => <FormControl fullWidth>{params.input}</FormControl>}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                renderInput={(params) => <FormControl fullWidth>{params.input}</FormControl>}
              />
            </LocalizationProvider>
          </Grid>

          {/* Training Topic Filter */}
          <Grid item xs={12} md={6}>
  <FormControl fullWidth>
    <InputLabel>Training Topic</InputLabel>
    <Select
      value={selectedTopic}
      onChange={(e) => setSelectedTopic(e.target.value)}
    >
      <MenuItem value="">All Topics</MenuItem>
      {topics.map((topic) => (
        <MenuItem key={`topic-${topic.id}`} value={topic.id}>
          {topic.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>

{/* Trainer Filter */}
<Grid item xs={12} md={6}>
  <FormControl fullWidth>
    <InputLabel>Trainer</InputLabel>
    <Select
      value={selectedTrainer}
      onChange={(e) => setSelectedTrainer(e.target.value)}
    >
      <MenuItem value="">All Trainers</MenuItem>
      {trainers.map((trainer) => (
        <MenuItem key={`trainer-${trainer.id}`} value={trainer.name}>
          {trainer.name}
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
                <TableCell>Date</TableCell>
                <TableCell>Topic</TableCell>
                <TableCell>Trainer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Trainees</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.date}</TableCell>
                  <TableCell>{session.topic}</TableCell>
                  <TableCell>{session.trainer}</TableCell>
                  <TableCell>{session.status}</TableCell>
                  <TableCell>{session.trainees.join(', ')}</TableCell>
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