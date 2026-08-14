'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { CircularProgress, Box } from '@mui/material';
import { rolesAtLeast } from '../lib/roles';

// Path prefix -> roles allowed to view it. First matching prefix wins.
const ROUTE_PERMISSIONS = [
  { prefix: '/manager-dashboard', roles: rolesAtLeast('supervisor') },
  { prefix: '/trainer-dashboard', roles: ['trainer'] },
  { prefix: '/certifications', roles: rolesAtLeast('supervisor') },
  { prefix: '/training-analytics', roles: rolesAtLeast('supervisor') },
  { prefix: '/manage-employees', roles: rolesAtLeast('supervisor') },
  { prefix: '/manage-topics', roles: rolesAtLeast('supervisor') },
  // Viewable by Supervisor and up — the page itself disables create/edit/
  // delete controls unless the viewer is Admin (see manage-sites/page.tsx).
  { prefix: '/manage-sites', roles: rolesAtLeast('supervisor') },
  { prefix: '/manage-incentives', roles: rolesAtLeast('supervisor') },
  { prefix: '/add-training', roles: rolesAtLeast('trainer') },
  { prefix: '/upload-inservice', roles: rolesAtLeast('trainer') },
  { prefix: '/sign-in-sheets', roles: rolesAtLeast('trainer') },
  { prefix: '/reports', roles: rolesAtLeast('trainer') },
  // When I Work integration commented out of production for now — see
  // components/Layout.js for the matching nav-entry comment.
  // { prefix: '/shift-attendance', roles: rolesAtLeast('supervisor') },
  // { prefix: '/shifts', roles: ['employee'] },
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
