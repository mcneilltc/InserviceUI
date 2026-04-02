import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#4F46E5', // Deep Indigo
        },
        secondary: {
          main: '#0D9488', // Vibrant Teal
        },
        background: {
          default: '#F9FAFB', // Soft Gray
          paper: '#FFFFFF', // Pure White
        },
        text: {
          primary: '#1E293B', // Dark Slate
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#818CF8', // Soft Indigo
        },
        secondary: {
          main: '#2DD4BF', // Soft Teal
        },
        background: {
          default: '#0F172A', // Dark Slate
          paper: '#1E293B', // Surface Slate
        },
        text: {
          primary: '#F8FAFC', // Slate Ash
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none', // Modern look
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;