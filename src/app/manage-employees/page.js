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
import { Edit as EditIcon, Archive as ArchiveIcon, Add as AddIcon, LocationOn as LocationIcon, Unarchive } from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';

const LOCATIONS = ['MCAC', 'Ramsey Creek Beach', 'Double Oaks', 'Cordelia'];

const ManageEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    fetchEmployees();
  }, [activeTab]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async () => {
    try {
      if (editingEmployee) {
        await axios.put('/api/employees', {
          id: editingEmployee.id,
          ...formData,
        });
        setSnackbar({
          open: true,
          message: 'Employee updated successfully',
          severity: 'success',
        });
      } else {
        await axios.post('/api/employees', formData);
        setSnackbar({
          open: true,
          message: 'Employee added successfully',
          severity: 'success',
        });
      }
      handleCloseDialog();
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to save employee',
        severity: 'error',
      });
    }
  };

  const handleArchive = async (employee) => {
    if (window.confirm('Are you sure you want to archive this employee?')) {
      try {
        await axios.delete(`/api/employees?id=${employee.id}`);
        setSnackbar({
          open: true,
          message: 'Employee archived successfully',
          severity: 'success',
        });
        fetchEmployees();
      } catch (error) {
        console.error('Error archiving employee:', error);
        setSnackbar({
          open: true,
          message: 'Failed to archive employee',
          severity: 'error',
        });
      }
    }
  };

    const handleUnarchive = async (employee) => {
    try {
      await axios.put(`/api/employees`, {
        id: employee.id,
        isActive: true,
        archivedAt: null,
      });
      setSnackbar({
        open: true,
        message: 'Employee unarchived successfully',
        severity: 'success',
      });
      fetchEmployees(); // Refresh the employee list
    } catch (error) {
      console.error('Error unarchiving employee:', error);
      setSnackbar({
        open: true,
        message: 'Failed to unarchive employee',
        severity: 'error',
      });
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

  const handleBulkAssignLocations = async () => {
    try {
      const promises = selectedEmployees.map(employeeId => {
        const employee = employees.find(emp => emp.id === employeeId);
        return axios.put('/api/employees', {
          id: employeeId,
          locations: bulkLocations,
        });
      });

      await Promise.all(promises);
      setSnackbar({
        open: true,
        message: 'Locations assigned successfully',
        severity: 'success',
      });
      setOpenBulkDialog(false);
      setSelectedEmployees([]);
      setBulkLocations([]);
      fetchEmployees();
    } catch (error) {
      console.error('Error assigning locations:', error);
      setSnackbar({
        open: true,
        message: 'Failed to assign locations',
        severity: 'error',
      });
    }
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
        {/* <Card sx={{ mb: 3 }}>
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
        </Card> */}

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
                  {activeTab === 0 ? (
        <TableCell>
          <IconButton onClick={() => handleOpenDialog(employee)}>
            <EditIcon color='primary' />
          </IconButton>
          <IconButton onClick={() => handleArchive(employee)}>
            <ArchiveIcon color='error'/>
          </IconButton>
        </TableCell>
      ) : (
        <TableCell>
          <IconButton onClick={() => handleUnarchive(employee)}>
            <Unarchive color="success" />
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