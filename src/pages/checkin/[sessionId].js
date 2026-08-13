import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  Box,
} from '@mui/material';
import axios from 'axios';

// Fixed capture resolution — keeps output signature PNGs small and
// consistent regardless of the phone's actual screen size.
const SIGNATURE_WIDTH = 350;
const SIGNATURE_HEIGHT = 120;

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

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getCanvasPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    return {
      x: (point.clientX - rect.left) * (SIGNATURE_WIDTH / rect.width),
      y: (point.clientY - rect.top) * (SIGNATURE_HEIGHT / rect.height),
    };
  };
  const startSignature = (event) => {
    event.preventDefault();
    isDrawing.current = true;
    const { x, y } = getCanvasPoint(event);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const moveSignature = (event) => {
    if (!isDrawing.current) return;
    event.preventDefault();
    const { x, y } = getCanvasPoint(event);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };
  const endSignature = () => {
    isDrawing.current = false;
  };
  const clearSignature = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
    setHasSignature(false);
  };


  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
    }
  }, []);

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
      const signature = canvasRef.current.toDataURL('image/png');
      await axios.post(`${BACKEND_URL}/api/checkin`, { sessionId, ...formData, signature });
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
            <Typography variant="body2" sx={{ mb: 1 }}>
              Sign below to confirm attendance
            </Typography>
            <Box
              component="canvas"
              ref={canvasRef}
              width={SIGNATURE_WIDTH}
              height={SIGNATURE_HEIGHT}
              onMouseDown={startSignature}
              onMouseMove={moveSignature}
              onMouseUp={endSignature}
              onMouseLeave={endSignature}
              onTouchStart={startSignature}
              onTouchMove={moveSignature}
              onTouchEnd={endSignature}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                width: '100%',
                height: 120,
                touchAction: 'none',
                mb: 1,
              }}
            />
            <Button size="small" onClick={clearSignature} sx={{ mb: 2 }}>
              Clear Signature
            </Button>
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={!hasSignature}>
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
