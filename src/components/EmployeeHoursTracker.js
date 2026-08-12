'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
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
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Same queryKeys as manager-dashboard/page.js (and add-training/
  // trainer-dashboard for 'employees') — when this renders alongside the
  // dashboard, which already fetches both, these resolve from cache instead
  // of firing duplicate requests.
  const { data: employees = [], isLoading: loading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/employees`);
      return data;
    },
  });

  const needsSites = !allowedLocations || allowedLocations.length === 0;
  const { data: allSites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sites`);
      return data.map((s) => s.name);
    },
    enabled: needsSites,
  });
  const locations = allowedLocations && allowedLocations.length ? allowedLocations : allSites;

  // /api/compliance/status already computes each active employee's hours
  // scoped to a single calendar month (defaults to the current one) by
  // summing their trainingSessions within that date range — unlike
  // emp.totalHours on the employee record, which is a running lifetime total
  // and previously made every employee look "Complete" once historical hours
  // (e.g. from a bulk Excel import) pushed their all-time total past 4.
  // Keyed by the current calendar month (not a prop) since that's always
  // what this component shows — this happens to match manager-dashboard's
  // own ['compliance-status', month] query whenever its filter is on the
  // current month too (the default), so the two share cache in that case.
  const { data: complianceData } = useQuery({
    queryKey: ['compliance-status', moment().format('YYYY-MM')],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/compliance/status`);
      return data;
    },
  });
  const hoursThisMonthById = {};
  (complianceData?.allEmployees || []).forEach((emp) => {
    hoursThisMonthById[emp.id] = emp.hoursThisMonth;
  });

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

  const employeesWithHours = filteredEmployees.map(emp => {
    const totalHours = hoursThisMonthById[emp.id] ?? 0;
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
