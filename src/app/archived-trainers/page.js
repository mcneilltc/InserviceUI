'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import { Unarchive as UnarchiveIcon } from '@mui/icons-material';
import axios from 'axios';

const ArchivedTrainers = () => {
  const [archivedTrainers, setArchivedTrainers] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch archived trainers
  useEffect(() => {
    const fetchArchivedTrainers = async () => {
      try {
        const response = await axios.get('/api/trainers?archived=true'); // Fetch only archived trainers
        setArchivedTrainers(response.data);
      } catch (error) {
        console.error('Error fetching archived trainers:', error);
        setSnackbar({ open: true, message: 'Failed to fetch archived trainers', severity: 'error' });
      }
    };
    fetchArchivedTrainers();
  }, []);

  // Unarchive a trainer
  const handleUnarchiveTrainer = async (id) => {
    try {
      await axios.put(`/api/trainers/${id}`, { archived: false }); // Unarchive the trainer
      setArchivedTrainers((prev) => prev.filter((trainer) => trainer.id !== id)); // Remove from the list
      setSnackbar({ open: true, message: 'Trainer unarchived successfully', severity: 'success' });
    } catch (error) {
      console.error('Error unarchiving trainer:', error);
      setSnackbar({ open: true, message: 'Failed to unarchive trainer', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Archived Trainers
        </Typography>
        <List>
          {archivedTrainers.length > 0 ? (
            archivedTrainers.map((trainer) => (
              <ListItem key={trainer.id}>
                <ListItemText
                  primary={trainer.name}
                  secondary={`Email: ${trainer.email}, Phone: ${trainer.phone}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    color="success"
                    onClick={() => handleUnarchiveTrainer(trainer.id)}
                  >
                    <UnarchiveIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          ) : (
            <Typography variant="body1" color="text.secondary">
              No archived trainers found.
            </Typography>
          )}
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

export default ArchivedTrainers;