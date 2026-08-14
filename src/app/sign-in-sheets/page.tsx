'use client';

import React, { useState } from 'react';
import {
  Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails,
  Grid, Card, CardContent, Chip, Stack, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Button, Snackbar,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { useAuth } from '../../components/AuthContext';

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

interface Session {
  id: string;
  date: string;
  location: string;
  topics: string[];
  trainer: string[];
  sheetImageCount: number;
  hasInserviceSheet: boolean;
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [imagesByMonth, setImagesByMonth] = useState<Record<string, Record<string, string[]>>>({});
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; sessionId: string; monthKey: string; index: number } | null>(null);
  const [loadingSheetId, setLoadingSheetId] = useState<string | null>(null);
  const [sheetModal, setSheetModal] = useState<{ sessionId: string; viewUrl: string; downloadUrl: string; label: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'sheet' | 'photo'; sessionId: string; monthKey?: string; index?: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

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

  // Read live from the fetched employee list, not the auth-context `user`
  // object — that claim is baked into the session JWT at login and can go
  // stale for hours after an admin grants/revokes it (same reasoning as the
  // mandatory-topics permission check elsewhere in this app).
  const ownEmployeeRecord = employees.find((e: any) => e.id === user?.employeeId);
  const canDeleteSheets = ownEmployeeRecord?.canDeleteSignInSheets === true;

  const relevantSessions = (sessions as Session[]).filter((s) => s.sheetImageCount > 0 || s.hasInserviceSheet);
  const grouped = groupByYearMonth(relevantSessions);

  const openInserviceSheet = async (session: Session) => {
    setLoadingSheetId(session.id);
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/sessions/${session.id}/inservice-sheet`);
      setSheetModal({
        sessionId: session.id,
        viewUrl: data.url,
        downloadUrl: data.downloadUrl,
        label: `${moment(session.date).format('MMM D, YYYY')} — ${session.location}`,
      });
    } finally {
      setLoadingSheetId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'sheet') {
        await axios.delete(`${BACKEND_URL}/api/sessions/${confirmDelete.sessionId}/inservice-sheet`);
        setSheetModal(null);
      } else {
        await axios.delete(`${BACKEND_URL}/api/sessions/${confirmDelete.sessionId}/images/${confirmDelete.index}`);
        setImagesByMonth((prev) => {
          const monthKey = confirmDelete.monthKey as string;
          const monthImages = { ...(prev[monthKey] || {}) };
          monthImages[confirmDelete.sessionId] = (monthImages[confirmDelete.sessionId] || [])
            .filter((_, i) => i !== confirmDelete.index);
          return { ...prev, [monthKey]: monthImages };
        });
        setLightbox(null);
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setSnackbar({ open: true, message: confirmDelete.type === 'sheet' ? 'Sign-in sheet deleted' : 'Photo deleted', severity: 'success' });
      setConfirmDelete(null);
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error?.message || 'Failed to delete';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

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
        Uploaded sign-in sheet photos, organized by the training&apos;s date.
      </Typography>

      {isLoading && <CircularProgress />}
      {!!error && <Alert severity="error">Failed to load sessions.</Alert>}
      {!isLoading && grouped.length === 0 && (
        <Alert severity="info">No sign-in sheets are available yet.</Alert>
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
                              <Stack spacing={0.5} alignItems="flex-end">
                                {session.sheetImageCount > 0 && (
                                  <Chip
                                    icon={<PhotoLibraryIcon />}
                                    label={session.sheetImageCount}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {session.hasInserviceSheet && (
                                  <Button
                                    size="small"
                                    startIcon={<DescriptionIcon />}
                                    disabled={loadingSheetId === session.id}
                                    onClick={() => openInserviceSheet(session)}
                                  >
                                    Sign-In Sheet
                                  </Button>
                                )}
                              </Stack>
                            </Stack>

                            <Grid container spacing={1} sx={{ mt: 1 }}>
                              {(imagesByMonth[monthKey]?.[session.id] || []).map((url, i) => (
                                <Grid key={i}>
                                  <Box
                                    component="img"
                                    src={url}
                                    alt={`Sign-in sheet ${i + 1}`}
                                    onClick={() => setLightbox({ url, sessionId: session.id, monthKey, index: i })}
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

      <Dialog open={!!sheetModal} onClose={() => setSheetModal(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          {sheetModal?.label}
          <IconButton onClick={() => setSheetModal(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '75vh' }}>
          {sheetModal && (
            <Box
              component="iframe"
              src={sheetModal.viewUrl}
              title="Sign-in sheet preview"
              sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          {canDeleteSheets && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => sheetModal && setConfirmDelete({ type: 'sheet', sessionId: sheetModal.sessionId })}
              sx={{ mr: 'auto' }}
            >
              Delete
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => sheetModal && window.open(sheetModal.downloadUrl, '_blank')}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg">
        <IconButton
          onClick={() => setLightbox(null)}
          sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'background.paper' }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          {lightbox && (
            <Box component="img" src={lightbox.url} alt="Sign-in sheet" sx={{ width: '100%', display: 'block' }} />
          )}
        </DialogContent>
        {canDeleteSheets && (
          <DialogActions>
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => lightbox && setConfirmDelete({ type: 'photo', sessionId: lightbox.sessionId, monthKey: lightbox.monthKey, index: lightbox.index })}
            >
              Delete Photo
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>
          {confirmDelete?.type === 'sheet' ? 'Delete this sign-in sheet?' : 'Delete this photo?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmDelete?.type === 'sheet'
              ? "This permanently removes the generated PDF sign-in sheet for this session. This can't be undone."
              : "This permanently removes the uploaded photo. This can't be undone."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Never Mind</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
