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

const ManageTopics = () => {
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [editTopic, setEditTopic] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    // // Mock API call to fetch topics
    // const fetchTopics = async () => {
    //   const mockTopics = ['Safety Procedures', 'Equipment Maintenance', 'Emergency Response'];
    //   setTopics(mockTopics);
    // };
    // fetchTopics();

    // Fetch topics from the backend
    const fetchTopics = async () => {
      try {
        const response = await axios.get('/api/training-topics'); // Replace with your backend endpoint
        setTopics(response.data);
      } catch (error) {
        console.error('Error fetching topics:', error);
        setSnackbar({ open: true, message: 'Failed to fetch topics', severity: 'error' });
      }
    };
    fetchTopics();

  }, []);

   // Add a new topic
   const handleAddTopic = async () => {
    // If the new topic is empty, show an error message
    if (!newTopic.trim()) {
      setSnackbar({ open: true, message: 'Topic name cannot be empty', severity: 'error' });
      return;
    }


    try {
      // Make a POST request to the backend to add the new topic
      // If I remember correctly, axios setup
      const response = await axios.post('/api/training-topics', { topicName: newTopic });
      // At the top of this component, we have a state variable called topics that holds the list of topics
      // We use the setTopics function to update this state variable
        // We use the spread operator (...) to create a new array that includes all the previous topics
      // If the topic is successfully added, it is included in the response from the server after
      // calling /api/training-topics. We then add this new topic to the list of topics and update
      // the state variable.
      setTopics((prev) => [...prev, response.data.topic]);
      console.log('Topic added:', response.data);
      setNewTopic('');
      // The snackbar is a component that shows a message at the bottom of the screen
      // It is used to provide feedback to the user about the success or failure of an action
      setSnackbar({ open: true, message: 'Topic added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error adding topic:', error);
      setSnackbar({ open: true, message: 'Failed to add topic', severity: 'error' });
    }
  };

 // Edit an existing topic
 const handleEditTopic = async (id, updatedName) => {
  if (!updatedName.trim()) {
    setSnackbar({ open: true, message: 'Topic name cannot be empty', severity: 'error' });
    return;
  }
  try {
    const response = await axios.put(`/api/training-topics/${id}`, { topicName: updatedName });
    setTopics((prev) =>
      prev.map((topic) => (topic.id === id ? { ...topic, name: response.data.topic.name } : topic))
    );
    setEditTopic(null);
    setSnackbar({ open: true, message: 'Topic updated successfully', severity: 'success' });
  } catch (error) {
    console.error('Error updating topic:', error);
    setSnackbar({ open: true, message: 'Failed to update topic', severity: 'error' });
  }
};
 // Delete a topic
 const handleDeleteTopic = async (id) => {
  try {
    await axios.delete(`/api/training-topics/${id}`);
    setTopics((prev) => prev.filter((topic) => topic.id !== id));
    setSnackbar({ open: true, message: 'Topic deleted successfully', severity: 'success' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    const errorMessage =
      error.response?.data?.message || 'Failed to delete topic';
    setSnackbar({ open: true, message: errorMessage, severity: 'error' });
  }
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
