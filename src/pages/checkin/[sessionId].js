import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import axios from 'axios';

const CheckIn = () => {
  const router = useRouter();
  const { sessionId } = router.query;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
  });
  const [sessionName, setSessionName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });


  useEffect(() => {
    if (sessionId) {
      console.log("Fetching session details for sessionId:", sessionId);
      axios
        .get(`/api/training-sessions/${sessionId}`)
        .then((response) => {
          setSessionName(response.data.name);
        })
        .catch((error) => {
          console.error("Error fetching session details:", error);
          setSessionName("");
        });
    }
  }, [sessionId]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`/api/checkin`, { sessionId, ...formData });
      setSnackbar({ open: true, message: 'Check-in successful!', severity: 'success' });
    } catch (error) {
      console.error('Error during check-in:', error);
      setSnackbar({ open: true, message: 'Failed to check in.', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Check-In for {sessionName} Training
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={handleChange('name')}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Phone"
            value={formData.phone}
            onChange={handleChange('phone')}
            required
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>Location</InputLabel>
            <Select
              value={formData.location}
              onChange={handleChange('location')}
            >
              <MenuItem value="">Select Location</MenuItem>
              <MenuItem value="MCAC">MCAC</MenuItem>
              <MenuItem value="Cordelia">Cordelia</MenuItem>
              <MenuItem value="Double Oaks">Double Oaks</MenuItem>
              <MenuItem value="Ramsey Creek Beach">Ramsey Creek Beach</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Submit
          </Button>
        </form>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CheckIn;