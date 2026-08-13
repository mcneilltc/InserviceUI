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
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Tabs,
  Tab,
  Chip,
  Stack,
} from '@mui/material';
import { FileDownload as FileDownloadIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import axios from 'axios';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';

const REPORT_TYPES = [
  { value: 'checkins', label: 'Check-Ins' },
  { value: 'hours', label: 'Employee Hours' },
  { value: 'completed', label: 'Completed Trainings' },
];

const STATUS_LABELS = { complete: 'Complete', atRisk: 'At Risk', incomplete: 'Incomplete', exempt: 'Exempt', pendingCertification: 'Pending Certification' };
const STATUS_COLORS = { complete: 'success', atRisk: 'warning', incomplete: 'error', exempt: 'default', pendingCertification: 'default' };

// Column definitions per report type — shared by both the on-screen table and
// the CSV export, so the two can never drift out of sync with each other.
const COLUMNS = {
  checkins: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'workSite', label: 'Work Site' },
    { key: 'checkinTime', label: 'Check-in Time', format: (v) => (v ? moment(v).format('MMM D, YYYY h:mm A') : '') },
    { key: 'trainingHoursCompleted', label: 'Training Hours Completed' },
  ],
  hours: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'location', label: 'Location' },
    { key: 'totalHours', label: 'Total Hours' },
    { key: 'requiredHours', label: 'Required Hours' },
    { key: 'hoursLeft', label: 'Hours Left' },
    { key: 'status', label: 'Status', format: (v) => STATUS_LABELS[v] || v },
  ],
  completed: [
    { key: 'date', label: 'Date' },
    { key: 'location', label: 'Location' },
    { key: 'topicsDisplay', label: 'Topics' },
    { key: 'trainerNames', label: 'Trainer(s)' },
    { key: 'traineeCount', label: 'Trainees' },
  ],
};

function toCsv(reportType, rows) {
  const columns = COLUMNS[reportType];
  const headerLine = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => {
      const raw = c.format ? c.format(row[c.key]) : row[c.key];
      return `"${String(raw ?? '').replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headerLine, ...lines].join('\n');
}

const Reports = () => {
  const [reportType, setReportType] = useState('checkins');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [nameFilter, setNameFilter] = useState('');
  // 'all' (not '') so the Select always has a real, non-empty value — an
  // empty-string value needs displayEmpty to show anything at all, and MUI's
  // label-shrink logic doesn't treat displayEmpty as "has a value", so the
  // "Work Site" label never floats out of the way and sits on top of "All Sites".
  const [workSite, setWorkSite] = useState('all');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [error, setError] = useState('');
  // Distinguishes "haven't generated a report yet" from "generated one and it
  // came back empty" — without this, an empty result renders nothing at all,
  // which looks identical to the button silently failing.
  const [hasSearched, setHasSearched] = useState(false);

  // Shared ['sites']/['employees'] query keys — same ones Manage Employees,
  // Manage Sites, etc. use, so navigating between those pages and this one
  // reuses the already-cached data instead of hitting the API again.
  const { data: LOCATIONS = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await axios.get('/api/sites');
      return res.data.map((s) => s.name);
    },
  });

  // Needed to resolve trainer IDs to names for the Completed Trainings report.
  const { data: employeesById = {} } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await axios.get('/api/employees');
      return response.data.map((emp) => ({ ...emp, locations: emp.locations || [] }));
    },
    select: (employees) => {
      const byId = {};
      employees.forEach((emp) => { byId[emp.id] = emp.name; });
      return byId;
    },
  });

  const handleReportTypeChange = (event, newValue) => {
    setReportType(newValue);
    setReportData([]);
    setHasSearched(false);
    setError('');
  };

  // Fetch report data based on selected criteria
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const commonParams = {
        startDate: startDate ? startDate.format('YYYY-MM-DD') : undefined,
        endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
        // Backend already treats a literal 'all' the same as an absent filter.
        workSite,
      };

      let rows;
      if (reportType === 'checkins') {
        const { data } = await axios.get('/api/reports', {
          params: { ...commonParams, name: nameFilter || undefined },
        });
        rows = data;
      } else if (reportType === 'hours') {
        const { data } = await axios.get('/api/reports/hours', { params: commonParams });
        rows = data;
      } else {
        const { data } = await axios.get('/api/sessions', {
          params: { ...commonParams, status: 'completed' },
        });
        rows = data.map((session) => ({
          ...session,
          topicsDisplay: Array.isArray(session.topics) ? session.topics.join(', ') : (session.topic || ''),
          // A bulk-imported record's trainer is the literal placeholder
          // 'Imported', not a real trainer ID — show who actually uploaded
          // it instead, when that's on record.
          trainerNames: session.trainer === 'Imported'
            ? (session.createdBy?.name ? `Imported by ${session.createdBy.name}` : 'Imported')
            : (Array.isArray(session.trainer) ? session.trainer : [session.trainer])
                .filter(Boolean)
                .map((id) => employeesById[id] || id)
                .join(', '),
          traineeCount: session.trainees?.length || 0,
        }));
      }

      setReportData(rows);
      setHasSearched(true);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.response?.data?.error?.message || 'Failed to fetch report data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const csv = toCsv(reportType, reportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${moment().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = COLUMNS[reportType];
  const emptyStateMessage = {
    checkins: 'No check-ins found for these filters.',
    hours: 'No employees found for these filters.',
    completed: 'No completed trainings found for these filters.',
  }[reportType];

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Reports
        </Typography>

        <Tabs value={reportType} onChange={handleReportTypeChange} sx={{ mb: 3 }}>
          {REPORT_TYPES.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* Date Range Filters */}
          <Grid size={{ xs: 12, md: 6 }}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          {/* Name Filter — only meaningful for the Check-Ins report */}
          {reportType === 'checkins' && (
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Name"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </Grid>
          )}

          {/* Work Site Filter */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Work Site</InputLabel>
              <Select
                value={workSite}
                label="Work Site"
                onChange={(e) => setWorkSite(e.target.value)}
              >
                <MenuItem value="all">All Sites</MenuItem>
                {LOCATIONS.map((location) => (
                  <MenuItem key={location} value={location}>
                    {location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Fetch Report Button */}
          <Grid size={12}>
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
          <>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleDownload}
              >
                Download CSV
              </Button>
            </Stack>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {columns.map((c) => (
                      <TableCell key={c.key}>{c.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={row.id || `${reportType}-${index}`}>
                      {columns.map((c) => {
                        if (reportType === 'hours' && c.key === 'status') {
                          return (
                            <TableCell key={c.key}>
                              <Chip size="small" label={STATUS_LABELS[row.status] || row.status} color={STATUS_COLORS[row.status] || 'default'} />
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={c.key}>{c.format ? c.format(row[c.key]) : row[c.key]}</TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Empty state — distinct from "haven't searched yet" so a filter
            combination with zero matches doesn't look like the button did nothing */}
        {hasSearched && !loading && !error && reportData.length === 0 && (
          <Alert severity="info">{emptyStateMessage}</Alert>
        )}
      </Paper>
    </Container>
  );
};

export default Reports;
