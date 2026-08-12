'use client';

import React, { useState } from 'react';
import {
  Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails,
  Grid, Card, CardContent, Chip, Stack, CircularProgress, Alert, Dialog,
  DialogContent, IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

interface Session {
  id: string;
  date: string;
  location: string;
  topics: string[];
  trainer: string[];
  sheetImageCount: number;
}

interface Employee {
  id: string;
  name: string;
}

// Groups sessions that have sign-in sheet photos by the training's own date
// (not upload time) — Year > Month, most recent first, matching how a
// supervisor would look back for "the packet from last March".
function groupByYearMonth(sessions: Session[]) {
  const years = new Map<string, Map<string, Session[]>>();
  for (const session of sessions) {
    const date = moment(session.date, ['YYYY-MM-DD', moment.ISO_8601]);
    if (!date.isValid()) continue;
    const year = date.format('YYYY');
    const monthKey = date.format('YYYY-MM');
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year)!;
    if (!months.has(monthKey)) months.set(monthKey, []);
    months.get(monthKey)!.push(session);
  }

  return [...years.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([monthKey, sessions]) => ({
          monthKey,
          label: moment(monthKey, 'YYYY-MM').format('MMMM'),
          sessions: sessions.sort((a, b) => b.date.localeCompare(a.date)),
        })),
    }));
}

export default function SignInSheetsPage() {
  const [imagesByMonth, setImagesByMonth] = useState<Record<string, Record<string, string[]>>>({});
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data: sessions = [] as Session[], isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sessions`);
      return data;
    },
  });

  const { data: employees = [] as Employee[] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/employees`);
      return data;
    },
  });

  const trainerName = (id: string) => employees.find((e) => e.id === id)?.name || id;

  const sessionsWithPhotos = (sessions as Session[]).filter((s) => s.sheetImageCount > 0);
  const grouped = groupByYearMonth(sessionsWithPhotos);

  // Signed URLs expire 5 minutes after they're issued (see
  // getSignedSheetImageUrl in the backend), so photos are fetched lazily —
  // only for the month a supervisor actually opens — rather than minting
  // URLs for every session up front.
  const loadMonthImages = async (monthKey: string, monthSessions: Session[]) => {
    if (imagesByMonth[monthKey]) return;
    setLoadingMonth(monthKey);
    try {
      const results = await Promise.all(
        monthSessions.map(async (s) => {
          const { data } = await axios.get(`${BACKEND_URL}/api/sessions/${s.id}/images`);
          return [s.id, data.urls as string[]] as const;
        })
      );
      setImagesByMonth((prev) => ({ ...prev, [monthKey]: Object.fromEntries(results) }));
    } finally {
      setLoadingMonth(null);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>Sign-In Sheets</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Uploaded sign-in sheet photos, organized by the training's date.
      </Typography>

      {isLoading && <CircularProgress />}
      {!!error && <Alert severity="error">Failed to load sessions.</Alert>}
      {!isLoading && grouped.length === 0 && (
        <Alert severity="info">No sign-in sheet photos have been uploaded yet.</Alert>
      )}

      {grouped.map(({ year, months }) => (
        <Accordion key={year} defaultExpanded={year === grouped[0].year}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{year}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {months.map(({ monthKey, label, sessions: monthSessions }) => (
              <Accordion
                key={monthKey}
                defaultExpanded={monthKey === months[0].monthKey && year === grouped[0].year}
                onChange={(_, expanded) => expanded && loadMonthImages(monthKey, monthSessions)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{label} ({monthSessions.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {loadingMonth === monthKey && <CircularProgress size={24} />}
                  <Grid container spacing={2}>
                    {monthSessions.map((session) => (
                      <Grid size={{ xs: 12, md: 6 }} key={session.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box>
                                <Typography variant="subtitle1">
                                  {moment(session.date).format('MMM D, YYYY')} — {session.location}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Trainer: {(session.trainer || []).map(trainerName).join(', ') || 'Unknown'}
                                </Typography>
                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                  {(session.topics || []).map((topic) => (
                                    <Chip key={topic} label={topic} size="small" />
                                  ))}
                                </Stack>
                              </Box>
                              <Chip
                                icon={<PhotoLibraryIcon />}
                                label={session.sheetImageCount}
                                size="small"
                                variant="outlined"
                              />
                            </Stack>

                            <Grid container spacing={1} sx={{ mt: 1 }}>
                              {(imagesByMonth[monthKey]?.[session.id] || []).map((url, i) => (
                                <Grid key={i}>
                                  <Box
                                    component="img"
                                    src={url}
                                    alt={`Sign-in sheet ${i + 1}`}
                                    onClick={() => setLightboxUrl(url)}
                                    sx={{
                                      width: 96, height: 96, objectFit: 'cover',
                                      borderRadius: 1, cursor: 'pointer',
                                      border: '1px solid', borderColor: 'divider',
                                    }}
                                  />
                                </Grid>
                              ))}
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      <Dialog open={!!lightboxUrl} onClose={() => setLightboxUrl(null)} maxWidth="lg">
        <IconButton
          onClick={() => setLightboxUrl(null)}
          sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'background.paper' }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          {lightboxUrl && (
            <Box component="img" src={lightboxUrl} alt="Sign-in sheet" sx={{ width: '100%', display: 'block' }} />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
