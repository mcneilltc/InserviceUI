'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Snackbar,
  Chip,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Stack,
  Autocomplete,
  Link,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { Edit as EditIcon, Archive as ArchiveIcon, Unarchive as UnarchiveIcon, Add as AddIcon, LocationOn as LocationIcon, Delete as DeleteIcon, Search as SearchIcon, ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon, MoreTime as MoreTimeIcon } from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import ImportEmployeesDialog from './ImportEmployeesDialog';

const CERTIFICATION_TYPE_SUGGESTIONS = [
  'Lifeguarding',
  'Lifeguard Instructor',
  'CPR/AED for the Professional Rescuer',
  'First Aid',
  'Waterfront Lifeguarding',
  'Waterpark Lifeguarding',
  'Title 22',
  'Elite Supervisor Training',
  'Swim Instructor Training',
  'Slide Certification',
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'position', label: 'Position' },
  { value: 'role', label: 'Role' },
  { value: 'hireDate', label: 'Hire Date' },
  { value: 'homeLocation', label: 'Location' },
  { value: 'depth', label: 'Depth' },
];

const ManageEmployees = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    alternateEmails: '',
    position: '',
    phone: '',
    hireDate: moment(),
    locations: [],
    homeLocation: '',
    certifications: [],
    badgeNumber: '',
    isSupervisor: false,
    supervisorScope: 'locations',
    isTrainer: false,
  });
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const [bulkLocations, setBulkLocations] = useState([]);
  const [openBulkCertDialog, setOpenBulkCertDialog] = useState(false);
  const [bulkCertType, setBulkCertType] = useState('');
  const [bulkCertExpiration, setBulkCertExpiration] = useState(moment());
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [addHoursEmployee, setAddHoursEmployee] = useState(null);
  const [addHoursData, setAddHoursData] = useState({ date: moment(), hours: '', topic: 'Inservice Training' });

  const { data: employees = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await axios.get('/api/employees');
      // For some reason some employees might have been recorded wrong, safeguard UI
      return response.data.map(emp => ({ ...emp, locations: emp.locations || [] }));
    }
  });
  const error = queryError ? 'Failed to fetch employees' : null;

  const { data: LOCATIONS = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await axios.get('/api/sites');
      return response.data.map(s => s.name);
    }
  });

  const handleError = (err, defaultMessage) => {
    console.error(err);
    setSnackbar({
      open: true,
      message: err.response?.data?.error?.message || defaultMessage,
      severity: 'error',
    });
  };

  const createMutation = useMutation({
    mutationFn: (newEmployee) => axios.post('/api/employees', newEmployee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSnackbar({ open: true, message: 'Employee added successfully', severity: 'success' });
      handleCloseDialog();
    },
    onError: (err) => handleError(err, 'Failed to add employee')
  });

  const updateMutation = useMutation({
    mutationFn: (data) => axios.put(`/api/employees/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSnackbar({ open: true, message: 'Employee updated successfully', severity: 'success' });
      handleCloseDialog();
    },
    onError: (err) => handleError(err, 'Failed to update employee')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axios.delete(`/api/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSnackbar({ open: true, message: 'Employee archived successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to archive employee')
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (promises) => Promise.all(promises),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSnackbar({ open: true, message: 'Locations assigned successfully', severity: 'success' });
      setOpenBulkDialog(false);
      setSelectedEmployees([]);
      setBulkLocations([]);
    },
    onError: (err) => handleError(err, 'Failed to assign locations')
  });

  const bulkAssignCertMutation = useMutation({
    mutationFn: (promises) => Promise.all(promises),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSnackbar({ open: true, message: 'Certification assigned to selected employees', severity: 'success' });
      setOpenBulkCertDialog(false);
      setSelectedEmployees([]);
      setBulkCertType('');
      setBulkCertExpiration(moment());
    },
    onError: (err) => handleError(err, 'Failed to assign certification')
  });

  const backfillCertsMutation = useMutation({
    mutationFn: (promises) => Promise.all(promises),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSnackbar({
        open: true,
        message: `Backfilled Lifeguarding certification for ${results.length} employee${results.length !== 1 ? 's' : ''}`,
        severity: 'success',
      });
    },
    onError: (err) => handleError(err, 'Failed to backfill certifications')
  });

  const addHoursMutation = useMutation({
    mutationFn: ({ employeeId, ...sessionData }) => axios.post(`/api/training-sessions/${employeeId}`, sessionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSnackbar({ open: true, message: 'Hours added successfully', severity: 'success' });
      handleCloseAddHoursDialog();
    },
    onError: (err) => {
      // The training-sessions endpoint's duplicate check responds with a plain
      // { message } body, not the { error: { message } } shape the rest of the
      // API uses, so the generic handleError fallback won't surface it.
      const message = err.response?.status === 409
        ? 'This employee already has a session logged for that date and topic — adjust the date or topic if this is really a separate one.'
        : (err.response?.data?.error?.message || err.response?.data?.message || 'Failed to add hours');
      setSnackbar({ open: true, message, severity: 'error' });
    }
  });

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        alternateEmails: (employee.alternateEmails || []).join(', '),
        position: employee.position || '',
        phone: employee.phone || '',
        hireDate: moment(employee.hireDate),
        locations: employee.locations || [],
        homeLocation: employee.homeLocation || (employee.locations && employee.locations[0]) || '',
        certifications: (employee.certifications || []).map((c) => ({ ...c, expirationDate: moment(c.expirationDate) })),
        badgeNumber: employee.badgeNumber || '',
        isSupervisor: employee.isSupervisor || false,
        supervisorScope: employee.supervisorScope || 'locations',
        isTrainer: employee.isTrainer || false,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        alternateEmails: '',
        position: '',
        hireDate: moment(),
        locations: [],
        homeLocation: '',
        certifications: [],
        badgeNumber: '',
        isSupervisor: false,
        supervisorScope: 'locations',
        isTrainer: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      alternateEmails: '',
      position: '',
      hireDate: moment(),
      locations: [],
      homeLocation: '',
      certifications: [],
      badgeNumber: '',
      isSupervisor: false,
      supervisorScope: 'locations',
      isTrainer: false,
    });
  };

  const handleAddCertification = () => {
    setFormData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { type: '', expirationDate: moment() }],
    }));
  };

  const handleCertificationChange = (index, field, value) => {
    setFormData((prev) => {
      const certifications = [...prev.certifications];
      certifications[index] = { ...certifications[index], [field]: value };
      return { ...prev, certifications };
    });
  };

  const handleRemoveCertification = (index) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      alternateEmails: formData.alternateEmails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
      certifications: formData.certifications
        .filter((c) => c.type && c.expirationDate)
        .map((c) => ({ type: c.type, expirationDate: moment(c.expirationDate).format('YYYY-MM-DD') })),
    };
    if (editingEmployee) {
      updateMutation.mutate({
        id: editingEmployee.id,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleArchive = (employee) => {
    if (window.confirm('Are you sure you want to archive this employee?')) {
      deleteMutation.mutate(employee.id);
    }
  };

  const handleUnarchive = (employee) => {
    updateMutation.mutate({ id: employee.id, isActive: true });
  };

  const handleOpenAddHoursDialog = (employee) => {
    setAddHoursEmployee(employee);
    setAddHoursData({ date: moment(), hours: '', topic: 'Inservice Training' });
  };

  const handleCloseAddHoursDialog = () => {
    setAddHoursEmployee(null);
    setAddHoursData({ date: moment(), hours: '', topic: 'Inservice Training' });
  };

  const handleAddHours = () => {
    const hrs = parseFloat(addHoursData.hours);
    if (!addHoursEmployee || !hrs || hrs <= 0) return;
    addHoursMutation.mutate({
      employeeId: addHoursEmployee.id,
      date: moment(addHoursData.date).format('YYYY-MM-DD'),
      location: addHoursEmployee.homeLocation || (addHoursEmployee.locations || [])[0] || 'Unknown',
      startTime: '09:00',
      length: hrs,
      topics: [addHoursData.topic || 'Inservice Training'],
      trainer: user?.name || user?.email || 'Manual Entry',
      status: 'completed',
    });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleLocationChange = (event) => {
    setFormData({
      ...formData,
      locations: event.target.value,
    });
  };

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      }
      return [...prev, employeeId];
    });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedEmployees(sortedEmployees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleBulkLocationChange = (event) => {
    setBulkLocations(event.target.value);
  };

  const handleBulkAssignLocations = () => {
    const promises = selectedEmployees.map(employeeId =>
      axios.put(`/api/employees/${employeeId}`, { locations: bulkLocations })
    );
    bulkUpdateMutation.mutate(promises);
  };

  const handleBulkAssignCertification = () => {
    const expirationStr = moment(bulkCertExpiration).format('YYYY-MM-DD');
    const promises = selectedEmployees.map(employeeId => {
      const employee = employees.find(emp => emp.id === employeeId);
      // Replace any existing entry of the same type (a bulk recert) rather than
      // duplicating it, but leave other certification types on the employee alone.
      const otherCerts = (employee?.certifications || []).filter(c => c.type !== bulkCertType);
      return axios.put(`/api/employees/${employeeId}`, {
        certifications: [...otherCerts, { type: bulkCertType, expirationDate: expirationStr }],
      });
    });
    bulkAssignCertMutation.mutate(promises);
  };

  // Employees whose spreadsheet import stored a certification expiration date
  // but never got a matching entry in the certifications array the
  // Certifications/compliance page actually reads (fixed for new imports,
  // but already-imported employees need a one-time backfill).
  const employeesNeedingCertBackfill = employees.filter(
    (emp) => emp.certificationExpiration && (!Array.isArray(emp.certifications) || emp.certifications.length === 0)
  );

  const handleBackfillCertifications = () => {
    if (employeesNeedingCertBackfill.length === 0) return;
    const confirmed = window.confirm(
      `Backfill a Lifeguarding certification for ${employeesNeedingCertBackfill.length} employee(s), using the expiration date already on file for each? This only fills in employees who have no certifications tracked yet — it won't touch anyone who already has one.`
    );
    if (!confirmed) return;
    const promises = employeesNeedingCertBackfill.map((emp) =>
      axios.put(`/api/employees/${emp.id}`, {
        certifications: [{ type: 'Lifeguarding', expirationDate: emp.certificationExpiration }],
      })
    );
    backfillCertsMutation.mutate(promises);
  };

  const getLocationSummary = () => {
    const summary = {};
    LOCATIONS.forEach(location => {
      summary[location] = employees.filter(emp => 
        emp.isActive === (activeTab === 0) && 
        emp.locations.includes(location)
      ).length;
    });
    return summary;
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesActiveTab = activeTab === 0 ? employee.isActive : !employee.isActive;
    const matchesLocation = !selectedLocation || employee.locations.includes(selectedLocation);
    const matchesSearch = !searchQuery.trim() || (employee.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesActiveTab && matchesLocation && matchesSearch;
  });

  const getRoleLabel = (employee) => {
    if (employee.isSupervisor) return employee.supervisorScope === 'all' ? 'Supervisor (all sites)' : 'Supervisor';
    if (employee.isTrainer) return 'Trainer';
    return '';
  };

  // Depth is stored as free text (e.g. "7ft"); pull out the leading number so
  // sorting is numeric ("7ft" < "13ft") instead of lexicographic ("13ft" < "7ft").
  const getDepthSortValue = (depth) => {
    const match = String(depth || '').match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  };

  const compareEmployees = (a, b) => {
    switch (sortBy) {
      case 'position':
        return (a.position || '').localeCompare(b.position || '');
      case 'role':
        return getRoleLabel(a).localeCompare(getRoleLabel(b));
      case 'hireDate':
        return moment(a.hireDate).valueOf() - moment(b.hireDate).valueOf();
      case 'homeLocation':
        return (a.homeLocation || '').localeCompare(b.homeLocation || '');
      case 'depth': {
        const aVal = getDepthSortValue(a.depth);
        const bVal = getDepthSortValue(b.depth);
        if (aVal === null && bVal === null) return String(a.depth || '').localeCompare(String(b.depth || ''));
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return aVal - bVal;
      }
      case 'name':
      default:
        return (a.name || '').localeCompare(b.name || '');
    }
  };

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const result = compareEmployees(a, b);
    return sortDirection === 'asc' ? result : -result;
  });

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  const locationSummary = getLocationSummary();

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h4" component="h1">
            Manage Employees
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setOpenImportDialog(true)}
            >
              Import from Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Employee
            </Button>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {employeesNeedingCertBackfill.length > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleBackfillCertifications} disabled={backfillCertsMutation.isPending}>
                Backfill Now
              </Button>
            }
          >
            {employeesNeedingCertBackfill.length} employee{employeesNeedingCertBackfill.length !== 1 ? 's have' : ' has'} a certification
            expiration date on file but no tracked certification — likely from an Excel import done before this was fixed.
          </Alert>
        )}

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Active Employees" />
          <Tab label="Archived Employees" />
        </Tabs>

        {/* Location Summary */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Location Summary
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
              {Object.entries(locationSummary).map(([location, count]) => (
                <Box
                  key={location}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'primary.light',
                    borderRadius: 1,
                    color: 'white',
                  }}
                >
                  <LocationIcon />
                  <Typography>
                    {location}: {count} {count === 1 ? 'employee' : 'employees'}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Search, Location Filter, and Sort */}
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', rowGap: 2 }}>
          <TextField
            label="Search by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
            sx={{ minWidth: 220 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Location</InputLabel>
            <Select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              label="Filter by Location"
            >
              <MenuItem value="">All Locations</MenuItem>
              {LOCATIONS.map((location) => (
                <MenuItem key={location} value={location}>
                  {location}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort by"
              >
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
            </IconButton>
          </Box>
        </Stack>

        {/* Bulk Actions */}
        {selectedEmployees.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => setOpenBulkDialog(true)}
            >
              Assign Locations to Selected ({selectedEmployees.length})
            </Button>
            <Button
              variant="outlined"
              onClick={() => setOpenBulkCertDialog(true)}
            >
              Assign Certification to Selected ({selectedEmployees.length})
            </Button>
          </Box>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedEmployees.length === sortedEmployees.length && sortedEmployees.length > 0}
                    indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < sortedEmployees.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Badge #</TableCell>
                <TableCell>Home Location</TableCell>
                <TableCell>Depth</TableCell>
                <TableCell>Locations</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Hire Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => handleSelectEmployee(employee.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      component="button"
                      onClick={() => router.push(`/manage-employees/${employee.id}`)}
                      sx={{ textAlign: 'left' }}
                    >
                      {employee.name}
                    </Link>
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.badgeNumber || '—'}</TableCell>
                  <TableCell>{employee.homeLocation || '—'}</TableCell>
                  <TableCell>{employee.depth || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(employee.locations || []).map((location) => (
                        <Chip
                          key={location}
                          label={location}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {employee.isSupervisor && (
                        <Chip
                          label={employee.supervisorScope === 'all' ? 'Supervisor (all sites)' : 'Supervisor'}
                          size="small"
                          color="secondary"
                        />
                      )}
                      {employee.isTrainer && (
                        <Chip label="Trainer" size="small" color="info" />
                      )}
                      {!employee.isSupervisor && !employee.isTrainer && '—'}
                    </Box>
                  </TableCell>
                  <TableCell>{moment(employee.hireDate).format('MMM D, YYYY')}</TableCell>
                  <TableCell>
                    {activeTab === 0 ? (
                      <>
                        <IconButton onClick={() => handleOpenDialog(employee)} title="Edit">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleOpenAddHoursDialog(employee)} title="Add Hours">
                          <MoreTimeIcon />
                        </IconButton>
                        <IconButton onClick={() => handleArchive(employee)} title="Archive">
                          <ArchiveIcon />
                        </IconButton>
                      </>
                    ) : (
                      <IconButton onClick={() => handleUnarchive(employee)} title="Unarchive">
                        <UnarchiveIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Employee Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
          </DialogTitle>
          <DialogContent>
            <LocalizationProvider dateAdapter={AdapterMoment}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Badge Number"
                  value={formData.badgeNumber}
                  onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                  helperText="Used by employees to look themselves up on the self check-in page"
                />
              </Grid>
              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel>Locations</InputLabel>
                  <Select
                    multiple
                    value={formData.locations}
                    onChange={handleLocationChange}
                    label="Locations"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {LOCATIONS.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel>Home Location</InputLabel>
                  <Select
                    value={formData.homeLocation}
                    onChange={(e) => setFormData({ ...formData, homeLocation: e.target.value })}
                    label="Home Location"
                  >
                    {LOCATIONS.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Certifications
                </Typography>
                <Stack spacing={1.5}>
                  {formData.certifications.map((cert, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Autocomplete
                        freeSolo
                        fullWidth
                        options={CERTIFICATION_TYPE_SUGGESTIONS}
                        value={cert.type}
                        onInputChange={(e, value) => handleCertificationChange(index, 'type', value)}
                        renderInput={(params) => (
                          <TextField {...params} label="Certification Type" size="small" />
                        )}
                        sx={{ flex: 2 }}
                      />
                      <DatePicker
                        label="Expiration Date"
                        value={cert.expirationDate}
                        onChange={(newValue) => handleCertificationChange(index, 'expirationDate', newValue)}
                        slotProps={{ textField: { size: 'small', sx: { flex: 1 } } }}
                      />
                      <IconButton onClick={() => handleRemoveCertification(index)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button startIcon={<AddIcon />} onClick={handleAddCertification} size="small" sx={{ alignSelf: 'flex-start' }}>
                    Add Certification
                  </Button>
                </Stack>
              </Grid>
              <Grid size={12}>
                <DatePicker
                  label="Hire Date"
                  value={formData.hireDate}
                  onChange={(newValue) => setFormData({ ...formData, hireDate: newValue })}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isSupervisor}
                      onChange={(e) => setFormData({ ...formData, isSupervisor: e.target.checked })}
                    />
                  }
                  label="This employee is a supervisor (gets dashboard access to track training hours)"
                />
              </Grid>
              {formData.isSupervisor && (
                <Grid size={12}>
                  <FormControl fullWidth>
                    <InputLabel>Supervisor Scope</InputLabel>
                    <Select
                      value={formData.supervisorScope}
                      label="Supervisor Scope"
                      onChange={(e) => setFormData({ ...formData, supervisorScope: e.target.value })}
                    >
                      <MenuItem value="locations">Their assigned location(s) only</MenuItem>
                      <MenuItem value="all">All locations (company-wide)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isTrainer}
                      onChange={(e) => setFormData({ ...formData, isTrainer: e.target.checked })}
                    />
                  }
                  label="This employee is a trainer (can lead training sessions, gets the trainer dashboard)"
                />
              </Grid>
              {(formData.isSupervisor || formData.isTrainer) && (
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Alternate Login Emails"
                    value={formData.alternateEmails}
                    onChange={(e) => setFormData({ ...formData, alternateEmails: e.target.value })}
                    helperText="Comma-separated. Use this if they sign in with more than one email (e.g. personal Google + work Microsoft account)."
                  />
                </Grid>
              )}
            </Grid>
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingEmployee ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Assign Locations Dialog */}
        <Dialog open={openBulkDialog} onClose={() => setOpenBulkDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Assign Locations to Selected Employees
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth required sx={{ mt: 2 }}>
              <InputLabel>Locations</InputLabel>
              <Select
                multiple
                value={bulkLocations}
                onChange={handleBulkLocationChange}
                label="Locations"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {LOCATIONS.map((location) => (
                  <MenuItem key={location} value={location}>
                    {location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBulkDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkAssignLocations} variant="contained">
              Assign Locations
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Assign Certification Dialog */}
        <Dialog open={openBulkCertDialog} onClose={() => setOpenBulkCertDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Assign Certification to Selected Employees
          </DialogTitle>
          <DialogContent>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Applies to all {selectedEmployees.length} selected employee{selectedEmployees.length !== 1 ? 's' : ''}. If someone
                  already has a certification of this type, its expiration date will be updated instead of duplicated.
                </Typography>
                <Autocomplete
                  freeSolo
                  options={CERTIFICATION_TYPE_SUGGESTIONS}
                  value={bulkCertType}
                  onInputChange={(e, value) => setBulkCertType(value)}
                  renderInput={(params) => (
                    <TextField {...params} label="Certification Type" required />
                  )}
                />
                <DatePicker
                  label="Expiration Date"
                  value={bulkCertExpiration}
                  onChange={(newValue) => setBulkCertExpiration(newValue)}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Stack>
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBulkCertDialog(false)}>Cancel</Button>
            <Button
              onClick={handleBulkAssignCertification}
              variant="contained"
              disabled={!bulkCertType || bulkAssignCertMutation.isPending}
            >
              Assign Certification
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Hours Dialog — manual backup for crediting inservice hours
            when they weren't (or can't be) added through a training session,
            e.g. correcting a bulk import gap or logging offline training. */}
        <Dialog open={!!addHoursEmployee} onClose={handleCloseAddHoursDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            Add Hours{addHoursEmployee ? ` — ${addHoursEmployee.name}` : ''}
          </DialogTitle>
          <DialogContent>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <DatePicker
                  label="Date"
                  value={addHoursData.date}
                  onChange={(newValue) => setAddHoursData((prev) => ({ ...prev, date: newValue }))}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
                <TextField
                  fullWidth
                  label="Hours"
                  type="number"
                  inputProps={{ min: 0, step: 0.5 }}
                  value={addHoursData.hours}
                  onChange={(e) => setAddHoursData((prev) => ({ ...prev, hours: e.target.value }))}
                  required
                />
                <TextField
                  fullWidth
                  label="Topic"
                  value={addHoursData.topic}
                  onChange={(e) => setAddHoursData((prev) => ({ ...prev, topic: e.target.value }))}
                  helperText="Defaults to 'Inservice Training' — change it if this is for something more specific"
                />
              </Stack>
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddHoursDialog}>Cancel</Button>
            <Button
              onClick={handleAddHours}
              variant="contained"
              disabled={!addHoursData.hours || parseFloat(addHoursData.hours) <= 0 || addHoursMutation.isPending}
            >
              Add Hours
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>

      <ImportEmployeesDialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
      />
    </Container>
  );
};

export default ManageEmployees; 