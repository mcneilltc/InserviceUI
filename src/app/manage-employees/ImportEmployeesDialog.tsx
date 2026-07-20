// @ts-nocheck
'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Alert, CircularProgress, Chip, Stepper, Step,
  StepLabel, Select, MenuItem, FormControl, InputLabel, TextField,
  LinearProgress, Snackbar, Stack, Tooltip, IconButton,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

// Expected columns from the inservice tracking spreadsheet
const KNOWN_COLUMNS = {
  'Guard Name': 'name',
  'Badge Number': 'badgeNumber',
  'Site': 'site',
  'Depth': 'depth',
  'Certification Expiration': 'certExpiration',
  'Slide Certification': 'hasSlideCert',
  'Swim Certification': 'hasSwimCert',
  'Elite Supervisor': 'isEliteSupervisor',
  'Month (1)': 'month1Hours',
  'Month (2)': 'month2Hours',
  'Month (3)': 'month3Hours',
};

const APP_FIELDS = [
  { value: 'name',             label: 'Guard Name *' },
  { value: 'badgeNumber',      label: 'Badge Number' },
  { value: 'site',             label: 'Site / Location *' },
  { value: 'depth',            label: 'Pool Depth (7ft / 13ft)' },
  { value: 'certExpiration',   label: 'Certification Expiration' },
  { value: 'hasSlideCert',     label: 'Slide Certification' },
  { value: 'hasSwimCert',      label: 'Swim Certification' },
  { value: 'isEliteSupervisor',label: 'Elite Supervisor' },
  { value: 'month1Hours',      label: 'Current Month Hours' },
  { value: 'month2Hours',      label: 'Month -2 Hours' },
  { value: 'month3Hours',      label: 'Month -3 Hours' },
  { value: 'skip',             label: '— Skip this column —' },
];

function flipName(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.includes(',')) {
    const [last, first] = trimmed.split(',').map(s => s.trim());
    return `${first} ${last}`;
  }
  return trimmed;
}

function parseBool(val: any): boolean {
  if (!val) return false;
  const s = String(val).toLowerCase().trim();
  return s === 'yes' || s === 'y' || s === 'true' || s === '1' || s === 'x';
}

