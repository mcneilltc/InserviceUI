import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import axios from 'axios';

const CheckIn = () => {
  const router = useRouter();
  const { sessionId } = router.query;

  const [formData, setFormData] = useState({
    badgeNumber: '',
    firstName: '',
    lastName: '',
  });
  const [sessionName, setSessionName] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });


  useEffect(() => {
    if (sessionId) {
      const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party
      axios
        .get(`${BACKEND_URL}/api/sessions/${sessionId}`)
        .then((response) => {
          setSessionName(response.data.name || (response.data.topics && response.data.topics.join(', ')) || response.data.topic || 'Training Session');
        })
        .catch((error) => {
          console.error("Error fetching session details:", error);
          setSessionName("Training Session");
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
      const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party
      await axios.post(`${BACKEND_URL}/api/checkin`, { sessionId, ...formData });
      setCheckedIn(true);
      setSnackbar({ open: true, message: 'Check-in successful! Your training time starts now.', severity: 'success' });
    } catch (error) {
      console.error('Error during check-in:', error);
      const message = error.response?.data?.message || 'Failed to check in.';
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Check-In for {sessionName} Training
        </Typography>
        {checkedIn ? (
          <Alert severity="success">
            You&apos;re checked in! Your trainer will close out the session when training ends.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Badge Number"
              value={formData.badgeNumber}
              onChange={handleChange('badgeNumber')}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              required
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Submit
            </Button>
          </form>
        )}
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
