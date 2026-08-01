// @ts-nocheck
'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Box, Button, Container, Paper, Typography, Grid, TextField,
  CircularProgress, Alert, Divider, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Select, MenuItem, FormControl, InputLabel, Snackbar, Checkbox,
  Card, CardContent, CardMedia, Stack, Tooltip, LinearProgress,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  AutoFixHigh as AutoFixHighIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../components/AuthContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EmployeeRow {
  extractedName: string;
  extractedEmail: string | null;
  matchedId: string | null;
  matchedName: string | null;
  confirmed: boolean; // user confirmed which employee this maps to
}

interface TopicRow {
  extractedName: string;
  matchedId: string | null;
  matchedName: string | null;
  detail?: string; // captured when the matched topic is flagged requiresDetail (e.g. First Aid, Other)
}

interface FormState {
  trainers: string[];    // trainer IDs
  topics: TopicRow[];
  date: string;
  startTime: string;
  endTime: string;
  length: string;
  location: string;
  employees: EmployeeRow[];
}

// Compute duration in hours (rounded to 2dp) from HH:MM start/end times
function computeDurationHours(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '';
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) return '';
  let minutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (minutes < 0) minutes += 24 * 60; // crossed midnight
  return String(Math.round((minutes / 60) * 100) / 100);
}

