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
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Edit as EditIcon, Archive as ArchiveIcon, Add as AddIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const LOCATIONS = ['MCAC', 'Ramsey Creek Beach', 'Double Oaks', 'Cordelia'];

const ManageEmployees = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    hireDate: moment(),
    locations: [],
  });
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const [bulkLocations, setBulkLocations] = useState([]);

  const { data: employees = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await axios.get('/api/employees');
      // For some reason some employees might have been recorded wrong, safeguard UI
      return response.data.map(emp => ({ ...emp, locations: emp.locations || [] }));
    }
  });
  const error = queryError ? 'Failed to fetch employees' : null;

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
        name: employee.name,
        email: employee.email,
        position: employee.position,
        hireDate: moment(employee.hireDate),
        locations: employee.locations || [],
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        position: '',
        hireDate: moment(),
        locations: [],
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
      position: '',
      hireDate: moment(),
      locations: [],
    });
  };

  const handleSubmit = () => {
    if (editingEmployee) {
      updateMutation.mutate({
        id: editingEmployee.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleArchive = (employee) => {
    if (window.confirm('Are you sure you want to archive this employee?')) {
      deleteMutation.mutate(employee.id);
    }
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
                <TableCell>Locations</TableCell>
                <TableCell>Hire Date</TableCell>
                {activeTab === 0 && <TableCell>Actions</TableCell>}
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
                  <TableCell>{moment(employee.hireDate).format('MMM D, YYYY')}</TableCell>
                  {activeTab === 0 && (
                    <TableCell>
                      <IconButton onClick={() => handleOpenDialog(employee)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleArchive(employee)}>
                        <ArchiveIcon />
                      </IconButton>
                    </TableCell>
                  )}
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
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
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
              <Grid item xs={12}>
                <DatePicker
                  label="Hire Date"
                  value={formData.hireDate}
                  onChange={(newValue) => setFormData({ ...formData, hireDate: newValue })}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
            </Grid>
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
    </Container>
  );
};

export default ManageEmployees; 