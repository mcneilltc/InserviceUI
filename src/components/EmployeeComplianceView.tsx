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
  status: 'compliant' | 'at_risk' | 'non_compliant';
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
}

export interface EmployeeSelfData {
  employee: Employee;
  compliance: ComplianceInfo;
  sessions: Session[];
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
};

export interface EmployeeComplianceViewProps {
  employee: Employee;
  compliance: ComplianceInfo;
  sessions: Session[];
}

export default function EmployeeComplianceView({ employee, compliance, sessions }: EmployeeComplianceViewProps) {
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Badge #{employee.badgeNumber} · {employee.location}
              </Typography>

              <Chip
                icon={status.icon}
                label={status.label}
                color={status.chipColor}
                sx={{ fontWeight: 'bold', fontSize: '0.9rem', px: 1, mb: 1.5 }}
              />

              <Alert
                severity={
                  compliance.status === 'compliant' ? 'success' :
                  compliance.status === 'at_risk' ? 'warning' : 'error'
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