interface ImportEmployeesDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function ImportEmployeesDialog({ open, onClose, onImportComplete }: ImportEmployeesDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; skipped: string[] } | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (json.length === 0) return;

      const headers = Object.keys(json[0]);
      setExcelHeaders(headers);
      setRawRows(json);

      // Auto-detect column mapping
      const autoMap: Record<string, string> = {};
      headers.forEach(h => {
        const trimmed = h.trim();
        if (KNOWN_COLUMNS[trimmed]) {
          autoMap[h] = KNOWN_COLUMNS[trimmed];
        } else {
          autoMap[h] = 'skip';
        }
      });
      setColumnMap(autoMap);
      setStep(1);
    };
    reader.readAsArrayBuffer(file);
  };

  const buildPreview = () => {
    const mapped = rawRows.slice(0, 5).map(row => {
      const out: any = {};
      excelHeaders.forEach(h => {
        const field = columnMap[h];
        if (field && field !== 'skip') {
          out[field] = row[h];
        }
      });
      // flip name
      if (out.name) out.name = flipName(out.name);
      return out;
    });
    setPreview(mapped);
    setStep(2);
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    const skipped: string[] = [];

    for (const row of rawRows) {
      const emp: any = {};
      excelHeaders.forEach(h => {
        const field = columnMap[h];
        if (field && field !== 'skip') emp[field] = row[h];
      });

      const name = flipName(emp.name || '');
      if (!name) { skipped.push('Row with empty name'); continue; }

      const payload = {
        name,
        email: emp.email || '',
        position: emp.depth ? `Lifeguard - ${emp.depth}` : 'Lifeguard',
        badgeNumber: emp.badgeNumber ? String(emp.badgeNumber).trim() : '',
        locations: emp.site ? [emp.site] : [],
        depth: emp.depth || null,
        certificationExpiration: emp.certExpiration || null,
        hasSlideCert: parseBool(emp.hasSlideCert),
        hasSwimCert: parseBool(emp.hasSwimCert),
        isEliteSupervisor: parseBool(emp.isEliteSupervisor),
        isActive: true,
        hireDate: new Date().toISOString(),
      };

      try {
        const { data } = await axios.post(`${BACKEND_URL}/api/employees`, payload);
        success++;

        // Import historical hours as training session stubs if present
        const empId = data.id;
        const now = new Date();
        const monthKeys = [
          { field: 'month1Hours', offset: 0 },
          { field: 'month2Hours', offset: 1 },
          { field: 'month3Hours', offset: 2 },
        ];
        for (const mk of monthKeys) {
          const hrs = parseFloat(emp[mk.field]);
          if (hrs > 0 && empId) {
            const d = new Date(now.getFullYear(), now.getMonth() - mk.offset, 1);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
            await axios.post(`${BACKEND_URL}/api/training-sessions/employee/${empId}`, {
              date: dateStr,
              location: payload.locations[0] || 'Unknown',
              startTime: '09:00',
              length: hrs,
              topic: 'Inservice Training',
              trainer: 'Imported',
              status: 'completed',
            }).catch(() => {}); // best-effort
          }
        }
      } catch (err: any) {
        skipped.push(`${name}: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    setImporting(false);
    setImportResults({ success, skipped });
    setStep(3);
    if (success > 0) onImportComplete();
  };

  const handleClose = () => {
    setStep(0);
    setRawRows([]);
    setExcelHeaders([]);
    setColumnMap({});
    setPreview([]);
    setImportResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Import Employees from Excel / CSV</DialogTitle>

      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {['Upload File', 'Map Columns', 'Preview', 'Done'].map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {/* Step 0 — Upload */}
        {step === 0 && (
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed', borderColor: 'primary.main', borderRadius: 2,
              p: 6, textAlign: 'center', cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6">Click to upload your Excel or CSV file</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Supports .xlsx, .xls, .csv — with headers matching your inservice tracking sheet
            </Typography>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
          </Box>
        )}

        {/* Step 1 — Map columns */}
        {step === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Columns were auto-detected from your file. Adjust any mappings below, then click Preview.
            </Alert>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Excel Column</strong></TableCell>
                    <TableCell><strong>Sample Value</strong></TableCell>
                    <TableCell><strong>Maps To</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {excelHeaders.map(h => (
                    <TableRow key={h}>
                      <TableCell><code>{h}</code></TableCell>
                      <TableCell sx={{ color: 'text.secondary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(rawRows[0]?.[h] ?? '').slice(0, 40)}
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                          <Select
                            value={columnMap[h] || 'skip'}
                            onChange={e => setColumnMap(m => ({ ...m, [h]: e.target.value }))}
                          >
                            {APP_FIELDS.map(f => (
                              <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Step 2 — Preview */}
        {step === 2 && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Showing first {preview.length} of {rawRows.length} rows. Ready to import all {rawRows.length} employees.
            </Alert>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Badge #</TableCell>
                    <TableCell>Site</TableCell>
                    <TableCell>Depth</TableCell>
                    <TableCell>Cert Expiry</TableCell>
                    <TableCell>Slide</TableCell>
                    <TableCell>Swim</TableCell>
                    <TableCell>Elite Sup.</TableCell>
                    <TableCell>Mo1 Hrs</TableCell>
                    <TableCell>Mo2 Hrs</TableCell>
                    <TableCell>Mo3 Hrs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.badgeNumber}</TableCell>
                      <TableCell>{row.site}</TableCell>
                      <TableCell>{row.depth}</TableCell>
                      <TableCell>{row.certExpiration}</TableCell>
                      <TableCell>{row.hasSlideCert ? <CheckCircleIcon color="success" fontSize="small" /> : '—'}</TableCell>
                      <TableCell>{row.hasSwimCert ? <CheckCircleIcon color="success" fontSize="small" /> : '—'}</TableCell>
                      <TableCell>{row.isEliteSupervisor ? <CheckCircleIcon color="success" fontSize="small" /> : '—'}</TableCell>
                      <TableCell>{row.month1Hours}</TableCell>
                      <TableCell>{row.month2Hours}</TableCell>
                      <TableCell>{row.month3Hours}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {importing && <LinearProgress sx={{ mt: 2 }} />}
          </Box>
        )}

        {/* Step 3 — Done */}
        {step === 3 && importResults && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
            <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
              Import Complete
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              {importResults.success} employee{importResults.success !== 1 ? 's' : ''} imported successfully
            </Typography>
            {importResults.skipped.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                <strong>{importResults.skipped.length} skipped:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  {importResults.skipped.slice(0, 10).map((s, i) => <li key={i}>{s}</li>)}
                  {importResults.skipped.length > 10 && <li>...and {importResults.skipped.length - 10} more</li>}
                </ul>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>
          {step === 3 ? 'Close' : 'Cancel'}
        </Button>
        {step === 1 && (
          <Button variant="contained" onClick={buildPreview}>
            Preview ({rawRows.length} rows)
          </Button>
        )}
        {step === 2 && (
          <Button
            variant="contained"
            color="success"
            onClick={handleImport}
            disabled={importing}
            startIcon={importing ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {importing ? 'Importing…' : `Import ${rawRows.length} Employees`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
