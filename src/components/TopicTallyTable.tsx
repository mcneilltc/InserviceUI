'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  TablePagination,
  Button,
  InputAdornment,
} from '@mui/material';
import { FileDownload as FileDownloadIcon, Search as SearchIcon } from '@mui/icons-material';
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

  // Which topic columns to show — narrowing this is what actually shrinks a
  // wide table back to a reasonable width, unlike the row filters below.
  const [topicFilters, setTopicFilters] = useState<string[]>(['all']);
  const isAllTopics = topicFilters.includes('all');
  const visibleTopics = isAllTopics ? topics : topics.filter((t) => topicFilters.includes(t));

  const handleTopicFilterChange = (event: any) => {
    const { value } = event.target;
    const selected: string[] = typeof value === 'string' ? value.split(',') : value;
    if (selected.length === 0 || selected[selected.length - 1] === 'all') {
      setTopicFilters(['all']);
    } else {
      setTopicFilters(selected.filter((v) => v !== 'all'));
    }
  };

  const [nameQuery, setNameQuery] = useState('');
  const filteredRows = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return q ? rows.filter((row) => row.name.toLowerCase().includes(q)) : rows;
  }, [rows, nameQuery]);

  const ROWS_PER_PAGE = 10;
  const [page, setPage] = useState(0);
  // A new fetch (period/site change) or a narrower search/topic selection
  // can easily leave `page` pointing past the end of the new result set —
  // reset to the first page any time what's being paginated changes,
  // including the topic-set reset below (a stale topic selection from a
  // previous period could otherwise silently filter everything out).
  useEffect(() => {
    setPage(0);
  }, [data, nameQuery, topicFilters]);
  useEffect(() => {
    setTopicFilters(['all']);
  }, [data]);

  const pagedRows = filteredRows.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  const handleDownload = () => {
    const periodLabel = period === 'month' ? moment(month, 'YYYY-MM').format('MMMM YYYY') : year;
    exportTableToPdf({
      title: `${title} — ${periodLabel}`,
      headers: [personLabel, 'Location', ...visibleTopics, 'Total'],
      rows: filteredRows.map((row) => [row.name, row.location, ...visibleTopics.map((t) => row.counts[t] || 0), row.total]),
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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          label={`Search by ${personLabel.toLowerCase()} name`}
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <FormControl fullWidth>
          <InputLabel>Topics</InputLabel>
          <Select
            multiple
            value={topicFilters}
            label="Topics"
            onChange={handleTopicFilterChange}
            renderValue={(selected) =>
              (selected as string[]).includes('all') ? 'All Topics' : (selected as string[]).join(', ')
            }
          >
            <MenuItem value="all">
              <Checkbox checked={isAllTopics} />
              <ListItemText primary="All Topics" />
            </MenuItem>
            {topics.map((topic) => (
              <MenuItem key={topic} value={topic}>
                <Checkbox checked={topicFilters.includes(topic)} />
                <ListItemText primary={topic} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
      ) : filteredRows.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No {personLabel.toLowerCase()} matches &quot;{nameQuery}&quot;.
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
                  {visibleTopics.map((topic) => (
                    <TableCell key={topic} align="right">{topic}</TableCell>
                  ))}
                  <TableCell align="right"><strong>Total</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.location}</TableCell>
                    {visibleTopics.map((topic) => (
                      <TableCell key={topic} align="right">{row.counts[topic] || ''}</TableCell>
                    ))}
                    <TableCell align="right"><strong>{row.total}</strong></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={ROWS_PER_PAGE}
            rowsPerPageOptions={[ROWS_PER_PAGE]}
          />
        </>
      )}
    </Paper>
  );
}
