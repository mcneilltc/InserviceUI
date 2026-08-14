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

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

type CertStatus = {
  type: string;
  expirationDate: string | null;
  daysUntil: number | null;
  status: 'no-record' | 'expired' | 'expiring' | 'ok';
};

type EmployeeCertRow = {
  employeeId: string;
  employeeName: string;
  homeLocation: string;
  certs: CertStatus[];
};

const STATUS_CONFIG: Record<CertStatus['status'], { label: (cert: CertStatus) => string; color: 'default' | 'error' | 'warning' | 'success' }> = {
  'no-record': { label: () => 'No certification on file', color: 'default' },
  expired: { label: (cert) => `${cert.type}: Expired ${moment(cert.expirationDate).format('MM/DD/YYYY')}`, color: 'error' },
  expiring: { label: (cert) => `${cert.type}: Expires ${moment(cert.expirationDate).format('MM/DD/YYYY')} (${cert.daysUntil}d)`, color: 'warning' },
  ok: { label: (cert) => `${cert.type}: Expires ${moment(cert.expirationDate).format('MM/DD/YYYY')}`, color: 'success' },
};

export default function CertificationsPage() {
  const { user } = useAuth();
  // Site scope is fully implied by role now — only a plain Supervisor is
  // location-scoped; Senior Supervisor/Admin are always all-site.
  const isScopedSupervisor = user?.role === 'supervisor';

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

  const employeeRows: EmployeeCertRow[] = employees.map((emp): EmployeeCertRow => {
    if (!emp.certifications || emp.certifications.length === 0) {
      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        homeLocation: emp.homeLocation,
        certs: [{ type: '—', expirationDate: null, daysUntil: null, status: 'no-record' }],
      };
    }
    return {
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      homeLocation: emp.homeLocation,
      certs: emp.certifications.map((cert): CertStatus => {
        const daysUntil = moment(cert.expirationDate).startOf('day').diff(moment().startOf('day'), 'days');
        const status: CertStatus['status'] = daysUntil < 0 ? 'expired' : daysUntil <= 30 ? 'expiring' : 'ok';
        return { type: cert.type, expirationDate: cert.expirationDate, daysUntil, status };
      }),
    };
  });

  // Filter each employee's certifications to the selected window, then drop employees
  // left with none — an employee stays listed once with only the relevant certs shown.
  const filteredRows = employeeRows
    .map((row) => ({
      ...row,
      certs: dayWindow === 'all'
        ? row.certs
        : row.certs.filter((cert) => cert.status === 'no-record' || cert.status === 'expired' || (cert.daysUntil !== null && cert.daysUntil <= dayWindow)),
    }))
    .filter((row) => row.certs.length > 0);

  const sortedRows = [...filteredRows].sort((a, b) => {
    const key = (cert: CertStatus) => (cert.status === 'no-record' ? -2 : cert.status === 'expired' ? -1 : (cert.daysUntil ?? 0));
    const rowKey = (row: EmployeeCertRow) => Math.min(...row.certs.map(key));
    return rowKey(a) - rowKey(b);
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
                  <TableCell>Certifications</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>{row.employeeName}</TableCell>
                    <TableCell>{row.homeLocation || '—'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {row.certs.map((cert, idx) => (
                          <Chip
                            key={`${row.employeeId}-${idx}`}
                            size="small"
                            label={STATUS_CONFIG[cert.status].label(cert)}
                            color={STATUS_CONFIG[cert.status].color}
                            variant={cert.status === 'no-record' ? 'outlined' : 'filled'}
                          />
                        ))}
                      </Box>
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
