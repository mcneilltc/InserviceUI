'use client';

import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  TextField,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
} from '@mui/material';
import { FileDownload as FileDownloadIcon } from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { exportTableToPdf } from '../utils/pdfExport';

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

type Period = 'month' | 'year';

interface TallyRow {
  id: string;
  name: string;
  location: string;
  counts: Record<string, number>;
  total: number;
}

interface TallyResponse {
  topics: string[];
  rows: TallyRow[];
}

interface TopicTallyTableProps {
  endpoint: string; // e.g. '/api/topic-tally/employees'
  title: string;
  personLabel: string; // "Employee" or "Trainer"
}

// Roster-wide "how many times did each person cover each topic" table —
// shared by Training Analytics (per-person breakdown of the org-wide topic
// charts already there) and Reports (for CSV download). Self-contained: own
// filters, own data fetch, own export, so it drops into either page as-is.
export default function TopicTallyTable({ endpoint, title, personLabel }: TopicTallyTableProps) {
  const { user } = useAuth();
  // Site scope is fully implied by role now — only a plain Supervisor is
  // location-scoped; Senior Supervisor/Admin are always all-site.
  const isScopedSupervisor = user?.role === 'supervisor';

  const { data: allSites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sites`);
      return data.map((s: any) => s.name) as string[];
    },
  });
  const allowedSites = isScopedSupervisor && user?.supervisorLocations?.length ? user.supervisorLocations : allSites;

  // Same multi-select "all" sentinel convention as training-analytics/page.tsx.
  const [siteFilters, setSiteFilters] = useState<string[]>(['all']);
  const isAllSites = siteFilters.includes('all');
  const sitesParam = isAllSites ? undefined : siteFilters.join(',');

  const handleSiteFilterChange = (event: any) => {
    const { value } = event.target;
    const selected: string[] = typeof value === 'string' ? value.split(',') : value;
    if (selected.length === 0 || selected[selected.length - 1] === 'all') {
      setSiteFilters(['all']);
    } else {
      setSiteFilters(selected.filter((v) => v !== 'all'));
    }
  };

  const [period, setPeriod] = useState<Period>('month');
  const [month, setMonth] = useState(moment().format('YYYY-MM'));
  const [year, setYear] = useState(moment().format('YYYY'));

  const { data, isLoading, error } = useQuery({
    queryKey: ['topic-tally', endpoint, period, month, year, sitesParam],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}${endpoint}`, {
        params: {
          period,
          month: period === 'month' ? month : undefined,
          year: period === 'year' ? year : undefined,
          sites: sitesParam,
        },
      });
      return data as TallyResponse;
    },
  });

  const topics = data?.topics ?? [];
  const rows = data?.rows ?? [];

  const handleDownload = () => {
    const periodLabel = period === 'month' ? moment(month, 'YYYY-MM').format('MMMM YYYY') : year;
    exportTableToPdf({
      title: `${title} — ${periodLabel}`,
      headers: [personLabel, 'Location', ...topics, 'Total'],
      rows: rows.map((row) => [row.name, row.location, ...topics.map((t) => row.counts[t] || 0), row.total]),
      filenamePrefix: `${title}_${periodLabel}`,
    });
  };

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Site</InputLabel>
          <Select
            multiple
            value={siteFilters}
            label="Site"
            onChange={handleSiteFilterChange}
            renderValue={(selected) =>
              (selected as string[]).includes('all') ? 'All Sites' : (selected as string[]).join(', ')
            }
          >
            <MenuItem value="all">
              <Checkbox checked={isAllSites} />
              <ListItemText primary="All Sites" />
            </MenuItem>
            {allowedSites.map((site: string) => (
              <MenuItem key={site} value={site}>
                <Checkbox checked={siteFilters.includes(site)} />
                <ListItemText primary={site} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Period</InputLabel>
          <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value as Period)}>
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="year">Year</MenuItem>
          </Select>
        </FormControl>

        {period === 'month' ? (
          <TextField
            type="month"
            label="Month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        ) : (
          <TextField
            type="number"
            label="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        )}
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load {personLabel.toLowerCase()} topic tally.</Alert>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No {personLabel.toLowerCase()} training found for the selected period and site(s).
        </Typography>
      ) : (
        <>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleDownload}>
              Download PDF
            </Button>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{personLabel}</TableCell>
                  <TableCell>Location</TableCell>
                  {topics.map((topic) => (
                    <TableCell key={topic} align="right">{topic}</TableCell>
                  ))}
                  <TableCell align="right"><strong>Total</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.location}</TableCell>
                    {topics.map((topic) => (
                      <TableCell key={topic} align="right">{row.counts[topic] || ''}</TableCell>
                    ))}
                    <TableCell align="right"><strong>{row.total}</strong></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
}
