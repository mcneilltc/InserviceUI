'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { CircularProgress, Box } from '@mui/material';

// Path prefix -> roles allowed to view it. First matching prefix wins.
const ROUTE_PERMISSIONS = [
  { prefix: '/manager-dashboard', roles: ['supervisor'] },
  { prefix: '/trainer-dashboard', roles: ['trainer'] },
  { prefix: '/certifications', roles: ['supervisor'] },
  { prefix: '/training-analytics', roles: ['supervisor'] },
  { prefix: '/manage-employees', roles: ['supervisor'] },
  { prefix: '/manage-topics', roles: ['supervisor'] },
  { prefix: '/manage-sites', roles: ['supervisor'] },
  { prefix: '/add-training', roles: ['supervisor', 'trainer'] },
  { prefix: '/upload-inservice', roles: ['supervisor', 'trainer'] },
  { prefix: '/reports', roles: ['supervisor', 'trainer'] },
  { prefix: '/shifts', roles: ['employee'] },
];

function getRequiredRoles(pathname) {
  const match = ROUTE_PERMISSIONS.find((r) => pathname?.startsWith(r.prefix));
  return match ? match.roles : [];
}

function homeFor(role) {
  if (role === 'employee') return '/shifts';
  return role === 'trainer' ? '/trainer-dashboard' : '/manager-dashboard';
}

const ProtectedRoute = ({ pathname, children }) => {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const requiredRoles = getRequiredRoles(pathname);
  const isAuthorized = !!user && requiredRoles.includes(user.role);

  useEffect(() => {
    if (authLoading) return; // wait for GET /api/auth/session to resolve first
    if (!user) {
      router.push('/login');
    } else if (!requiredRoles.includes(user.role)) {
      router.push(homeFor(user.role));
    }
  }, [user, authLoading, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || !isAuthorized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;
