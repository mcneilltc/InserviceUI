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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Archive as ArchiveIcon } from '@mui/icons-material';
import axios from 'axios';

const ManageTrainers = () => {
  const [trainers, setTrainers] = useState([]);
  const [newTrainer, setNewTrainer] = useState('');
  const [editTrainer, setEditTrainer] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch trainers from the API
  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const response = await axios.get('/api/trainers');
        setTrainers(response.data);
      } catch (error) {
        console.error('Error fetching trainers:', error);
        setSnackbar({ open: true, message: 'Failed to fetch trainers', severity: 'error' });
      }
    };
    fetchTrainers();
  }, []);

  // Add a new trainer
  const handleAddTrainer = async () => {
    if (!newTrainer.trim()) {
      setSnackbar({ open: true, message: 'Trainer name cannot be empty', severity: 'error' });
      return;
    }
    try {
      const response = await axios.post('/api/trainers', { name: newTrainer });
      setTrainers((prev) => [...prev, response.data]);
      setNewTrainer('');
      setSnackbar({ open: true, message: 'Trainer added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error adding trainer:', error);
      setSnackbar({ open: true, message: 'Failed to add trainer', severity: 'error' });
    }
  };

  // Edit an existing trainer
  const handleEditTrainer = async (id, updatedName) => {
    try {
      await axios.put(`/api/trainers/${id}`, { name: updatedName });
      setTrainers((prev) =>
        prev.map((trainer) => (trainer.id === id ? { ...trainer, name: updatedName } : trainer))
      );
      setEditTrainer(null);
      setSnackbar({ open: true, message: 'Trainer updated successfully', severity: 'success' });
    } catch (error) {
      console.error('Error updating trainer:', error);
      setSnackbar({ open: true, message: 'Failed to update trainer', severity: 'error' });
    }
  };

  // Delete a trainer
  const handleDeleteTrainer = async (id) => {
    try {
      await axios.delete(`/api/trainers/${id}`);
      setTrainers((prev) => prev.filter((trainer) => trainer.id !== id));
      setSnackbar({ open: true, message: 'Trainer deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting trainer:', error);
      setSnackbar({ open: true, message: 'Failed to delete trainer', severity: 'error' });
    }
  };

  // Archive a trainer
  const handleArchiveTrainer = async (id) => {
    try {
      await axios.put(`/api/trainers/${id}`, { archived: true });
      setTrainers((prev) =>
        prev.map((trainer) => (trainer.id === id ? { ...trainer, archived: true } : trainer))
      );
      setSnackbar({ open: true, message: 'Trainer archived successfully', severity: 'success' });
    } catch (error) {
      console.error('Error archiving trainer:', error);
      setSnackbar({ open: true, message: 'Failed to archive trainer', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Trainers
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={9}>
            <TextField
              fullWidth
              label="New Trainer"
              value={newTrainer}
              onChange={(e) => setNewTrainer(e.target.value)}
            />
          </Grid>
          <Grid item xs={3}>
            <Button variant="contained" color="primary" fullWidth onClick={handleAddTrainer}>
              Add Trainer
            </Button>
          </Grid>
        </Grid>
        <List>
          {trainers
            .filter((trainer) => !trainer.archived) // Exclude archived trainers
            .map((trainer) => (
              <ListItem key={trainer.id}>
                <ListItemText
                  primary={
                    editTrainer === trainer.id ? (
                      <TextField
                        fullWidth
                        defaultValue={trainer.name}
                        onBlur={(e) => handleEditTrainer(trainer.id, e.target.value)}
                        autoFocus
                      />
                    ) : (
                      trainer.name
                    )
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() =>
                      editTrainer === trainer.id ? setEditTrainer(null) : setEditTrainer(trainer.id)
                    }
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    color="warning"
                    onClick={() => handleArchiveTrainer(trainer.id)}
                  >
                    <ArchiveIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={() => handleDeleteTrainer(trainer.id)}
                  >
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

export default ManageTrainers;