// ---------------------------------------------------------------------------
export default function UploadInservicePage() {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload / extract state — multiple pages: sign-in sheet page(s) + a topics-checklist page
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  // Lookups returned by the backend alongside extraction
  const [lookups, setLookups] = useState<{
    trainers: { id: string; name: string; email: string }[];
    topics: { id: string; name: string; requiresDetail?: boolean }[];
    employees: { id: string; name: string; email: string; isSupervisor: boolean }[];
  } | null>(null);

  // The editable review form
  const [form, setForm] = useState<FormState | null>(null);

  // Persisted copies of the uploaded sheet photos (Cloud Storage URLs),
  // returned by OCR extraction — carried through to the saved session.
  const [sheetImageUrls, setSheetImageUrls] = useState<string[]>([]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // ---------------------------------------------------------------------------
  // File selection — pages accumulate (sign-in page(s) + topics-checklist page)
  // ---------------------------------------------------------------------------
  const handleFilesSelect = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setImageFiles(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    setForm(null);
    setExtractError(null);
    setSaved(false);
    setSaveErrors([]);
    setSheetImageUrls([]);
  }, []);

  const removePage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) handleFilesSelect(files);
  }, [handleFilesSelect]);

  // ---------------------------------------------------------------------------
  // OCR extraction
  // ---------------------------------------------------------------------------
  const handleExtract = async () => {
    if (imageFiles.length === 0) return;
    setExtracting(true);
    setExtractError(null);

    try {
      const formData = new FormData();
      imageFiles.forEach(file => formData.append('sheets', file));
      const { data } = await axios.post(`${BACKEND_URL}/api/ocr/extract`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setLookups(data.lookups);
      setSheetImageUrls(Array.isArray(data.sheetImageUrls) ? data.sheetImageUrls : []);

      const { extracted, matched } = data;

      setForm({
        trainers: matched.trainer.matchedId ? [matched.trainer.matchedId] : [],
        topics: (matched.topics || []).map((t: any) => ({
          extractedName: t.extractedName,
          matchedId: t.matchedId || '',
          matchedName: t.matchedName || '',
        })),
        date: extracted.date || '',
        startTime: extracted.startTime || '',
        endTime: extracted.endTime || '',
        length: extracted.length != null ? String(extracted.length) : computeDurationHours(extracted.startTime || '', extracted.endTime || ''),
        location: extracted.location || '',
        employees: matched.employees.map((emp: any) => ({
          extractedName: emp.extractedName,
          extractedEmail: emp.extractedEmail,
          matchedId: emp.matchedId || '',
          matchedName: emp.matchedName || '',
          confirmed: !!emp.matchedId,
        })),
      });
    } catch (err: any) {
      setExtractError(err.response?.data?.error?.message || 'Failed to extract data from image');
    } finally {
      setExtracting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Form helpers — employees
  // ---------------------------------------------------------------------------
  const updateEmployee = (index: number, field: keyof EmployeeRow, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      const employees = [...prev.employees];
      employees[index] = { ...employees[index], [field]: value };
      // If user picks a db employee, also update matchedName
      if (field === 'matchedId' && lookups) {
        const found = lookups.employees.find(e => e.id === value);
        employees[index].matchedName = found?.name || '';
        employees[index].confirmed = true;
      }
      return { ...prev, employees };
    });
  };

  const addEmployee = () => {
    setForm(prev => prev ? {
      ...prev,
      employees: [...prev.employees, { extractedName: '', extractedEmail: null, matchedId: '', matchedName: '', confirmed: false }]
    } : prev);
  };

  const removeEmployee = (index: number) => {
    setForm(prev => prev ? { ...prev, employees: prev.employees.filter((_, i) => i !== index) } : prev);
  };

  // ---------------------------------------------------------------------------
  // Form helpers — topics
  // ---------------------------------------------------------------------------
  const updateTopic = (index: number, field: keyof TopicRow, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      const topicsArr = [...prev.topics];
      topicsArr[index] = { ...topicsArr[index], [field]: value };
      if (field === 'matchedId' && lookups) {
        const found = lookups.topics.find(t => t.id === value);
        topicsArr[index].matchedName = found?.name || '';
      }
      return { ...prev, topics: topicsArr };
    });
  };

  const addTopic = () => {
    setForm(prev => prev ? {
      ...prev,
      topics: [...prev.topics, { extractedName: '', matchedId: '', matchedName: '' }]
    } : prev);
  };

  const removeTopic = (index: number) => {
    setForm(prev => prev ? { ...prev, topics: prev.topics.filter((_, i) => i !== index) } : prev);
  };

  // ---------------------------------------------------------------------------
  // Save — creates one training session per confirmed employee
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setSaveErrors([]);

    const errors: string[] = [];

    const confirmedEmployees = form.employees.filter(e => e.matchedId);
    if (confirmedEmployees.length === 0) {
      setSnackbar({ open: true, message: 'Please match at least one employee before saving', severity: 'error' });
      setSaving(false);
      return;
    }

    if (form.trainers.length === 0) {
      setSnackbar({ open: true, message: 'Please select at least one trainer before saving', severity: 'error' });
      setSaving(false);
      return;
    }

    // Trainers can only use topics that already exist in the supervisor-managed
    // topic list — matching an existing topic is fine, but an unmatched row
    // would introduce a novel topic string, which only supervisors may do.
    if (!isSupervisor) {
      const unmatchedRow = form.topics.find(t => !t.matchedName);
      if (unmatchedRow) {
        setSnackbar({
          open: true,
          message: `Please match "${unmatchedRow.extractedName || 'this topic'}" to an existing topic, or remove it — only supervisors can add new topics.`,
          severity: 'error',
        });
        setSaving(false);
        return;
      }
    }

    const missingDetailRow = form.topics.find(t => {
      const matchedTopic = lookups?.topics.find(lt => lt.id === t.matchedId);
      return matchedTopic?.requiresDetail && !t.detail?.trim();
    });
    if (missingDetailRow) {
      setSnackbar({
        open: true,
        message: `Please describe what was covered under "${missingDetailRow.matchedName || missingDetailRow.extractedName}"`,
        severity: 'error',
      });
      setSaving(false);
      return;
    }

    const resolvedTopics = form.topics
      .map(t => {
        const name = t.matchedName || t.extractedName;
        if (!name) return null;
        const detail = t.detail?.trim();
        return detail ? `${name} — ${detail}` : name;
      })
      .filter(Boolean);
    if (resolvedTopics.length === 0) {
      setSnackbar({ open: true, message: 'Please confirm at least one topic before saving', severity: 'error' });
      setSaving(false);
      return;
    }

    // 1-trainer-to-12-employee ratio, waived if any selected trainer is also a supervisor.
    const isExemptFromRatio = form.trainers.some(trainerId =>
      lookups?.trainers.find(t => t.id === trainerId)?.isSupervisor
    );

    if (!isExemptFromRatio) {
      const maxTrainees = form.trainers.length * 12;
      if (confirmedEmployees.length > maxTrainees) {
        setSnackbar({
          open: true,
          message: `Training ratio exceeded! Maximum ${maxTrainees} trainees allowed for ${form.trainers.length} trainer(s) (1:12 ratio). Add a supervisor as a trainer to exceed this, or select more trainers.`,
          severity: 'error',
        });
        setSaving(false);
        return;
      }
    }

    // One shared session (trainer = employee IDs, like Add Training), closed
    // out immediately using the sheet's own recorded times — reuses the same
    // crediting code a live session's close-out uses, so this shows up in the
    // same Training Sessions list and credits hours the same way.
    try {
      await axios.post(`${BACKEND_URL}/api/sessions/from-sheet`, {
        date: form.date,
        location: form.location,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        length: parseFloat(form.length) || 1,
        topics: resolvedTopics,
        trainer: form.trainers,
        trainees: confirmedEmployees.map(e => ({
          employeeId: e.matchedId,
          name: e.matchedName,
        })),
        sheetImageUrls,
      });
    } catch (err: any) {
      errors.push(err.response?.data?.error?.message || err.message || 'Failed to save session');
    }

    setSaving(false);
    setSaveErrors(errors);
    if (errors.length === 0) {
      setSaved(true);
      setSnackbar({ open: true, message: `Saved training session for ${confirmedEmployees.length} employee(s) successfully!`, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: `Save failed: ${errors[0]}`, severity: 'error' });
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Upload Inservice Sheet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Take photos of the sign-in sheet page(s) and the topics-checklist page. We&apos;ll automatically
        extract the trainer, topics, date, time, and attendee names — then let you review before saving.
      </Typography>

      <Grid container spacing={3}>
        {/* Left column — Upload */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              1. Upload Sheet Pages
            </Typography>

            {/* Drop zone */}
            <Box
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: imageFiles.length > 0 ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: imageFiles.length > 0 ? 'primary.50' : 'background.default',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                mb: 2,
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="body1" fontWeight={500}>
                {imageFiles.length > 0 ? `${imageFiles.length} page(s) added — click to add more` : 'Drag & drop or click to upload'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sign-in sheet page(s) + topics checklist page — JPEG, PNG, WEBP, HEIC — max 10MB each
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={e => e.target.files && handleFilesSelect(Array.from(e.target.files))}
              />
            </Box>

            {/* Previews */}
            {imagePreviews.length > 0 && (
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {imagePreviews.map((src, idx) => (
                  <Grid size={6} key={idx}>
                    <Card sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        image={src}
                        alt={`Sheet page ${idx + 1}`}
                        sx={{ height: 140, objectFit: 'contain', bgcolor: '#f5f5f5' }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => removePage(idx)}
                        sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="caption" sx={{ position: 'absolute', bottom: 2, left: 4, bgcolor: 'background.paper', px: 0.5, borderRadius: 0.5 }}>
                        Page {idx + 1}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={extracting ? <CircularProgress size={18} color="inherit" /> : <AutoFixHighIcon />}
              onClick={handleExtract}
              disabled={imageFiles.length === 0 || extracting}
              sx={{ fontWeight: 700 }}
            >
              {extracting ? 'Extracting data…' : `Extract Data with AI${imageFiles.length > 0 ? ` (${imageFiles.length} page${imageFiles.length > 1 ? 's' : ''})` : ''}`}
            </Button>

            {extracting && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}

            {extractError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {extractError}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Right column — Review form */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              2. Review & Confirm Extracted Data
            </Typography>

            {!form && (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <AutoFixHighIcon sx={{ fontSize: 64, opacity: 0.3 }} />
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Upload page(s) and click &quot;Extract Data&quot; to see results here
                </Typography>
              </Box>
            )}

            {form && (
              <>
                <Grid container spacing={2}>
                  {/* Trainers */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Trainers</InputLabel>
                      <Select
                        multiple
                        value={form.trainers}
                        label="Trainers"
                        onChange={e => setForm(f => f ? { ...f, trainers: e.target.value as any } : f)}
                        renderValue={(selected: any) =>
                          selected.map((id: string) => lookups?.trainers.find(t => t.id === id)?.name || id).join(', ')
                        }
                      >
                        {lookups?.trainers.map(t => (
                          <MenuItem key={t.id} value={t.id}>
                            <Checkbox checked={form.trainers.includes(t.id)} />
                            {t.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Date */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Date"
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => f ? { ...f, date: e.target.value } : f)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* Start time */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Start Time"
                      type="time"
                      value={form.startTime}
                      onChange={e => setForm(f => f ? { ...f, startTime: e.target.value, length: computeDurationHours(e.target.value, f.endTime) || f.length } : f)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* End time */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="End Time"
                      type="time"
                      value={form.endTime}
                      onChange={e => setForm(f => f ? { ...f, endTime: e.target.value, length: computeDurationHours(f.startTime, e.target.value) || f.length } : f)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* Duration (auto-computed from start/end, overridable) */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Duration (hours)"
                      type="number"
                      inputProps={{ step: 0.5, min: 0 }}
                      value={form.length}
                      onChange={e => setForm(f => f ? { ...f, length: e.target.value } : f)}
                      helperText="Auto-filled from start/end time"
                    />
                  </Grid>

                  {/* Location */}
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={form.location}
                      onChange={e => setForm(f => f ? { ...f, location: e.target.value } : f)}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Topics table */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Topics ({form.topics.filter(t => t.matchedId).length} matched)
                  </Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={addTopic}>
                    Add Row
                  </Button>
                </Box>

                <TableContainer sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Checked on Sheet</TableCell>
                        <TableCell>Match to Topic</TableCell>
                        <TableCell>Detail</TableCell>
                        <TableCell sx={{ width: 48 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {form.topics.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary">
                              No topics detected — add one manually if the checklist page wasn&apos;t included.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {form.topics.map((topic, idx) => (
                        <TableRow key={idx} sx={{ bgcolor: topic.matchedId ? 'success.50' : 'warning.50' }}>
                          <TableCell>
                            <TextField
                              size="small"
                              variant="standard"
                              value={topic.extractedName}
                              onChange={e => updateTopic(idx, 'extractedName', e.target.value)}
                              placeholder="Topic from sheet"
                            />
                          </TableCell>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select
                                value={topic.matchedId || ''}
                                displayEmpty
                                onChange={e => updateTopic(idx, 'matchedId', e.target.value)}
                              >
                                <MenuItem value=""><em>Not matched</em></MenuItem>
                                {lookups?.topics.map(t => (
                                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            {lookups?.topics.find(t => t.id === topic.matchedId)?.requiresDetail ? (
                              <TextField
                                size="small"
                                variant="standard"
                                value={topic.detail || ''}
                                onChange={e => updateTopic(idx, 'detail', e.target.value)}
                                placeholder="What was covered?"
                                fullWidth
                              />
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Remove row">
                              <IconButton size="small" onClick={() => removeTopic(idx)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Employees table */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Attendees ({form.employees.filter(e => e.matchedId).length} matched)
                  </Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={addEmployee}>
                    Add Row
                  </Button>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Extracted Name</TableCell>
                        <TableCell>Match to Employee</TableCell>
                        <TableCell sx={{ width: 48 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {form.employees.map((emp, idx) => (
                        <TableRow key={idx} sx={{ bgcolor: emp.matchedId ? 'success.50' : 'warning.50' }}>
                          <TableCell>
                            <TextField
                              size="small"
                              variant="standard"
                              value={emp.extractedName}
                              onChange={e => updateEmployee(idx, 'extractedName', e.target.value)}
                              placeholder="Name from sheet"
                            />
                          </TableCell>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select
                                value={emp.matchedId || ''}
                                displayEmpty
                                onChange={e => updateEmployee(idx, 'matchedId', e.target.value)}
                              >
                                <MenuItem value=""><em>Not matched</em></MenuItem>
                                {lookups?.employees.map(e => (
                                  <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Remove row">
                              <IconButton size="small" onClick={() => removeEmployee(idx)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Green = matched to existing record"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label="Yellow = needs manual selection"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                </Stack>

                {form.trainers.length > 0 && (() => {
                  const isExempt = form.trainers.some(trainerId =>
                    lookups?.trainers.find(t => t.id === trainerId)?.isSupervisor
                  );
                  const maxTrainees = form.trainers.length * 12;
                  const confirmedCount = form.employees.filter(e => e.matchedId).length;
                  return (
                    <Box sx={{ mt: 2, p: 2, bgcolor: !isExempt && confirmedCount > maxTrainees ? 'error.light' : 'info.light', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {isExempt
                          ? 'Ratio cap waived — a supervisor is among the selected trainers.'
                          : `Matched Attendees: ${confirmedCount} | Max Allowed: ${maxTrainees} (${form.trainers.length} trainer(s) × 12)`}
                        {!isExempt && confirmedCount > maxTrainees && (
                          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                            Training ratio exceeded! Select more trainers, or include a supervisor to waive the cap.
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  );
                })()}

                {saveErrors.length > 0 && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {saveErrors.map((e, i) => <div key={i}>{e}</div>)}
                  </Alert>
                )}

                {saved && saveErrors.length === 0 && (
                  <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
                    All sessions saved successfully!
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  color="success"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || saved}
                  sx={{ mt: 3, fontWeight: 700 }}
                >
                  {saving ? 'Saving sessions…' : `Save ${form.employees.filter(e => e.matchedId).length} Training Session(s)`}
                </Button>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
