'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
  Snackbar,
  Alert,
  Checkbox,
  FormControlLabel,
  Chip,
  Box,
  Autocomplete,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../components/AuthContext';

interface Topic {
  id: string;
  name: string;
  requiresDetail?: boolean;
}

const WEEK_KEYS = ['1', '2', '3', '4', '5'] as const;
type WeekKey = typeof WEEK_KEYS[number];
type WeeksSchedule = Record<WeekKey, string[]>;
const emptyWeeks = (): WeeksSchedule => ({ '1': [], '2': [], '3': [], '4': [], '5': [] });

// Matches the backend's day-of-month bucketing exactly (see
// training-app-backend/services/mandatoryTopicsService.ts) — week 5 only
// shows up for months with 29+ days.
function weeksInMonth(yearMonth: string): number {
  const daysInMonth = moment(yearMonth, 'YYYY-MM').daysInMonth();
  return daysInMonth >= 29 ? 5 : 4;
}

const ManageTopics = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newTopic, setNewTopic] = useState('');
  const [newTopicRequiresDetail, setNewTopicRequiresDetail] = useState(false);
  const [editTopic, setEditTopic] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRequiresDetail, setEditRequiresDetail] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [scheduleMonth, setScheduleMonth] = useState(moment().format('YYYY-MM'));
  const [scheduleDraft, setScheduleDraft] = useState<WeeksSchedule>(emptyWeeks());

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const response = await axios.get('/api/training-topics');
      return response.data;
    }
  });

  // Read live from the fetched employee list, not the auth-context `user`
  // object — that claim is baked into the session JWT at login and can go
  // stale for hours after an admin grants/revokes it here, so this page
  // would otherwise keep hiding (or showing) the schedule section after a
  // permission change until the next login.
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await axios.get('/api/employees');
      return response.data;
    }
  });
  const ownEmployeeRecord = employees.find((e) => e.id === user?.employeeId);
  const canManageSchedule = ownEmployeeRecord
    ? ownEmployeeRecord.canManageMandatoryTopics === true
    : user?.canManageMandatoryTopics === true;

  const { data: scheduleData } = useQuery({
    queryKey: ['mandatoryTopicsSchedule', scheduleMonth],
    queryFn: async () => {
      const response = await axios.get(`/api/mandatory-topics/${scheduleMonth}`);
      return response.data.weeks as WeeksSchedule;
    },
    enabled: canManageSchedule,
  });

  useEffect(() => {
    setScheduleDraft(scheduleData || emptyWeeks());
  }, [scheduleData]);

  const saveScheduleMutation = useMutation({
    mutationFn: (weeks: WeeksSchedule) => axios.put(`/api/mandatory-topics/${scheduleMonth}`, { weeks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandatoryTopicsSchedule', scheduleMonth] });
      setSnackbar({ open: true, message: `Mandatory topics schedule saved for ${moment(scheduleMonth, 'YYYY-MM').format('MMMM YYYY')}`, severity: 'success' });
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to save schedule', severity: 'error' });
    }
  });

  const handleError = (error: any, defaultMessage: string) => {
    console.error(error);
    setSnackbar({
      open: true,
      message: error.response?.data?.message || defaultMessage,
      severity: 'error'
    });
  };

  const createMutation = useMutation({
    mutationFn: ({ topicName, requiresDetail }: { topicName: string; requiresDetail: boolean }) =>
      axios.post('/api/training-topics', { topicName, requiresDetail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setNewTopic('');
      setNewTopicRequiresDetail(false);
      setSnackbar({ open: true, message: 'Topic added successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to add topic')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, topicName, requiresDetail }: { id: string; topicName: string; requiresDetail: boolean }) =>
      axios.put(`/api/training-topics/${id}`, { topicName, requiresDetail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setEditTopic(null);
      setSnackbar({ open: true, message: 'Topic updated successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to update topic')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/training-topics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setSnackbar({ open: true, message: 'Topic deleted successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to delete topic')
  });

  const handleAddTopic = () => {
    if (!newTopic.trim()) {
      setSnackbar({ open: true, message: 'Topic name cannot be empty', severity: 'error' });
      return;
    }
    createMutation.mutate({ topicName: newTopic, requiresDetail: newTopicRequiresDetail });
  };

  const startEditing = (topic: Topic) => {
    setEditTopic(topic.id);
    setEditName(topic.name);
    setEditRequiresDetail(!!topic.requiresDetail);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      setSnackbar({ open: true, message: 'Topic name cannot be empty', severity: 'error' });
      return;
    }
    updateMutation.mutate({ id, topicName: editName, requiresDetail: editRequiresDetail });
  };

  const handleDeleteTopic = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Topics
        </Typography>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="New Topic"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newTopicRequiresDetail}
                  onChange={(e) => setNewTopicRequiresDetail(e.target.checked)}
                />
              }
              label="Requires additional detail when selected (e.g. First Aid, Other) — trainers will be asked to describe exactly what was covered"
            />
          </Grid>
          <Grid size={12}>
            <Button variant="contained" color="primary" onClick={handleAddTopic}>
              Add Topic
            </Button>
          </Grid>
        </Grid>
        <List>
        {topics.map((topic) => (
            <ListItem key={topic.id}>
              {editTopic === topic.id ? (
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <TextField
                        fullWidth
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        size="small"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={editRequiresDetail}
                            onChange={(e) => setEditRequiresDetail(e.target.checked)}
                          />
                        }
                        label="Requires additional detail when selected"
                      />
                      <Button size="small" variant="contained" onClick={() => handleSaveEdit(topic.id)} sx={{ alignSelf: 'flex-start' }}>
                        Save
                      </Button>
                    </Box>
                  }
                />
              ) : (
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {topic.name}
                      {topic.requiresDetail && <Chip label="Requires detail" size="small" color="info" />}
                    </Box>
                  }
                />
              )}
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => (editTopic === topic.id ? setEditTopic(null) : startEditing(topic))}
                >
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" color="error" onClick={() => handleDeleteTopic(topic.id)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {canManageSchedule && (
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Mandatory Topics Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Topics assigned to a week here are automatically included — and can&apos;t be removed — on every
            training session a trainer creates that falls in that week, anywhere in the org. Trainers can still
            add more topics on top.
          </Typography>

          <TextField
            type="month"
            label="Month"
            value={scheduleMonth}
            onChange={(e) => setScheduleMonth(e.target.value)}
            sx={{ mb: 3, minWidth: 220 }}
            InputLabelProps={{ shrink: true }}
          />

          <Grid container spacing={2}>
            {Array.from({ length: weeksInMonth(scheduleMonth) }, (_, i) => String(i + 1) as WeekKey).map((weekKey) => (
              <Grid size={12} key={weekKey}>
                <Autocomplete
                  multiple
                  options={topics.map((t) => t.name)}
                  value={scheduleDraft[weekKey] || []}
                  onChange={(_e, newValue) => setScheduleDraft((prev) => ({ ...prev, [weekKey]: newValue }))}
                  renderInput={(params) => (
                    <TextField {...params} label={`Week ${weekKey} — mandatory topics`} placeholder="Add a topic" />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                    ))
                  }
                />
              </Grid>
            ))}
          </Grid>

          <Button
            variant="contained"
            sx={{ mt: 3 }}
            onClick={() => saveScheduleMutation.mutate(scheduleDraft)}
            disabled={saveScheduleMutation.isPending}
          >
            Save Schedule
          </Button>
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageTopics;
