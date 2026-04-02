// @ts-nocheck
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
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Trainer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  archived?: boolean;
}

const ManageTrainers = () => {
  const queryClient = useQueryClient();
  const [newTrainer, setNewTrainer] = useState({ name: '', email: '', phone: '' });
  const [editTrainer, setEditTrainer] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Trainer | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const { data: trainers = [] } = useQuery<Trainer[]>({
    queryKey: ['trainers'],
    queryFn: async () => {
      const response = await axios.get('/api/trainers');
      return response.data;
    }
  });

  const handleError = (error: any, defaultMessage: string) => {
    console.error(error);
    setSnackbar({
      open: true,
      message: error.response?.data?.error?.message || error.response?.data?.message || defaultMessage,
      severity: 'error'
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof newTrainer) => axios.post('/api/trainers', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      setNewTrainer({ name: '', email: '', phone: '' });
      setSnackbar({ open: true, message: 'Trainer added successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to add trainer')
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Trainer> & { id: string }) => axios.put(`/api/trainers/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      setEditTrainer(null);
      setEditingData(null);
      setSnackbar({ open: true, message: 'Trainer updated successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to update trainer')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/trainers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      setSnackbar({ open: true, message: 'Trainer deleted successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to delete trainer')
  });

  const handleAddTrainer = () => {
    const { name, email } = newTrainer;
    if (!name.trim() || !email.trim()) {
      setSnackbar({ open: true, message: 'Name and email are required', severity: 'error' });
      return;
    }
    createMutation.mutate(newTrainer);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingData || !editingData.name.trim() || !editingData.email.trim()) {
      setSnackbar({ open: true, message: 'Name and email are required', severity: 'error' });
      return;
    }
    updateMutation.mutate({ id, ...editingData });
  };

  const handleDeleteTrainer = (id: string) => {
    deleteMutation.mutate(id);
  };

  const startEditing = (trainer: Trainer) => {
    setEditTrainer(trainer.id);
    setEditingData({ ...trainer });
  };

  const handleInputChange = (field: keyof Trainer, value: string) => {
    if (editingData) {
      setEditingData({ ...editingData, [field]: value });
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Trainers
        </Typography>
        {/* <Button
          variant="outlined"
          color="primary"
          onClick={() => router.push('/archived-trainers')}
          sx={{ mb: 2 }}
        >
          View Archived Trainers
        </Button> */}
        <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
          <Grid item xs={9}>
            <Typography variant="h6">Add New Trainer</Typography>
          </Grid>
          {/* <Grid item xs={3} sx={{ textAlign: 'right' }}>
            <FormControlLabel
              control={<Switch checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} name="showArchived" />}
              label="Show Archived"
            />
          </Grid> */}
        </Grid>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Name"
              value={newTrainer.name}
              onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Email"
              value={newTrainer.email}
              onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="Phone"
              value={newTrainer.phone}
              onChange={(e) => setNewTrainer({ ...newTrainer, phone: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" fullWidth onClick={handleAddTrainer}>
              Add Trainer
            </Button>
          </Grid>
        </Grid>
        <List>
          {trainers.map((trainer) => {
            if (!trainer || !trainer.id) return null
          return(
            <ListItem key={trainer.id}>
              {editTrainer === trainer.id && editingData ? (
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Name"
                      value={editingData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={editingData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={editingData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleSaveEdit(trainer.id)}
                    >
                      Save
                    </Button>
                    <Button onClick={() => setEditTrainer(null)} sx={{ ml: 1 }}>
                      Cancel
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <>
                  <ListItemText
                    primary={trainer.name}
                    secondary={`Email: ${trainer.email}, Phone: ${trainer.phone || 'N/A'}${trainer.archived ? ' (Archived)' : ''}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => startEditing(trainer)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => handleDeleteTrainer(trainer.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </>
              )}
            </ListItem>
          )})}
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

export default ManageTrainers;
