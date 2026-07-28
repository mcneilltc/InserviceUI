import { createTheme } from '@mui/material/styles';

// CertLedgerIQ brand palette, sampled from the logo (clock+arrow mark, navy background).
export const BRAND_NAVY = '#06102C';
export const BRAND_NAVY_SURFACE = '#101B3D'; // lightened navy for card/paper surfaces
export const BRAND_BLUE = '#00C6FB';
export const BRAND_GREEN = '#00EEC0';
export const BRAND_GRADIENT = `linear-gradient(90deg, ${BRAND_BLUE}, ${BRAND_GREEN})`;

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#0090C7', // Brand blue, deepened for contrast on white
        },
        secondary: {
          main: '#00B893', // Brand green, deepened for contrast on white
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
          main: BRAND_BLUE,
        },
        secondary: {
          main: BRAND_GREEN,
        },
        background: {
          default: BRAND_NAVY,
          paper: BRAND_NAVY_SURFACE,
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