'use client';

import React, { useState, useMemo } from 'react';
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
  Checkbox,
  IconButton,
  TableSortLabel,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import axios from 'axios';
import moment from 'moment';
import { Download as DownloadIcon, FileDownload as FileDownloadIcon, Warning as WarningIcon, Error as ErrorIcon, CheckCircle as CheckCircleIcon, ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon, Send as SendIcon } from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import EmployeeHoursTracker from '../../components/EmployeeHoursTracker';
import { useAuth } from '../../components/AuthContext';
import { exportTableToPdf } from '../../utils/pdfExport';

ChartJS.register(ArcElement, ChartTooltip, Legend);

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

const ManagerDashboard = () => {
  const router = useRouter();
  const { user } = useAuth();
  const isScopedSupervisor = user?.role === 'supervisor' && user?.supervisorScope === 'locations';

  // Local filter/sort just for the Completed Trainings and Recent Check-Ins
  // lists — independent of the page-wide location filter above, which also
  // drives the stats cards and compliance section.
  const [completedLocationFilter, setCompletedLocationFilter] = useState('all');
  const [completedSortDir, setCompletedSortDir] = useState('desc');
  const [checkInsLocationFilter, setCheckInsLocationFilter] = useState('all');
  const [checkInsSortDir, setCheckInsSortDir] = useState('desc');
  const [needsTrainingSortBy, setNeedsTrainingSortBy] = useState('name');
  const [needsTrainingSortDir, setNeedsTrainingSortDir] = useState('asc');

  // A multi-select location filter whose MEANING depends on the supervisor's scope:
  // - Scoped supervisor (e.g. ERRC only): their roster is always their own
  //   home-based staff by default. This filter narrows by TRAINING location —
  //   where those staff actually checked in/trained — so they can see when
  //   their people trained at other sites. Useful for supervisors covering
  //   several (but not all) sites who want a combined view of just those.
  // - All-site supervisor: there's no fixed home roster, so this filter picks
  //   which sites' HOME rosters to view instead.
  // `['all']` means no narrowing; any other array is the set of selected sites.
  const [locationFilters, setLocationFilters] = useState(['all']);
  const isAllSites = locationFilters.includes('all');
  const locationFilterLabel = isScopedSupervisor ? 'Training Location' : 'Home Location';

  const handleLocationFilterChange = (event) => {
    const { value } = event.target;
    const selected = typeof value === 'string' ? value.split(',') : value;
    // Selecting "All" clears specific sites; selecting a specific site clears "All".
    if (selected.length === 0 || selected[selected.length - 1] === 'all') {
      setLocationFilters(['all']);
    } else {
      setLocationFilters(selected.filter((v) => v !== 'all'));
    }
  };

  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(moment().startOf('month'));
  const [endDate, setEndDate] = useState(moment().endOf('month'));
  const [showEmployeesNeedingTraining, setShowEmployeesNeedingTraining] = useState(false);
  // Which compliance alert's employee list is currently open in the dialog
  // below ('midMonth' | 'needsNotice'), or null when the dialog is closed.
  const [openAlert, setOpenAlert] = useState(null);
  const [letterSnackbar, setLetterSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const sendLetterMutation = useMutation({
    mutationFn: (employeeId) => axios.post(`/api/compliance/letter/${employeeId}/send`),
    onSuccess: (res) => {
      setLetterSnackbar({ open: true, message: res.data?.message || 'Compliance letter sent.', severity: 'success' });
    },
    onError: (err) => {
      const message = err.response?.data?.error?.message || 'Failed to send the compliance letter.';
      setLetterSnackbar({ open: true, message, severity: 'error' });
    },
  });

  const handleSendComplianceLetter = (employee) => {
    if (window.confirm(`Send a compliance letter to ${employee.name}?`)) {
      sendLetterMutation.mutate(employee.id);
    }
  };

  // Sites/employees/sessions use the same queryKeys as add-training and
  // trainer-dashboard — visiting one of those pages first means this
  // dashboard can reuse that cached data instead of refetching it (see the
  // queryClient staleTime comment in app/layout.tsx for why that matters:
  // this dashboard used to re-fire ~6 uncached requests on every mount).
  const { data: allSites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sites`);
      return data.map((s) => s.name);
    },
  });

  const allowedSites = isScopedSupervisor && user.supervisorLocations?.length ? user.supervisorLocations : allSites;

  // Roster/home-location scoping — the security-relevant check, always
  // enforced for a scoped supervisor regardless of what locationFilters means
  // for them right now.
  const inHomeScope = (location) => {
    if (isScopedSupervisor) return allowedSites.includes(location);
    if (!isAllSites) return locationFilters.includes(location);
    return true;
  };

  const { data: employees = [], isError: employeesError } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/employees`);
      return data;
    },
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sessions`);
      return data;
    },
  });

  const completedSessions = useMemo(() => {
    let completed = allSessions.filter((s) => s.status === 'completed');
    if (!isAllSites) {
      completed = completed.filter((s) => locationFilters.includes(s.location));
    } else if (isScopedSupervisor) {
      completed = completed.filter((s) => allowedSites.includes(s.location));
    }
    return completed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions, isAllSites, locationFilters, isScopedSupervisor, allowedSites.join(',')]);

  const {
    data: stats = null,
    isLoading: loading,
    isError: statsError,
  } = useQuery({
    // Scoped supervisor: locationFilters narrows by training location(s).
    // All-site supervisor: locationFilters narrows the roster by home site(s).
    queryKey: [
      'dashboard-stats',
      period,
      period === 'custom' ? startDate.toISOString() : null,
      period === 'custom' ? endDate.toISOString() : null,
      isScopedSupervisor,
      isAllSites ? null : locationFilters.join(','),
    ],
    queryFn: async () => {
      const params = {
        period: period !== 'custom' ? period : undefined,
        startDate: period === 'custom' ? startDate.toISOString() : undefined,
        endDate: period === 'custom' ? endDate.toISOString() : undefined,
        workSite: isScopedSupervisor && !isAllSites ? locationFilters.join(',') : undefined,
        homeSite: !isScopedSupervisor && !isAllSites ? locationFilters.join(',') : undefined,
      };
      const { data } = await axios.get(`${BACKEND_URL}/api/dashboard/stats`, { params });
      return data;
    },
  });

  const error = employeesError ? 'Failed to fetch employees' : statsError ? 'Failed to fetch statistics' : null;

  const { data: rawComplianceData = null, isLoading: complianceLoading } = useQuery({
    queryKey: ['compliance-status', startDate.format('YYYY-MM')],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/compliance/status`, {
        params: { month: startDate.format('YYYY-MM') },
      });
      return data;
    },
  });

  // This endpoint doesn't support site filtering server-side — scope it here
  // by home location, for a location-limited supervisor or an all-site
  // supervisor who's picked a home site to view. Kept separate from the
  // query itself since this scoping depends on filter state that shouldn't
  // trigger a refetch of unchanged server data.
  const complianceData = useMemo(() => {
    const data = rawComplianceData;
    if (!data) return null;

    const scopedEmployees = data.allEmployees.filter((e) => inHomeScope(e.location));
    const scopedBySite = Object.fromEntries(
      Object.entries(data.bySite).filter(([site]) => inHomeScope(site))
    );
    const compliantCount = scopedEmployees.filter((e) => e.status === 'compliant').length;
    return {
      ...data,
      allEmployees: scopedEmployees,
      bySite: scopedBySite,
      overall: {
        total: scopedEmployees.length,
        compliant: compliantCount,
        partial: scopedEmployees.filter((e) => e.status === 'partial').length,
        atRisk: scopedEmployees.filter((e) => e.status === 'at_risk').length,
        zero: scopedEmployees.filter((e) => e.status === 'zero').length,
        percentCompliant: scopedEmployees.length > 0 ? Math.round((compliantCount / scopedEmployees.length) * 100) : 0,
      },
      alerts: {
        midMonth: data.alerts.midMonth.filter((e) => inHomeScope(e.location)),
        needsNotice: data.alerts.needsNotice.filter((e) => inHomeScope(e.location)),
        endOfMonth: data.alerts.endOfMonth.filter((e) => inHomeScope(e.location)),
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawComplianceData, isScopedSupervisor, isAllSites, locationFilters, allowedSites.join(',')]);

  const { data: checkIns = [] } = useQuery({
    // The backend already scopes by the checked-in employee's home location
    // (never trust client-side filtering for this). `location` narrows by
    // where training happened (scoped supervisor's use case); `homeSite`
    // narrows the roster itself (all-site supervisor's use case).
    queryKey: ['checkins', isScopedSupervisor, isAllSites ? null : locationFilters.join(',')],
    queryFn: async () => {
      const params = {
        location: isScopedSupervisor && !isAllSites ? locationFilters.join(',') : undefined,
        homeSite: !isScopedSupervisor && !isAllSites ? locationFilters.join(',') : undefined,
      };
      const { data } = await axios.get(`${BACKEND_URL}/api/checkin`, { params });
      return data || [];
    },
  });

  const handleDateChange = (newValue, setter) => {
    if (newValue && moment.isMoment(newValue)) {
      setter(newValue);
    }
  };

  const handleDownloadSiteReport = (siteName, employeesList) => {
    exportTableToPdf({
      title: `Compliance Deficiency Report — ${siteName}`,
      headers: ['Name', 'Email', 'Location', 'Hours This Month', 'Needed By 15th', 'Needed By End', 'Status'],
      rows: employeesList.map(emp => [
        emp.name || '',
        emp.email || '',
        emp.location || '',
        emp.hoursThisMonth || 0,
        emp.hoursNeededByMidMonth || 0,
        emp.hoursNeededByEndOfMonth || 0,
        emp.status,
      ]),
      filenamePrefix: `Compliance_Report_${siteName.replace(/\s+/g, '_')}`,
    });
  };


  const visibleCompletedSessions = completedSessions
    .filter((s) => completedLocationFilter === 'all' || s.location === completedLocationFilter)
    .slice()
    .sort((a, b) => {
      const diff = moment(a.date).valueOf() - moment(b.date).valueOf();
      return completedSortDir === 'asc' ? diff : -diff;
    });

  const visibleCheckIns = checkIns
    .filter((c) => checkInsLocationFilter === 'all' || c.location === checkInsLocationFilter)
    .slice()
    .sort((a, b) => {
      const diff = moment(a.checkinTime).valueOf() - moment(b.checkinTime).valueOf();
      return checkInsSortDir === 'asc' ? diff : -diff;
    });

  // Worst-first ordering when sorted by status ascending — an incomplete
  // employee needs attention more urgently than one who's merely at risk.
  const NEEDS_TRAINING_STATUS_ORDER = { incomplete: 0, atRisk: 1, complete: 2 };

  const handleNeedsTrainingSort = (column) => {
    if (needsTrainingSortBy === column) {
      setNeedsTrainingSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setNeedsTrainingSortBy(column);
      setNeedsTrainingSortDir('asc');
    }
  };

  const sortedEmployeesNeedingTraining = (stats?.employeesNeedingTraining || []).slice().sort((a, b) => {
    let diff = 0;
    switch (needsTrainingSortBy) {
      case 'location':
        diff = (a.location || '').localeCompare(b.location || '');
        break;
      case 'hoursLeft':
        diff = (a.hoursLeft || 0) - (b.hoursLeft || 0);
        break;
      case 'status':
        diff = (NEEDS_TRAINING_STATUS_ORDER[a.status] ?? 0) - (NEEDS_TRAINING_STATUS_ORDER[b.status] ?? 0);
        break;
      case 'name':
      default:
        diff = (a.name || '').localeCompare(b.name || '');
    }
    return needsTrainingSortDir === 'asc' ? diff : -diff;
  });

  // Derived from the complianceData this page already fetches — handed to
  // EmployeeHoursTracker as a prop instead of it independently re-fetching
  // /api/compliance/status (an expensive full-roster subcollection scan).
  const hoursThisMonthById = {};
  (complianceData?.allEmployees || []).forEach((emp) => {
    hoursThisMonthById[emp.id] = emp.hoursThisMonth;
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Manager Dashboard
            </Typography>
            {user && (
              <Typography variant="h6" color="text.secondary">
                Hi {user.name || user.email}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => router.push('/reports')}
            >
              Full Report
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              color="success"
              onClick={() => setShowEmployeesNeedingTraining(true)}
            >
              Compliance Overview
            </Button>
          </Stack>
        </Box>

        {/* Compliance Alerts */}
        {complianceData && (
          <Box sx={{ mb: 4 }}>
            {moment().date() >= 15 && complianceData.alerts.midMonth.length > 0 && (
              <Alert
                severity="error"
                icon={<ErrorIcon />}
                sx={{ mb: 2, borderRadius: 2, fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => setOpenAlert('midMonth')}
                action={
                  <Button color="inherit" size="small" onClick={() => setOpenAlert('midMonth')}>
                    View List
                  </Button>
                }
              >
                URGENT: {complianceData.alerts.midMonth.length} employees have 0 hours of inservice recorded as of the 15th.
              </Alert>
            )}
            {moment().date() < 15 && complianceData.alerts.needsNotice.length > 0 && (
              <Alert
                severity="warning"
                icon={<WarningIcon />}
                sx={{ mb: 2, borderRadius: 2, cursor: 'pointer' }}
                onClick={() => setOpenAlert('needsNotice')}
                action={
                  <Button color="inherit" size="small" onClick={() => setOpenAlert('needsNotice')}>
                    View List
                  </Button>
                }
              >
                Notice: {complianceData.alerts.needsNotice.length} employees are under the 2-hour requirement for the 15th.
              </Alert>
            )}
          </Box>
        )}

        {/* Compliance alert employee list dialog */}
        <Dialog open={Boolean(openAlert)} onClose={() => setOpenAlert(null)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {openAlert === 'midMonth'
              ? 'Employees with 0 hours recorded'
              : 'Employees under the 2-hour requirement'}
          </DialogTitle>
          <DialogContent dividers>
            {openAlert && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Hours This Month</TableCell>
                    <TableCell align="right">Needed by 15th</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {complianceData.alerts[openAlert].map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Typography
                          component="span"
                          sx={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                          onClick={() => router.push(`/manage-employees/${emp.id}`)}
                        >
                          {emp.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{emp.location}</TableCell>
                      <TableCell align="right">{(emp.hoursThisMonth || 0).toFixed(1)}</TableCell>
                      <TableCell align="right">{(emp.hoursNeededByMidMonth || 0).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAlert(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>{locationFilterLabel}</InputLabel>
              <Select
                multiple
                value={locationFilters}
                label={locationFilterLabel}
                onChange={handleLocationFilterChange}
                renderValue={(selected) =>
                  selected.includes('all')
                    ? (isScopedSupervisor ? 'All (My Staff)' : 'All Sites')
                    : selected.join(', ')
                }
              >
                <MenuItem value="all">
                  <Checkbox checked={isAllSites} />
                  <ListItemText primary={isScopedSupervisor ? 'All (My Staff)' : 'All Sites'} />
                </MenuItem>
                {allSites.map((site) => (
                  <MenuItem key={site} value={site}>
                    <Checkbox checked={locationFilters.includes(site)} />
                    <ListItemText primary={site} />
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
                <MenuItem value="day">Day</MenuItem>
                <MenuItem value="week">Week</MenuItem>
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="year">Year</MenuItem>
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

        {/* Graphical Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Overall Compliance
                </Typography>
                <Box sx={{ position: 'relative', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>
                  {complianceLoading ? (
                    <CircularProgress />
                  ) : complianceData ? (
                    <>
                      <Doughnut 
                        data={{
                          labels: ['Compliant', 'Non-Compliant'],
                          datasets: [{
                            data: [complianceData.overall.compliant, complianceData.overall.total - complianceData.overall.compliant],
                            backgroundColor: ['#4caf50', '#f44336'],
                            borderWidth: 0,
                            cutout: '80%',
                          }]
                        }}
                        options={{
                          plugins: { legend: { display: false } },
                          maintainAspectRatio: false,
                        }}
                      />
                      <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                        <Typography variant="h3" fontWeight="bold">
                          {complianceData.overall.percentCompliant}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          TARGET MET
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Typography color="text.secondary">No data available</Typography>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Target: 4 hours by month end
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, md: 8 }}>
            <Grid container spacing={2}>
              {complianceData && Object.entries(complianceData.bySite).map(([siteName, siteStats]) => (
                <Grid size={{ xs: 12, sm: 6 }} key={siteName}>
                  <Card sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 80, height: 80, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Doughnut 
                        data={{
                          data: [siteStats.compliant, siteStats.total - siteStats.compliant],
                          datasets: [{
                            data: [siteStats.compliant, siteStats.total - siteStats.compliant],
                            backgroundColor: ['#4caf50', '#e0e0e0'],
                            borderWidth: 0,
                            cutout: '75%',
                          }]
                        }}
                        options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }}
                      />
                      <Typography variant="caption" fontWeight="bold" sx={{ position: 'absolute' }}>
                        {siteStats.percentCompliant}%
                      </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">{siteName}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {siteStats.compliant} / {siteStats.total} compliant
                      </Typography>
                      <Button 
                        size="small" 
                        variant="text" 
                        startIcon={<FileDownloadIcon />}
                        onClick={() => handleDownloadSiteReport(siteName, complianceData.allEmployees.filter(e => e.location === siteName && e.status !== 'compliant'))}
                        sx={{ mt: 0.5 }}
                      >
                        Site Deficiency List
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Training Completed {!isAllSites ? `(${locationFilters.join(', ')})` : ''}
              </Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : (
                <Typography variant="h4">
                  {!isAllSites ? (stats?.trainingCompleted || 0) : (stats?.trainingCompletedAllSites || 0)}
                </Typography>
              )}
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">
              Employees Needing Training {!isAllSites && !isScopedSupervisor ? `(${locationFilters.join(', ')})` : ''}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setShowEmployeesNeedingTraining(!showEmployeesNeedingTraining)}
            >
              {showEmployeesNeedingTraining ? 'Hide' : 'Show'} List
            </Button>
          </Box>
          {showEmployeesNeedingTraining && stats?.employeesNeedingTraining && (
            <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={needsTrainingSortBy === 'name'}
                        direction={needsTrainingSortBy === 'name' ? needsTrainingSortDir : 'asc'}
                        onClick={() => handleNeedsTrainingSort('name')}
                      >
                        Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={needsTrainingSortBy === 'location'}
                        direction={needsTrainingSortBy === 'location' ? needsTrainingSortDir : 'asc'}
                        onClick={() => handleNeedsTrainingSort('location')}
                      >
                        Location
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={needsTrainingSortBy === 'hoursLeft'}
                        direction={needsTrainingSortBy === 'hoursLeft' ? needsTrainingSortDir : 'asc'}
                        onClick={() => handleNeedsTrainingSort('hoursLeft')}
                      >
                        Hours Left
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={needsTrainingSortBy === 'status'}
                        direction={needsTrainingSortBy === 'status' ? needsTrainingSortDir : 'asc'}
                        onClick={() => handleNeedsTrainingSort('status')}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedEmployeesNeedingTraining
                    .map((emp) => {
                      const getStatusLabel = () => {
                        if (emp.status === 'complete') return 'Complete';
                        if (emp.status === 'atRisk') return 'At Risk';
                        return 'Incomplete';
                      };

                      return (
                        <TableRow key={emp.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography
                                component="span"
                                sx={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                                onClick={() => router.push(`/manage-employees/${emp.id}`)}
                              >
                                {emp.name}
                              </Typography>
                              {emp.status !== 'complete' && (
                                <Tooltip title="Send Compliance Letter">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleSendComplianceLetter(emp)}
                                      disabled={sendLetterMutation.isPending && sendLetterMutation.variables === emp.id}
                                    >
                                      <SendIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
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
        <EmployeeHoursTracker
          allowedLocations={
            isScopedSupervisor
              ? allowedSites
              : (!isAllSites ? locationFilters : null)
          }
          employees={employees}
          hoursThisMonthById={hoursThisMonthById}
          allSites={allSites}
          loading={loading || complianceLoading}
        />

        {/* Completed Trainings */}
        <Paper sx={{ p: 4, mt: 4 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h5">
              Completed Trainings {!isAllSites ? `(${locationFilters.join(', ')})` : ''}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Filter by Location</InputLabel>
                <Select
                  value={completedLocationFilter}
                  label="Filter by Location"
                  onChange={(e) => setCompletedLocationFilter(e.target.value)}
                >
                  <MenuItem value="all">All Locations</MenuItem>
                  {allowedSites.map((site) => (
                    <MenuItem key={site} value={site}>{site}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                onClick={() => setCompletedSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title={completedSortDir === 'asc' ? 'Oldest first' : 'Newest first'}
              >
                {completedSortDir === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
              </IconButton>
            </Stack>
          </Box>
          {loading ? (
            <CircularProgress />
          ) : (
            <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
              <List>
                {visibleCompletedSessions.length > 0 ? (
                  visibleCompletedSessions.map((session) => (
                    <ListItem key={session.id || `session-${session.topic}-${session.date}`}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {session.topic || session.name || 'Training Session'}
                            {session.flaggedAsPossibleDuplicateOf && (
                              <Tooltip title="Uploader was warned this looks like it might duplicate another session on the same date/location, and saved it anyway — worth a second look.">
                                <Chip size="small" color="warning" icon={<WarningIcon />} label="Possible duplicate" />
                              </Tooltip>
                            )}
                          </Box>
                        }
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
            </Box>
          )}
        </Paper>

        {/* Recent Check-Ins */}
        <Paper sx={{ p: 4, mt: 4 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h5">
              Recent Check-Ins {!isAllSites ? `(${locationFilters.join(', ')})` : ''}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Filter by Location</InputLabel>
                <Select
                  value={checkInsLocationFilter}
                  label="Filter by Location"
                  onChange={(e) => setCheckInsLocationFilter(e.target.value)}
                >
                  <MenuItem value="all">All Locations</MenuItem>
                  {allowedSites.map((site) => (
                    <MenuItem key={site} value={site}>{site}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                onClick={() => setCheckInsSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title={checkInsSortDir === 'asc' ? 'Oldest first' : 'Newest first'}
              >
                {checkInsSortDir === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
              </IconButton>
            </Stack>
          </Box>
          <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
            <List>
              {visibleCheckIns.map((checkIn) => (
                <ListItem key={checkIn.id}>
                  <ListItemText
                    primary={`${checkIn.name} (${checkIn.email})`}
                    secondary={`Phone: ${checkIn.phone}, Location: ${checkIn.location}, Time: ${moment(checkIn.checkinTime).format('MM/DD/YYYY HH:mm')}`}
                  />
                </ListItem>
              ))}
              {visibleCheckIns.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No check-ins found
                </Typography>
              )}
            </List>
          </Box>
        </Paper>
      </Box>
      <Snackbar
        open={letterSnackbar.open}
        autoHideDuration={5000}
        onClose={() => setLetterSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setLetterSnackbar((prev) => ({ ...prev, open: false }))}
          severity={letterSnackbar.severity}
          sx={{ width: '100%' }}
        >
          {letterSnackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ManagerDashboard;
