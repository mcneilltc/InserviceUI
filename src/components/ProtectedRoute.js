'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { CircularProgress, Box } from '@mui/material';

// Path prefix -> roles allowed to view it. First matching prefix wins.
const ROUTE_PERMISSIONS = [
  { prefix: '/manager-dashboard', roles: ['supervisor'] },
  { prefix: '/manage-employees', roles: ['supervisor'] },
  { prefix: '/manage-trainers', roles: ['supervisor'] },
  { prefix: '/archived-trainers', roles: ['supervisor'] },
  { prefix: '/manage-topics', roles: ['supervisor'] },
  { prefix: '/add-training', roles: ['supervisor', 'trainer'] },
  { prefix: '/upload-inservice', roles: ['supervisor', 'trainer'] },
  { prefix: '/reports', roles: ['supervisor', 'trainer'] },
];

function getRequiredRoles(pathname) {
  const match = ROUTE_PERMISSIONS.find((r) => pathname?.startsWith(r.prefix));
  return match ? match.roles : [];
}

function homeFor(role) {
  return role === 'trainer' ? '/add-training' : '/manager-dashboard';
}

const ProtectedRoute = ({ pathname, children }) => {
  const { user } = useAuth();
  const router = useRouter();
  const requiredRoles = getRequiredRoles(pathname);
  const isAuthorized = !!user && requiredRoles.includes(user.role);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (!requiredRoles.includes(user.role)) {
      router.push(homeFor(user.role));
    }
  }, [user, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthorized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;
