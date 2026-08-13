'use client';

import React, { useState } from 'react';
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

// employees, hoursThisMonthById, and allSites are fetched once by the parent
// dashboard (which already needs the same /api/employees, /api/compliance/status,
// and /api/sites data for its own roster/compliance views) and passed down
// here as props instead of this component independently re-fetching them.
// /api/compliance/status in particular does a full per-employee subcollection
// scan on the backend, so fetching it a second time on the same page load
// was needlessly doubling an already-expensive read.
const EmployeeHoursTracker = ({
  allowedLocations,
  employees = [],
  hoursThisMonthById = {},
  allSites = [],
  loading = false,
} = {}) => {
  const locations = allowedLocations && allowedLocations.length ? allowedLocations : allSites;
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Roster is scoped by home location — an employee's home base, not the
  // (possibly multi-site) `locations` field they're generally assigned to.
  const filteredEmployees = employees.filter(emp => {
    if (allowedLocations && allowedLocations.length && !allowedLocations.includes(emp.homeLocation)) {
      return false;
    }
    return selectedLocation === 'all' || emp.homeLocation === selectedLocation;
  });

  // Mirrors the backend's certificationStatus.hasCertificationOnFile — a
  // newly added/imported employee without one yet isn't held to the hour
  // requirement, so it's checked here too rather than only trusting
  // hoursThisMonthById to already have excluded them.
  const hasCertificationOnFile = (emp) =>
    Array.isArray(emp.certifications) && emp.certifications.some((c) => c && c.expirationDate);

  const getEmployeeStatus = (hours) => {
    const requiredHours = 4;
    if (hours >= requiredHours) return 'complete';
    if (hours >= requiredHours * 0.75) return 'atRisk';
    return 'incomplete';
  };

  const getStatusLabel = (status) => {
    if (status === 'complete') return 'Complete';
    if (status === 'atRisk') return 'At Risk';
    if (status === 'pendingCertification') return 'Pending Certification';
    return 'Incomplete';
  };

  const employeesWithHours = filteredEmployees.map(emp => {
    const totalHours = hoursThisMonthById[emp.id] ?? 0;
    const requiredHours = 4;
    const hasCert = hasCertificationOnFile(emp);
    const hoursLeft = hasCert ? Math.max(0, requiredHours - totalHours) : 0;
    const status = hasCert ? getEmployeeStatus(totalHours) : 'pendingCertification';

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
                  <TableRow key={emp.id} hover>
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
                          emp.status === 'atRisk' ? 'warning' :
                          emp.status === 'pendingCertification' ? 'default' : 'error'
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
