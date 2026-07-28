'use client';

import React, { useState } from 'react';
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
  Box,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Site {
  id: string;
  name: string;
}

const ManageSites = () => {
  const queryClient = useQueryClient();
  const [newSite, setNewSite] = useState('');
  const [editSite, setEditSite] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await axios.get('/api/sites');
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
    mutationFn: ({ siteName }: { siteName: string }) =>
      axios.post('/api/sites', { siteName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setNewSite('');
      setSnackbar({ open: true, message: 'Site added successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to add site')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, siteName }: { id: string; siteName: string }) =>
      axios.put(`/api/sites/${id}`, { siteName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setEditSite(null);
      setSnackbar({ open: true, message: 'Site updated successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to update site')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/sites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setSnackbar({ open: true, message: 'Site deleted successfully', severity: 'success' });
    },
    onError: (err) => handleError(err, 'Failed to delete site')
  });

  const handleAddSite = () => {
    if (!newSite.trim()) {
      setSnackbar({ open: true, message: 'Site name cannot be empty', severity: 'error' });
      return;
    }
    createMutation.mutate({ siteName: newSite });
  };

  const startEditing = (site: Site) => {
    setEditSite(site.id);
    setEditName(site.name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      setSnackbar({ open: true, message: 'Site name cannot be empty', severity: 'error' });
      return;
    }
    updateMutation.mutate({ id, siteName: editName });
  };

  const handleDeleteSite = (site: Site) => {
    if (window.confirm(`Delete "${site.name}"? This can't be undone.`)) {
      deleteMutation.mutate(site.id);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Sites
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add, rename, or remove the physical sites available as employee locations and home locations
          throughout the app. A site can&apos;t be deleted while it&apos;s still assigned to an employee.
        </Typography>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="New Site"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
            />
          </Grid>
          <Grid size={12}>
            <Button variant="contained" color="primary" onClick={handleAddSite}>
              Add Site
            </Button>
          </Grid>
        </Grid>
        <List>
        {sites.map((site) => (
            <ListItem key={site.id}>
              {editSite === site.id ? (
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <TextField
                        fullWidth
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(site.id)}
                        autoFocus
                        size="small"
                      />
                      <Button size="small" variant="contained" onClick={() => handleSaveEdit(site.id)} sx={{ alignSelf: 'flex-start' }}>
                        Save
                      </Button>
                    </Box>
                  }
                />
              ) : (
                <ListItemText primary={site.name} />
              )}
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => (editSite === site.id ? setEditSite(null) : startEditing(site))}
                >
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" color="error" onClick={() => handleDeleteSite(site)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageSites;
