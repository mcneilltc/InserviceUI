'use client';

import Link from 'next/link';
import { Box, Button, Container, Paper, Typography, Stack } from '@mui/material';
import { AccessTime as AccessTimeIcon, Login as LoginIcon } from '@mui/icons-material';

export default function Home() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', justifyContent: 'center', py: 6 }}>
        <Paper sx={{ p: 5, width: '100%', textAlign: 'center' }}>
          <Box
            component="img"
            src="/logo-full.png"
            alt="UpSkilled"
            sx={{ width: '100%', maxWidth: 220, borderRadius: 3, mb: 3 }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Check your inservice training hours, or sign in if you&apos;re staff.
          </Typography>

          <Stack spacing={2}>
            <Button
              component={Link}
              href="/employee"
              variant="contained"
              size="large"
              fullWidth
              startIcon={<AccessTimeIcon />}
            >
              Check My Hours
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<LoginIcon />}
            >
              Staff Login
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
