'use client';

import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip,
  List, ListItem, ListItemText, ListItemIcon, Divider,
  Stack, Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Event as EventIcon,
  Pool as PoolIcon,
  EmojiEvents as EmojiEventsIcon,
  LocalFireDepartment as StreakIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import moment from 'moment';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface Session {
  id: string;
  date: string;
  topics: string[];
  hours: number;
  location: string;
  trainer: string;
}

export interface ComplianceInfo {
  status: 'compliant' | 'at_risk' | 'non_compliant' | 'pending_certification';
  message: string;
  hoursThisMonth: number;
  hoursRemaining: number;
  midMonthCompliant: boolean;
  monthlyCompliant: boolean;
  month: string;
  thresholds: { midMonth: number; endOfMonth: number };
}

export interface Certification {
  type: string;
  expirationDate: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  badgeNumber: string;
  location: string;
  certifications?: Certification[];
  depth?: string;
  certificationExpiration?: string;
  hasSlideCert?: boolean;
  hasSwimCert?: boolean;
  isEliteSupervisor?: boolean;
  // Profile fields — shown here rather than in the Manage Employees table
  // row, which only carries what's useful for scanning a list.
  email?: string;
  position?: string;
  locations?: string[];
  role?: string | null;
  hireDate?: string;
}

// Mirrored in Layout.js and manage-employees/page.js — the two packages
// share no lib today, so this stays a tiny, easy-to-eyeball-verify copy
// rather than a shared import (see utils/roles.ts for the same reasoning
// applied to the role hierarchy itself).
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  seniorSupervisor: 'Senior Supervisor',
  supervisor: 'Supervisor',
  trainer: 'Trainer',
};

export interface IncentiveTier {
  id: string;
  streakLength: number;
  rewardLabel: string;
}

export interface IncentiveInfo {
  monthKey: string;
  hoursByThe15th: number;
  hoursNeeded: number;
  qualifiedThisMonth: boolean | undefined; // undefined = still time before the 15th
  deadlinePassed: boolean;
  currentStreak: number;
  currentTier: IncentiveTier | null;
  nextTier: IncentiveTier | null;
  monthsUntilNextTier: number | null;
  annual: { year: number; monthsQualified: number; monthsDecided: number };
}

export interface EmployeeSelfData {
  employee: Employee;
  compliance: ComplianceInfo;
  sessions: Session[];
  incentive?: IncentiveInfo;
}

const statusConfig = {
  compliant: {
    color: '#2e7d32',
    bg: '#e8f5e9',
    icon: <CheckCircleIcon sx={{ fontSize: 28 }} />,
    label: 'COMPLIANT',
    chipColor: 'success' as const,
  },
  at_risk: {
    color: '#e65100',
    bg: '#fff3e0',
    icon: <WarningIcon sx={{ fontSize: 28 }} />,
    label: 'AT RISK',
    chipColor: 'warning' as const,
  },
  non_compliant: {
    color: '#c62828',
    bg: '#ffebee',
    icon: <ErrorIcon sx={{ fontSize: 28 }} />,
    label: 'NON-COMPLIANT',
    chipColor: 'error' as const,
  },
  pending_certification: {
    color: '#616161',
    bg: '#eceff1',
    icon: <InfoIcon sx={{ fontSize: 28 }} />,
    label: 'PENDING CERTIFICATION',
    chipColor: 'default' as const,
  },
};

export interface EmployeeComplianceViewProps {
  employee: Employee;
  compliance: ComplianceInfo;
  sessions: Session[];
  incentive?: IncentiveInfo;
}

