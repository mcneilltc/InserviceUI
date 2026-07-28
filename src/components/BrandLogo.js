import { Box, Typography } from '@mui/material';
import { BRAND_GRADIENT } from '../styles/theme';

// "CertLedger" takes the plain/theme-aware treatment "Skilled" used to have;
// "IQ" takes the brand gradient "Up" used to have. `forceLight` is for
// surfaces that always render on a dark background regardless of the
// active theme mode (e.g. the employee portal's fixed navy gradient).
const CertLedgerIQ = ({ fontSize, forceLight }) => (
  <Typography component="span" sx={{ fontWeight: 700, fontSize, lineHeight: 1, whiteSpace: 'nowrap' }}>
    <Box component="span" sx={{ color: forceLight ? '#fff' : (theme) => theme.palette.mode === 'dark' ? '#fff' : 'text.primary' }}>
      CertLedger
    </Box>
    <Box
      component="span"
      sx={{
        background: BRAND_GRADIENT,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      IQ
    </Box>
  </Typography>
);

// variant="inline" — small icon + text side by side (nav header)
// variant="stacked" — larger icon above centered text (splash/login screens)
export default function BrandLogo({ variant = 'inline', iconSize = 32, fontSize = 24, forceLight = false, sx }) {
  if (variant === 'stacked') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, ...sx }}>
        <Box component="img" src="/logo-icon.png" alt="" sx={{ width: iconSize, height: iconSize, borderRadius: '20%' }} />
        <CertLedgerIQ fontSize={fontSize} forceLight={forceLight} />
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ...sx }}>
      <Box component="img" src="/logo-icon.png" alt="" sx={{ width: iconSize, height: iconSize, borderRadius: '8px', flexShrink: 0 }} />
      <CertLedgerIQ fontSize={fontSize} forceLight={forceLight} />
    </Box>
  );
}
