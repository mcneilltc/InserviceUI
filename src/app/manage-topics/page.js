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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const ManageTopics = () => {
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [editTopic, setEditTopic] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    // Mock API call to fetch topics
    const fetchTopics = async () => {
      const mockTopics = ['Safety Procedures', 'Equipment Maintenance', 'Emergency Response'];
      setTopics(mockTopics);
    };
    fetchTopics();
  }, []);

  const handleAddTopic = () => {
    if (!newTopic.trim()) {
      setSnackbar({ open: true, message: 'Topic name cannot be empty', severity: 'error' });
      return;
    }
    setTopics((prev) => [...prev, newTopic]);
    setNewTopic('');
    setSnackbar({ open: true, message: 'Topic added successfully', severity: 'success' });
  };

  const handleEditTopic = (index, updatedName) => {
    const updatedTopics = [...topics];
    updatedTopics[index] = updatedName;
    setTopics(updatedTopics);
    setEditTopic(null);
    setSnackbar({ open: true, message: 'Topic updated successfully', severity: 'success' });
  };

  const handleDeleteTopic = (index) => {
    const updatedTopics = topics.filter((_, i) => i !== index);
    setTopics(updatedTopics);
    setSnackbar({ open: true, message: 'Topic deleted successfully', severity: 'success' });
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Topics
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={9}>
            <TextField
              fullWidth
              label="New Topic"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
            />
          </Grid>
          <Grid item xs={3}>
            <Button variant="contained" color="primary" fullWidth onClick={handleAddTopic}>
              Add Topic
            </Button>
          </Grid>
        </Grid>
        <List>
          {topics.map((topic, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={
                  editTopic === index ? (
                    <TextField
                      fullWidth
                      defaultValue={topic}
                      onBlur={(e) => handleEditTopic(index, e.target.value)}
                      autoFocus
                    />
                  ) : (
                    topic
                  )
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => (editTopic === index ? setEditTopic(null) : setEditTopic(index))}
                >
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" color="error" onClick={() => handleDeleteTopic(index)}>
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