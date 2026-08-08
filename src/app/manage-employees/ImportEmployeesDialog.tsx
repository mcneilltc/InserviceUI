// @ts-nocheck
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

// Month (1) = current month, Month (2) = 1 month ago, ... Month (12) = 11
// months ago. Raised from 3 to 12 so a full year of historical hours can be
// backfilled in one import; sheets with fewer month columns just leave the
// rest unmapped ('skip'), so this is a superset, not a requirement.
const MAX_HISTORICAL_MONTHS = 12;
const monthField = (n) => `month${n}Hours`;

// Expected columns from the inservice tracking spreadsheet
const KNOWN_COLUMNS = {
  'Guard Name': 'name',
  'Badge Number': 'badgeNumber',
  'Email': 'email',
  'Site': 'site',
  'Depth': 'depth',
  'Certification Expiration': 'certExpiration',
  'Slide Certification': 'hasSlideCert',
  'Swim Certification': 'hasSwimCert',
  'Elite Supervisor': 'isEliteSupervisor',
  ...Object.fromEntries(
    Array.from({ length: MAX_HISTORICAL_MONTHS }, (_, i) => [`Month (${i + 1})`, monthField(i + 1)])
  ),
};

const APP_FIELDS = [
  { value: 'name',             label: 'Guard Name *' },
  { value: 'badgeNumber',      label: 'Badge Number' },
  { value: 'email',            label: 'Email' },
  { value: 'site',             label: 'Site / Location *' },
  { value: 'depth',            label: 'Pool Depth (7ft / 13ft)' },
  { value: 'certExpiration',   label: 'Certification Expiration' },
  { value: 'hasSlideCert',     label: 'Slide Certification' },
  { value: 'hasSwimCert',      label: 'Swim Certification' },
  { value: 'isEliteSupervisor',label: 'Elite Supervisor' },
  ...Array.from({ length: MAX_HISTORICAL_MONTHS }, (_, i) => ({
    value: monthField(i + 1),
    label: i === 0 ? 'Current Month Hours' : `Month -${i} Hours`,
  })),
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

function normalizeSiteKey(name: string): string {
  return String(name || '').trim().toLowerCase();
}

// Matches a spreadsheet's Site value against the real sites already set up
// in Manage Sites — case/whitespace differences ("mcac " vs "MCAC") are
// auto-corrected to the canonical stored name. A value that doesn't match
// anything at all is left as-is (still imported, so a typo doesn't block
// the whole batch) but flagged so the person importing can see it.
function resolveSite(raw: string, knownSitesByKey: Map<string, string>): { resolved: string; recognized: boolean } {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { resolved: '', recognized: true };
  const canonical = knownSitesByKey.get(normalizeSiteKey(trimmed));
  return canonical ? { resolved: canonical, recognized: true } : { resolved: trimmed, recognized: false };
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
  const [importResults, setImportResults] = useState<{ success: number; skipped: string[]; hoursCredited: number } | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [knownSitesByKey, setKnownSitesByKey] = useState<Map<string, string>>(new Map());
  const [unrecognizedSites, setUnrecognizedSites] = useState<string[]>([]);

  // Which of the up-to-12 month-hours columns the user actually mapped —
  // drives the preview table so it only shows Mo1/Mo2/... columns that exist
  // in this particular sheet instead of always rendering all 12.
  const mappedMonthValues = new Set(Object.values(columnMap));
  const mappedMonthNumbers = Array.from({ length: MAX_HISTORICAL_MONTHS }, (_, i) => i + 1)
    .filter((n) => mappedMonthValues.has(monthField(n)));

  // Loaded once per time the dialog opens, so Site values can be matched
  // against what's actually in Manage Sites (see resolveSite above).
  useEffect(() => {
    if (!open) return;
    axios.get(`${BACKEND_URL}/api/sites`)
      .then(({ data }) => {
        const map = new Map<string, string>();
        (data || []).forEach((s: any) => {
          if (s?.name) map.set(normalizeSiteKey(s.name), s.name);
        });
        setKnownSitesByKey(map);
      })
      .catch(() => setKnownSitesByKey(new Map()));
  }, [open]);

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
    // Checked across every row (not just the 5-row preview slice) so the
    // warning below is accurate for the whole file, not just what's shown.
    const unrecognized = new Set<string>();
    rawRows.forEach(row => {
      excelHeaders.forEach(h => {
        if (columnMap[h] !== 'site') return;
        const { recognized } = resolveSite(row[h], knownSitesByKey);
        if (!recognized && String(row[h] || '').trim()) unrecognized.add(String(row[h]).trim());
      });
    });
    setUnrecognizedSites(Array.from(unrecognized));

    const mapped = rawRows.slice(0, 5).map(row => {
      const out: any = {};
      excelHeaders.forEach(h => {
        const field = columnMap[h];
        if (field && field !== 'skip') {
          out[field] = field === 'site' ? resolveSite(row[h], knownSitesByKey).resolved : row[h];
        }
      });
      // flip name
      if (out.name) out.name = flipName(out.name);
      return out;
    });
    setPreview(mapped);
    setStep(2);
  };

  // Posts each non-empty Month (1)..Month (12) hours column as a completed
  // training session stub for the given employee. The backend's own
  // same-day/same-topic duplicate check means this is safe to re-run against
  // an employee who was already synced — a genuine repeat just gets a 409
  // and is skipped, never double-counted.
  const creditHistoricalHours = async (empId: string, emp: any, location: string) => {
    const now = new Date();
    const monthKeys = Array.from({ length: MAX_HISTORICAL_MONTHS }, (_, i) => ({ field: monthField(i + 1), offset: i }));
    let credited = 0;
    for (const mk of monthKeys) {
      const hrs = parseFloat(emp[mk.field]);
      if (hrs > 0 && empId) {
        const d = new Date(now.getFullYear(), now.getMonth() - mk.offset, 1);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
        const ok = await axios.post(`${BACKEND_URL}/api/training-sessions/${empId}`, {
          date: dateStr,
          location: location || 'Unknown',
          startTime: '09:00',
          length: hrs,
          topics: ['Inservice Training'],
          trainer: 'Imported',
          status: 'completed',
        }).then(() => true).catch(() => false); // best-effort — duplicate/validation failures shouldn't block the rest of the import
        if (ok) credited++;
      }
    }
    return credited;
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    let hoursCredited = 0;
    const skipped: string[] = [];

    for (const row of rawRows) {
      const emp: any = {};
      excelHeaders.forEach(h => {
        const field = columnMap[h];
        if (field && field !== 'skip') emp[field] = row[h];
      });

      const name = flipName(emp.name || '');
      if (!name) { skipped.push('Row with empty name'); continue; }

      const { resolved: resolvedSite } = resolveSite(emp.site, knownSitesByKey);

      const payload = {
        name,
        email: emp.email || '',
        position: emp.depth ? `Lifeguard - ${emp.depth}` : 'Lifeguard',
        badgeNumber: emp.badgeNumber ? String(emp.badgeNumber).trim() : '',
        locations: resolvedSite ? [resolvedSite] : [],
        homeLocation: resolvedSite || '',
        depth: emp.depth || null,
        certificationExpiration: emp.certExpiration || null,
        // The Certifications/compliance tracking page reads this array, not
        // certificationExpiration above — without it, an imported employee's
        // cert expiration date is stored but never shows up as a tracked
        // certification anywhere in the app.
        certifications: emp.certExpiration ? [{ type: 'Lifeguarding', expirationDate: emp.certExpiration }] : [],
        hasSlideCert: parseBool(emp.hasSlideCert),
        hasSwimCert: parseBool(emp.hasSwimCert),
        isEliteSupervisor: parseBool(emp.isEliteSupervisor),
        isActive: true,
        hireDate: new Date().toISOString(),
      };

      try {
        const { data } = await axios.post(`${BACKEND_URL}/api/employees`, payload);
        success++;
        hoursCredited += await creditHistoricalHours(data.id, emp, payload.locations[0]);
      } catch (err: any) {
        // Employee already exists (re-running an earlier import) — still
        // worth syncing their historical hours against the existing record
        // rather than just reporting it as skipped.
        const existingId = err.response?.data?.error?.employeeId;
        if (err.response?.status === 409 && existingId) {
          const credited = await creditHistoricalHours(existingId, emp, payload.locations[0]);
          hoursCredited += credited;
          if (credited > 0) {
            skipped.push(`${name}: already existed — synced ${credited} month(s) of hours to their record`);
            continue;
          }
        }
        skipped.push(`${name}: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    setImporting(false);
    setImportResults({ success, skipped, hoursCredited });
    setStep(3);
    if (success > 0 || hoursCredited > 0) onImportComplete();
  };

  const handleClose = () => {
    setStep(0);
    setRawRows([]);
    setExcelHeaders([]);
    setColumnMap({});
    setPreview([]);
    setImportResults(null);
    setUnrecognizedSites([]);
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
            {unrecognizedSites.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{unrecognizedSites.length} site name{unrecognizedSites.length !== 1 ? 's' : ''} not found in Manage Sites:</strong>{' '}
                {unrecognizedSites.join(', ')}. These employees will still import with that location, but won&apos;t show up
                correctly in location filters until you add the site in Manage Sites or fix the spreadsheet and re-upload.
              </Alert>
            )}
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Badge #</TableCell>
                    <TableCell>Site</TableCell>
                    <TableCell>Depth</TableCell>
                    <TableCell>Cert Expiry</TableCell>
                    <TableCell>Slide</TableCell>
                    <TableCell>Swim</TableCell>
                    <TableCell>Elite Sup.</TableCell>
                    {mappedMonthNumbers.map((n) => (
                      <TableCell key={n}>Mo{n} Hrs</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.badgeNumber}</TableCell>
                      <TableCell>{row.site}</TableCell>
                      <TableCell>{row.depth}</TableCell>
                      <TableCell>{row.certExpiration}</TableCell>
                      <TableCell>{row.hasSlideCert ? <CheckCircleIcon color="success" fontSize="small" /> : '—'}</TableCell>
                      <TableCell>{row.hasSwimCert ? <CheckCircleIcon color="success" fontSize="small" /> : '—'}</TableCell>
                      <TableCell>{row.isEliteSupervisor ? <CheckCircleIcon color="success" fontSize="small" /> : '—'}</TableCell>
                      {mappedMonthNumbers.map((n) => (
                        <TableCell key={n}>{row[monthField(n)]}</TableCell>
                      ))}
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
            {importResults.hoursCredited > 0 && (
              <Typography variant="body1" color="text.secondary">
                {importResults.hoursCredited} month{importResults.hoursCredited !== 1 ? 's' : ''} of historical hours credited
              </Typography>
            )}
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