export default function EmployeeComplianceView({ employee, compliance, sessions, incentive }: EmployeeComplianceViewProps) {
  const status = statusConfig[compliance.status];
  const endOfMonthTarget = compliance.thresholds.endOfMonth;
  const filledHours = Math.min(compliance.hoursThisMonth, endOfMonthTarget);

  const donutData = {
    datasets: [{
      data: [filledHours, Math.max(0, endOfMonthTarget - filledHours)],
      backgroundColor: [status.color, '#e0e0e0'],
      borderWidth: 0,
      cutout: '82%',
    }],
  };

  return (
    <>
      {/* Main compliance card */}
      <Card sx={{ borderRadius: 3, boxShadow: 12, mb: 3 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">

            {/* Donut chart */}
            <Box sx={{
              position: 'relative', width: 160, height: 160, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Doughnut
                data={donutData}
                options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }}
              />
              <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color={status.color}>
                  {compliance.hoursThisMonth}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  / {endOfMonthTarget} hrs
                </Typography>
              </Box>
            </Box>

            {/* Name + status */}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" fontWeight="bold">
                {employee.firstName} {employee.lastName}
              </Typography>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Badge #{employee.badgeNumber} · {employee.location}
                  {employee.position && ` · ${employee.position}`}
                  {employee.role && ` · ${ROLE_LABELS[employee.role] || employee.role}`}
                </Typography>
                {employee.email && (
                  <Typography variant="body2" color="text.secondary">
                    {employee.email}
                  </Typography>
                )}
                {(employee.hireDate || (employee.locations && employee.locations.length > 0)) && (
                  <Typography variant="body2" color="text.secondary">
                    {[
                      employee.hireDate && `Hired ${moment(employee.hireDate).format('MMM D, YYYY')}`,
                      employee.locations && employee.locations.length > 0 && `Locations: ${employee.locations.join(', ')}`,
                    ].filter(Boolean).join(' · ')}
                  </Typography>
                )}
              </Box>

              <Chip
                icon={status.icon}
                label={status.label}
                color={status.chipColor}
                sx={{ fontWeight: 'bold', fontSize: '0.9rem', px: 1, mb: 1.5 }}
              />

              <Alert
                severity={
                  compliance.status === 'compliant' ? 'success' :
                  compliance.status === 'at_risk' ? 'warning' :
                  compliance.status === 'pending_certification' ? 'info' : 'error'
                }
                sx={{ borderRadius: 2 }}
              >
                {compliance.message}
              </Alert>
            </Box>
          </Stack>

          {/* Mid-month tracker */}
          <Divider sx={{ my: 3 }} />
          <Stack direction="row" spacing={2} justifyContent="center">
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                By the 15th (2 hrs)
              </Typography>
              <Chip
                size="small"
                icon={compliance.midMonthCompliant ? <CheckCircleIcon /> : <WarningIcon />}
                label={compliance.midMonthCompliant ? 'Met' : 'Not Met'}
                color={compliance.midMonthCompliant ? 'success' : 'warning'}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                End of Month (4 hrs)
              </Typography>
              <Chip
                size="small"
                icon={compliance.monthlyCompliant ? <CheckCircleIcon /> : <ErrorIcon />}
                label={compliance.monthlyCompliant ? 'Met' : `${compliance.hoursRemaining} hrs left`}
                color={compliance.monthlyCompliant ? 'success' : 'error'}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Incentive program */}
      {incentive && (
        <Card sx={{ borderRadius: 3, boxShadow: 6, mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <EmojiEventsIcon color={incentive.qualifiedThisMonth ? 'success' : 'action'} />
              <Typography variant="h6" fontWeight="bold">
                Incentive Program
              </Typography>
            </Stack>

            {incentive.qualifiedThisMonth === true ? (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                You&apos;ve recorded {incentive.hoursByThe15th} hours before the 15th — you qualify for this month&apos;s incentive!
              </Alert>
            ) : incentive.qualifiedThisMonth === false ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                The 15th passed with {incentive.hoursByThe15th} of 4 hours recorded — not eligible this month.
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                {incentive.hoursNeeded} more hour(s) needed by the 15th to qualify ({incentive.hoursByThe15th} of 4 so far).
              </Alert>
            )}

            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
              <StreakIcon color={incentive.currentStreak > 0 ? 'warning' : 'disabled'} fontSize="small" />
              <Typography variant="body2">
                <strong>{incentive.currentStreak}</strong>-month streak
                {incentive.currentTier && <> — current reward: <strong>{incentive.currentTier.rewardLabel}</strong></>}
              </Typography>
            </Stack>

            {incentive.nextTier && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {incentive.monthsUntilNextTier} more qualifying month(s) to reach: {incentive.nextTier.rewardLabel}
              </Typography>
            )}

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary">
              {incentive.annual.monthsQualified} of {incentive.annual.monthsDecided} month(s) qualified in {incentive.annual.year} so far
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Sessions this month */}
      <Card sx={{ borderRadius: 3, boxShadow: 6, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Sessions This Month
          </Typography>
          {sessions && sessions.length > 0 ? (
            <List disablePadding>
              {sessions.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <EventIcon color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={500}>
                          {(s.topics || []).join(', ')}
                        </Typography>
                      }
                      secondary={`${moment(s.date).format('MMM D, YYYY')} · ${s.location} · Trainer: ${s.trainer}`}
                    />
                    <Chip
                      label={`${s.hours} hr${s.hours !== 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </ListItem>
                  {idx < sessions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography color="text.secondary">No sessions recorded this month yet.</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card sx={{ borderRadius: 3, boxShadow: 6 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Certifications
          </Typography>
          {employee.certifications && employee.certifications.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
              {employee.certifications.map((cert, idx) => {
                const expiry = moment(cert.expirationDate);
                const expired = expiry.isBefore(moment());
                const soonExpiring = !expired && expiry.isBefore(moment().add(30, 'days'));
                return (
                  <Chip
                    key={idx}
                    label={`${cert.type}: ${expired ? 'Expired' : 'Expires'} ${expiry.format('MM/DD/YYYY')}`}
                    color={expired ? 'error' : soonExpiring ? 'warning' : 'success'}
                  />
                );
              })}
            </Stack>
          )}
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            {employee.depth && (
              <Chip icon={<PoolIcon />} label={`Pool Depth: ${employee.depth}`} variant="outlined" />
            )}
            {!employee.depth && (!employee.certifications || employee.certifications.length === 0) && (
              <Typography variant="body2" color="text.secondary">No certification data on file.</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
