'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
} from '@mui/material';
import axios from 'axios';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../components/AuthContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

type CertRow = {
  employeeId: string;
  employeeName: string;
  homeLocation: string;
  type: string;
  expirationDate: string | null;
  daysUntil: number | null;
  status: 'no-record' | 'expired' | 'expiring' | 'ok';
};

const STATUS_CONFIG: Record<CertRow['status'], { label: (row: CertRow) => string; color: 'default' | 'error' | 'warning' | 'success' }> = {
  'no-record': { label: () => 'No certification on file', color: 'default' },
  expired: { label: (row) => `Expired ${moment(row.expirationDate).format('MM/DD/YYYY')}`, color: 'error' },
  expiring: { label: (row) => `Expires ${moment(row.expirationDate).format('MM/DD/YYYY')} (${row.daysUntil}d)`, color: 'warning' },
  ok: { label: (row) => `Expires ${moment(row.expirationDate).format('MM/DD/YYYY')}`, color: 'success' },
};

export default function CertificationsPage() {
  const { user } = useAuth();
  const isScopedSupervisor = user?.role === 'supervisor' && user?.supervisorScope === 'locations';

  const { data: SITES = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sites`);
      return data.map((s: any) => s.name);
    }
  });

  const allowedSites = isScopedSupervisor && user.supervisorLocations?.length ? user.supervisorLocations : SITES;

  const [siteFilter, setSiteFilter] = useState('all');
  const [dayWindow, setDayWindow] = useState<'all' | 30 | 60 | 90>('all');

  const sitesParam = siteFilter === 'all' ? undefined : siteFilter;

  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['certifications', sitesParam],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/certifications`, {
        params: sitesParam ? { sites: sitesParam } : undefined,
      });
      return data as { employeeId: string; employeeName: string; homeLocation: string; certifications: { type: string; expirationDate: string }[] }[];
    },
  });

  const rows: CertRow[] = employees.flatMap((emp): CertRow[] => {
    if (!emp.certifications || emp.certifications.length === 0) {
      return [{
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        homeLocation: emp.homeLocation,
        type: '—',
        expirationDate: null,
        daysUntil: null,
        status: 'no-record',
      }];
    }
    return emp.certifications.map((cert): CertRow => {
      const daysUntil = moment(cert.expirationDate).startOf('day').diff(moment().startOf('day'), 'days');
      const status: CertRow['status'] = daysUntil < 0 ? 'expired' : daysUntil <= 30 ? 'expiring' : 'ok';
      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        homeLocation: emp.homeLocation,
        type: cert.type,
        expirationDate: cert.expirationDate,
        daysUntil,
        status,
      };
    });
  });

  const filteredRows = rows.filter((row) => {
    if (dayWindow === 'all') return true;
    if (row.status === 'no-record' || row.status === 'expired') return true;
    return row.daysUntil !== null && row.daysUntil <= dayWindow;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    const key = (r: CertRow) => (r.status === 'no-record' ? -2 : r.status === 'expired' ? -1 : (r.daysUntil ?? 0));
    return key(a) - key(b);
  });

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          Certifications
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Site</InputLabel>
            <Select value={siteFilter} label="Site" onChange={(e) => setSiteFilter(e.target.value)}>
              <MenuItem value="all">{isScopedSupervisor ? 'All My Sites' : 'All Sites'}</MenuItem>
              {allowedSites.map((site: string) => (
                <MenuItem key={site} value={site}>{site}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <ToggleButtonGroup
            value={dayWindow}
            exclusive
            onChange={(e, value) => value !== null && setDayWindow(value)}
            size="small"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value={30}>Next 30 days</ToggleButton>
            <ToggleButton value={60}>Next 60 days</ToggleButton>
            <ToggleButton value={90}>Next 90 days</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load certifications.</Alert>}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : sortedRows.length === 0 ? (
          <Typography color="text.secondary">No certifications match this filter.</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Home Location</TableCell>
                  <TableCell>Certification</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRows.map((row, idx) => (
                  <TableRow key={`${row.employeeId}-${idx}`}>
                    <TableCell>{row.employeeName}</TableCell>
                    <TableCell>{row.homeLocation || '—'}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_CONFIG[row.status].label(row)}
                        color={STATUS_CONFIG[row.status].color}
                        variant={row.status === 'no-record' ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}
