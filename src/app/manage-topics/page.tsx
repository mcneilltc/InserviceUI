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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Topic {
  id: string;
  name: string;
  requiresDetail?: boolean;
}

const ManageTopics = () => {
  const queryClient = useQueryClient();
  const [newTopic, setNewTopic] = useState('');
  const [newTopicRequiresDetail, setNewTopicRequiresDetail] = useState(false);
  const [editTopic, setEditTopic] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRequiresDetail, setEditRequiresDetail] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const response = await axios.get('/api/training-topics');
      return response.data;
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
