'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
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
  Chip,
} from '@mui/material';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import moment from 'moment';
import { useAuth } from '../../components/AuthContext';

ChartJS.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

type Period = 'week' | 'month' | 'year';

interface SessionAnalytics {
  period: Period;
  totalSessions: number;
  topics: { topic: string; count: number }[];
  trainers: { name: string; count: number }[];
}

interface SiteSummary {
  total: number;
  compliant: number;
  percentCompliant: number;
}

interface ComplianceOutlookMonth {
  period: 'month';
  monthKey: string;
  bySite: Record<string, SiteSummary>;
  overall: SiteSummary;
}

interface WeekSiteSummary {
  totalHoursLoggedThisWeek: number;
  employeeCount: number;
}

interface ComplianceOutlookWeek {
  period: 'week';
  bySite: Record<string, WeekSiteSummary>;
  overall: WeekSiteSummary;
}

interface YearPoint {
  monthKey: string;
  percentCompliant: number;
  total: number;
}

interface ComplianceOutlookYear {
  period: 'year';
  months: string[];
  bySite: Record<string, YearPoint[]>;
  overall: YearPoint[];
}

type ComplianceOutlook = ComplianceOutlookMonth | ComplianceOutlookWeek | ComplianceOutlookYear;

const LINE_COLORS = ['#0090C7', '#00B893', '#e65100', '#c62828', '#6a1b9a', '#00838f', '#f9a825', '#3949ab', '#5d4037'];

export default function TrainingAnalyticsPage() {
  const { user } = useAuth();
  const isScopedSupervisor = user?.role === 'supervisor' && user?.supervisorScope === 'locations';

  const { data: allSites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sites`);
      return data.map((s: any) => s.name) as string[];
    },
  });

  const allowedSites = isScopedSupervisor && user?.supervisorLocations?.length ? user.supervisorLocations : allSites;

  // Same multi-select "all" sentinel convention as manager-dashboard/page.js's locationFilters.
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

  const { data: sessionAnalytics, isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ['training-analytics-sessions', period, sitesParam],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/training-analytics/sessions`, {
        params: { period, sites: sitesParam },
      });
      return data as SessionAnalytics;
    },
  });

  const { data: complianceOutlook, isLoading: outlookLoading, error: outlookError } = useQuery({
    queryKey: ['training-analytics-compliance-outlook', period, sitesParam],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/training-analytics/compliance-outlook`, {
        params: { period, sites: sitesParam },
      });
      return data as ComplianceOutlook;
    },
  });

  const topicsChartData = {
    labels: (sessionAnalytics?.topics ?? []).map((t) => t.topic),
    datasets: [{ label: 'Sessions', data: (sessionAnalytics?.topics ?? []).map((t) => t.count), backgroundColor: '#0090C7' }],
  };

  const trainersChartData = {
    labels: (sessionAnalytics?.trainers ?? []).map((t) => t.name),
    datasets: [{ label: 'Sessions Led', data: (sessionAnalytics?.trainers ?? []).map((t) => t.count), backgroundColor: '#00B893' }],
  };

  const chartOptions = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    maintainAspectRatio: false,
  };

  const percentColor = (pct: number): 'success' | 'warning' | 'error' =>
    pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'error';

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Training Analytics
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                <MenuItem value="week">Week</MenuItem>
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="year">Year</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>
{/* Compliance outlook */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Compliance Outlook
          </Typography>

          {outlookLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : outlookError ? (
            <Alert severity="error">Failed to load compliance outlook.</Alert>
          ) : !complianceOutlook ? null : complianceOutlook.period === 'month' ? (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Company-wide</Typography>
                  <Typography variant="h4" fontWeight="bold">{complianceOutlook.overall.percentCompliant}%</Typography>
                  <Chip
                    size="small"
                    label={`${complianceOutlook.overall.compliant} / ${complianceOutlook.overall.total} compliant`}
                    color={percentColor(complianceOutlook.overall.percentCompliant)}
                  />
                </Card>
              </Grid>
              {Object.entries(complianceOutlook.bySite).map(([site, summary]) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={site}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">{site}</Typography>
                    {summary.total === 0 ? (
                      <Typography color="text.secondary" sx={{ py: 1 }}>No staff at this site</Typography>
                    ) : (
                      <>
                        <Typography variant="h4" fontWeight="bold">{summary.percentCompliant}%</Typography>
                        <Chip
                          size="small"
                          label={`${summary.compliant} / ${summary.total} compliant`}
                          color={percentColor(summary.percentCompliant)}
                        />
                      </>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : complianceOutlook.period === 'week' ? (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Compliance is assessed monthly — this is an early-week progress signal, not a pass/fail.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">Company-wide</Typography>
                    <Typography variant="h4" fontWeight="bold">{complianceOutlook.overall.totalHoursLoggedThisWeek}</Typography>
                    <Typography variant="body2" color="text.secondary">hrs logged this week</Typography>
                  </Card>
                </Grid>
                {Object.entries(complianceOutlook.bySite).map(([site, summary]) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={site}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary">{site}</Typography>
                      <Typography variant="h4" fontWeight="bold">{summary.totalHoursLoggedThisWeek}</Typography>
                      <Typography variant="body2" color="text.secondary">hrs logged this week</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          ) : (
            <Box sx={{ height: 360 }}>
              <Line
                data={{
                  labels: complianceOutlook.months.map((m) => moment(m, 'YYYY-MM').format('MMM YYYY')),
                  datasets: isAllSites
                    ? [{
                        label: 'Company-wide',
                        data: complianceOutlook.overall.map((p) => p.percentCompliant),
                        borderColor: LINE_COLORS[0],
                        backgroundColor: LINE_COLORS[0],
                        tension: 0.2,
                      }]
                    : siteFilters
                        .filter((site) => complianceOutlook.bySite[site])
                        .map((site, idx) => ({
                          label: site,
                          data: complianceOutlook.bySite[site].map((p) => p.percentCompliant),
                          borderColor: LINE_COLORS[idx % LINE_COLORS.length],
                          backgroundColor: LINE_COLORS[idx % LINE_COLORS.length],
                          tension: 0.2,
                        })),
                }}
                options={{
                  plugins: { legend: { display: true } },
                  scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } } },
                  maintainAspectRatio: false,
                }}
              />
            </Box>
          )}
        </Paper>
        {/* Topics + Trainers */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Most Taught Topics
              </Typography>
              {sessionsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : sessionsError ? (
                <Alert severity="error">Failed to load session analytics.</Alert>
              ) : (sessionAnalytics?.topics ?? []).length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No sessions found for the selected period and site(s).
                </Typography>
              ) : (
                <Box sx={{ height: 300 }}>
                  <Bar data={topicsChartData} options={chartOptions} />
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Sessions Led by Trainer
              </Typography>
              {sessionsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : sessionsError ? (
                <Alert severity="error">Failed to load session analytics.</Alert>
              ) : (sessionAnalytics?.trainers ?? []).length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No sessions found for the selected period and site(s).
                </Typography>
              ) : (
                <Box sx={{ height: 300 }}>
                  <Bar data={trainersChartData} options={chartOptions} />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        
      </Box>
    </Container>
  );
}
