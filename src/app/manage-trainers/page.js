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
import { Edit as EditIcon, Delete as DeleteIcon, Archive as ArchiveIcon, Unarchive as UnarchiveIcon } from '@mui/icons-material';
import axios from 'axios';

const ManageTrainers = () => {
  const router = useRouter();
  const [trainers, setTrainers] = useState([]);
  const [newTrainer, setNewTrainer] = useState({ name: '', email: '', phone: '' });
  const [editTrainer, setEditTrainer] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // const [showArchived, setShowArchived] = useState(false);

  // Fetch trainers from the API
  // useEffect(() => {
  //   const fetchTrainers = async () => {
  //     try {
  //       const response = await axios.get(`/api/trainers?archived=${showArchived}`);
  //       setTrainers(response.data);
  //     } catch (error) {
  //       console.error('Error fetching trainers:', error);
  //       setSnackbar({ open: true, message: 'Failed to fetch trainers', severity: 'error' });
  //     }
  //   };
  //   fetchTrainers();
  // }, [showArchived]); // Re-fetch when showArchived changes
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
    console.log('📤 Sending POST to /api/trainers:', { name, email, phone });
    console.log('handleAddTrainer function called');
    const { name, email, phone } = newTrainer;
    if (!name.trim() || !email.trim()) {
      setSnackbar({ open: true, message: 'Name and email are required', severity: 'error' });
      return;
    }
    try {
      const response = await axios.post('/api/trainers', { name, email, phone });
      setTrainers((prev) => [...prev, response.data.trainer]); // Access trainer from response.data
      setNewTrainer({ name: '', email: '', phone: '' });
      setSnackbar({ open: true, message: 'Trainer added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error adding trainer:', error);
      console.error('❌ Request failed:', error.response?.data || error.message);
      setSnackbar({ open: true, message: 'Failed to add trainer', severity: 'error' });
    }
  };

  // Edit an existing trainer
  const handleEditTrainer = async (id, updatedTrainerData) => {
    try {
      const response = await axios.put(`/api/trainers/${id}`, updatedTrainerData);
      setTrainers((prev) =>
        prev.map((trainer) => (trainer.id === id ? { ...trainer, ...response.data.trainer } : trainer)) // Access trainer from response.data
      );
      setEditTrainer(null);
      setSnackbar({ open: true, message: 'Trainer updated successfully', severity: 'success' });
    } catch (error) {
      console.error('Error updating trainer:', error);
      setSnackbar({ open: true, message: 'Failed to update trainer', severity: 'error' });
    }
  };

  const handleSaveEdit = (id, currentTrainer) => {
    if (!currentTrainer.name.trim() || !currentTrainer.email.trim()) {
      setSnackbar({ open: true, message: 'Name and email are required', severity: 'error' });
      return;
    }
    handleEditTrainer(id, { name: currentTrainer.name, email: currentTrainer.email, phone: currentTrainer.phone });
  };

  // Delete a trainer
  const handleDeleteTrainer = async (id) => {
    try {
      await axios.delete(`/api/trainers/${id}`);
      setTrainers((prev) => prev.filter((trainer) => trainer.id !== id));
      setSnackbar({ open: true, message: 'Trainer deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting trainer:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete trainer';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  // Archive/Unarchive a trainer
  // const handleArchiveTrainer = async (id, archive) => {
  //   try {
  //     await axios.put(`/api/trainers/${id}`, { archived: archive });
  //     setTrainers((prev) =>
  //       prev.map((trainer) => (trainer.id === id ? { ...trainer, archived: archive } : trainer))
  //     );
  //     setSnackbar({ open: true, message: `Trainer ${archive ? 'archived' : 'unarchived'} successfully`, severity: 'success' });
  //   } catch (error) {
  //     console.error(`Error ${archive ? 'archiving' : 'unarchiving'} trainer:`, error);
  //     setSnackbar({ open: true, message: `Failed to ${archive ? 'archive' : 'unarchive'} trainer`, severity: 'error' });
  //   }
  // };

  const handleInputChange = (e, trainerId, field) => {
    setTrainers((prev) =>
      prev.map((t) =>
        t.id === trainerId ? { ...t, [field]: e.target.value } : t
      )
    );
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
              {editTrainer === trainer.id ? (
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Name"
                      value={trainer.name}
                      onChange={(e) => handleInputChange(e, trainer.id, 'name')}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={trainer.email}
                      onChange={(e) => handleInputChange(e, trainer.id, 'email')}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={trainer.phone}
                      onChange={(e) => handleInputChange(e, trainer.id, 'phone')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleSaveEdit(trainer.id, trainer)}
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
                    secondary={`Email: ${trainer.email}, Phone: ${trainer.phone}${trainer.archived ? ' (Archived)' : ''}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => setEditTrainer(trainer.id)}
                    >
                      <EditIcon />
                    </IconButton>
                    {/* {trainer.archived ? (
                      <IconButton
                        edge="end"
                        onClick={() => handleArchiveTrainer(trainer.id, false)}
                        color="success"
                      >
                        <UnarchiveIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        edge="end"
                        color="warning"
                        onClick={() => handleArchiveTrainer(trainer.id, true)}
                      >
                        <ArchiveIcon />
                      </IconButton>
                    )} */}
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