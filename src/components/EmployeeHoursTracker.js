'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import axios from 'axios';

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

const EmployeeHoursTracker = ({ allowedLocations } = {}) => {
  const [employees, setEmployees] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const locations = allowedLocations && allowedLocations.length ? allowedLocations : allSites;
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    if (!allowedLocations || allowedLocations.length === 0) {
      axios.get(`${BACKEND_URL}/api/sites`)
        .then((res) => setAllSites(res.data.map((s) => s.name)))
        .catch((err) => console.error('Failed to load sites:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeHours = async (employeeId) => {
    try {
      // Get all training sessions for this employee
      const response = await axios.get(`${BACKEND_URL}/api/training-sessions/employee/${employeeId}`);
      const sessions = response.data || [];
      
      // Calculate total hours (sessions store length in minutes)
      let totalMinutes = 0;
      sessions.forEach(session => {
        totalMinutes += parseFloat(session.length || 0);
      });
      
      return totalMinutes / 60; // Convert to hours
    } catch (error) {
      console.error('Error fetching employee hours:', error);
      return 0;
    }
  };

  // Roster is scoped by home location — an employee's home base, not the
  // (possibly multi-site) `locations` field they're generally assigned to.
  const filteredEmployees = employees.filter(emp => {
    if (allowedLocations && allowedLocations.length && !allowedLocations.includes(emp.homeLocation)) {
      return false;
    }
    return selectedLocation === 'all' || emp.homeLocation === selectedLocation;
  });

  const getEmployeeStatus = (hours) => {
    const requiredHours = 4;
    if (hours >= requiredHours) return 'complete';
    if (hours >= requiredHours * 0.75) return 'atRisk';
    return 'incomplete';
  };

  const getStatusColor = (status) => {
    if (status === 'complete') return '#4caf50'; // Green
    if (status === 'atRisk') return '#ffeb3b'; // Yellow
    return '#f44336'; // Red
  };

  const getStatusLabel = (status) => {
    if (status === 'complete') return 'Complete';
    if (status === 'atRisk') return 'At Risk';
    return 'Incomplete';
  };

  // For now, we'll use totalHours from employee data if available
  // In a full implementation, you'd fetch hours for each employee
  const employeesWithHours = filteredEmployees.map(emp => {
    const totalHours = emp.totalHours || 0;
    const requiredHours = 4;
    const hoursLeft = Math.max(0, requiredHours - totalHours);
    const status = getEmployeeStatus(totalHours);
    
    return {
      ...emp,
      totalHours,
      requiredHours,
      hoursLeft,
      status
    };
  });

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6">
          Employee Hours Tracker
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Home Location</InputLabel>
          <Select
            value={selectedLocation}
            label="Filter by Home Location"
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <MenuItem value="all">All Locations</MenuItem>
            {locations.map((location) => (
              <MenuItem key={location} value={location}>
                {location}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography>Loading...</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Hours Completed</TableCell>
                <TableCell align="right">Hours Left</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employeesWithHours.length > 0 ? (
                employeesWithHours.map((emp) => (
                  <TableRow 
                    key={emp.id}
                    sx={{
                      bgcolor: getStatusColor(emp.status),
                      '&:hover': { bgcolor: getStatusColor(emp.status), opacity: 0.8 }
                    }}
                  >
                    <TableCell>{emp.name}</TableCell>
                    <TableCell>{emp.homeLocation || 'Unknown'}</TableCell>
                    <TableCell align="right">{emp.totalHours ? emp.totalHours.toFixed(1) : '0.0'}</TableCell>
                    <TableCell align="right">{emp.hoursLeft ? emp.hoursLeft.toFixed(1) : '0.0'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusLabel(emp.status)} 
                        size="small"
                        color={
                          emp.status === 'complete' ? 'success' :
                          emp.status === 'atRisk' ? 'warning' : 'error'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      No employees found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default EmployeeHoursTracker;
