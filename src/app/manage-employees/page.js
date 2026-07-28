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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { Edit as EditIcon, Archive as ArchiveIcon, Unarchive as UnarchiveIcon, Add as AddIcon, LocationOn as LocationIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const ManageEmployees = () => {
  const queryClient = useQueryClient();
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
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const [bulkLocations, setBulkLocations] = useState([]);
  const [openImportDialog, setOpenImportDialog] = useState(false);

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
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
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
    return matchesActiveTab && matchesLocation;
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Manage Employees
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setOpenImportDialog(true)}
            sx={{ mr: 1 }}
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
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
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

        {/* Location Filter */}
        <FormControl sx={{ mb: 3, minWidth: 200 }}>
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

        {/* Bulk Actions */}
        {selectedEmployees.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setOpenBulkDialog(true)}
            >
              Assign Locations to Selected ({selectedEmployees.length})
            </Button>
          </Box>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedEmployees.length === filteredEmployees.length}
                    indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < filteredEmployees.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Badge #</TableCell>
                <TableCell>Home Location</TableCell>
                <TableCell>Locations</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Hire Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => handleSelectEmployee(employee.id)}
                    />
                  </TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.badgeNumber || '—'}</TableCell>
                  <TableCell>{employee.homeLocation || '—'}</TableCell>
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
                        <IconButton onClick={() => handleOpenDialog(employee)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleArchive(employee)}>
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