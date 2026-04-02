// @ts-nocheck
'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Box, Button, Container, Paper, Typography, Grid, TextField,
  CircularProgress, Alert, Divider, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Select, MenuItem, FormControl, InputLabel, Snackbar,
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

interface FormState {
  trainer: string;       // trainer ID
  topic: string;         // topic ID
  date: string;
  startTime: string;
  length: string;
  location: string;
  employees: EmployeeRow[];
}

// ---------------------------------------------------------------------------
export default function UploadInservicePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload / extract state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  // Lookups returned by the backend alongside extraction
  const [lookups, setLookups] = useState<{
    trainers: { id: string; name: string }[];
    topics: { id: string; name: string }[];
    employees: { id: string; name: string; email: string }[];
  } | null>(null);

  // The editable review form
  const [form, setForm] = useState<FormState | null>(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // ---------------------------------------------------------------------------
  // File selection
  // ---------------------------------------------------------------------------
  const handleFileSelect = useCallback((file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setForm(null);
    setExtractError(null);
    setSaved(false);
    setSaveErrors([]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
  }, [handleFileSelect]);

  // ---------------------------------------------------------------------------
  // OCR extraction
  // ---------------------------------------------------------------------------
  const handleExtract = async () => {
    if (!imageFile) return;
    setExtracting(true);
    setExtractError(null);

    try {
      const formData = new FormData();
      formData.append('sheet', imageFile);
      const { data } = await axios.post(`${BACKEND_URL}/api/ocr/extract`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setLookups(data.lookups);

      const { extracted, matched } = data;

      setForm({
        trainer: matched.trainer.matchedId || '',
        topic: matched.topic.matchedId || '',
        date: extracted.date || '',
        startTime: extracted.startTime || '',
        length: extracted.length != null ? String(extracted.length) : '',
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
  // Form helpers
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

    for (const emp of confirmedEmployees) {
      try {
        await axios.post(`${BACKEND_URL}/api/training-sessions/employee/${emp.matchedId}`, {
          date: form.date,
          location: form.location,
          startTime: form.startTime || null,
          length: parseFloat(form.length) || 1,
          topic: lookups?.topics.find(t => t.id === form.topic)?.name || form.topic,
          trainer: lookups?.trainers.find(t => t.id === form.trainer)?.name || form.trainer,
          trainees: confirmedEmployees.map(e => e.matchedId),
          status: 'completed',
        });
      } catch (err: any) {
        errors.push(`Failed to save session for ${emp.matchedName || emp.extractedName}: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    setSaving(false);
    setSaveErrors(errors);
    if (errors.length === 0) {
      setSaved(true);
      setSnackbar({ open: true, message: `Saved ${confirmedEmployees.length} training session(s) successfully!`, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: `Saved with ${errors.length} error(s)`, severity: 'error' });
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
        Take a photo of a physical sign-in sheet. We'll automatically extract the trainer, topic,
        date, time, and attendee names — then let you review before saving.
      </Typography>

      <Grid container spacing={3}>
        {/* Left column — Upload */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              1. Upload Sheet Image
            </Typography>

            {/* Drop zone */}
            <Box
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: imageFile ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: imageFile ? 'primary.50' : 'background.default',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                mb: 2,
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="body1" fontWeight={500}>
                {imageFile ? imageFile.name : 'Drag & drop or click to upload'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JPEG, PNG, WEBP, HEIC — max 10MB
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </Box>

            {/* Preview */}
            {imagePreview && (
              <Card sx={{ mb: 2 }}>
                <CardMedia
                  component="img"
                  image={imagePreview}
                  alt="Sheet preview"
                  sx={{ maxHeight: 350, objectFit: 'contain', bgcolor: '#f5f5f5' }}
                />
              </Card>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={extracting ? <CircularProgress size={18} color="inherit" /> : <AutoFixHighIcon />}
              onClick={handleExtract}
              disabled={!imageFile || extracting}
              sx={{ fontWeight: 700 }}
            >
              {extracting ? 'Extracting data…' : 'Extract Data with AI'}
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
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              2. Review & Confirm Extracted Data
            </Typography>

            {!form && (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <AutoFixHighIcon sx={{ fontSize: 64, opacity: 0.3 }} />
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Upload an image and click "Extract Data" to see results here
                </Typography>
              </Box>
            )}

            {form && (
              <>
                <Grid container spacing={2}>
                  {/* Trainer */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Trainer / Instructor</InputLabel>
                      <Select
                        value={form.trainer}
                        label="Trainer / Instructor"
                        onChange={e => setForm(f => f ? { ...f, trainer: e.target.value } : f)}
                      >
                        <MenuItem value=""><em>Not matched</em></MenuItem>
                        {lookups?.trainers.map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Topic */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Training Topic</InputLabel>
                      <Select
                        value={form.topic}
                        label="Training Topic"
                        onChange={e => setForm(f => f ? { ...f, topic: e.target.value } : f)}
                      >
                        <MenuItem value=""><em>Not matched</em></MenuItem>
                        {lookups?.topics.map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Date */}
                  <Grid item xs={12} sm={4}>
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
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Start Time"
                      type="time"
                      value={form.startTime}
                      onChange={e => setForm(f => f ? { ...f, startTime: e.target.value } : f)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* Duration */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Duration (hours)"
                      type="number"
                      inputProps={{ step: 0.5, min: 0 }}
                      value={form.length}
                      onChange={e => setForm(f => f ? { ...f, length: e.target.value } : f)}
                    />
                  </Grid>

                  {/* Location */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={form.location}
                      onChange={e => setForm(f => f ? { ...f, location: e.target.value } : f)}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Employees table */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
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
                    label="Green = matched to DB employee"
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
