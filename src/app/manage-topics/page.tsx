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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Topic {
  id: string;
  name: string;
}

const ManageTopics = () => {
  const queryClient = useQueryClient();
  const [newTopic, setNewTopic] = useState('');
  const [editTopic, setEditTopic] = useState<string | null>(null);
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
    mutationFn: (topicName: string) => axios.post('/api/training-topics', { topicName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setNewTopic('');
      setSnackbar({ open: true, message: 'Topic added successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to add topic')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, topicName }: { id: string; topicName: string }) => axios.put(`/api/training-topics/${id}`, { topicName }),
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
    createMutation.mutate(newTopic);
  };

  const handleEditTopic = (id: string, updatedName: string) => {
    if (!updatedName.trim()) {
      setSnackbar({ open: true, message: 'Topic name cannot be empty', severity: 'error' });
      return;
    }
    updateMutation.mutate({ id, topicName: updatedName });
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
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid>
            <TextField
              fullWidth
              label="New Topic"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
            />
          </Grid>
          <Grid>
            <Button variant="contained" color="primary" fullWidth onClick={handleAddTopic}>
              Add Topic
            </Button>
          </Grid>
        </Grid>
        <List>
        {topics.map((topic) => (
            <ListItem key={topic.id}>
              <ListItemText
                primary={
                  editTopic === topic.id ? (
                    <TextField
                      fullWidth
                      defaultValue={topic.name}
                      onBlur={(e) => handleEditTopic(topic.id, e.target.value)}
                      autoFocus
                    />
                  ) : (
                    topic.name
                  )
                }
              />
              <ListItemSecondaryAction>
              <IconButton
                  edge="end"
                  onClick={() => (editTopic === topic.id ? setEditTopic(null) : setEditTopic(topic.id))}
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
