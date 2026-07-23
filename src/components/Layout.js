'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Topic as TopicIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  CloudUpload as CloudUploadIcon,
  Logout as LogoutIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import { BRAND_GRADIENT } from '../styles/theme';

const drawerWidth = 240;

const ALL_MENU_ITEMS = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/manager-dashboard', roles: ['supervisor'] },
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/trainer-dashboard', roles: ['trainer'] },
  { text: 'Add Training', icon: <AddIcon />, path: '/add-training', roles: ['supervisor', 'trainer'] },
  { text: 'Upload Sheet', icon: <CloudUploadIcon />, path: '/upload-inservice', roles: ['supervisor', 'trainer'] },
  { text: 'Certifications', icon: <VerifiedUserIcon />, path: '/certifications', roles: ['supervisor'] },
  { text: 'Manage Employees', icon: <PeopleIcon />, path: '/manage-employees', roles: ['supervisor'] },
  { text: 'Manage Topics', icon: <TopicIcon />, path: '/manage-topics', roles: ['supervisor'] },
  { text: 'Manage Trainers', icon: <PersonIcon />, path: '/manage-trainers', roles: ['supervisor'] },
  { text: 'Reports', icon: <AssessmentIcon />, path: '/reports', roles: ['supervisor', 'trainer'] },
  { text: 'Employee Portal', icon: <PersonIcon />, path: '/employee', roles: ['supervisor', 'trainer'] },
];

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const menuItems = ALL_MENU_ITEMS.filter((item) => !user || item.roles.includes(user.role));

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box
          component="img"
          src="/logo-icon.png"
          alt=""
          sx={{ width: 32, height: 32, borderRadius: '8px', flexShrink: 0 }}
        />
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
          <Box
            component="span"
            sx={{
              background: BRAND_GRADIENT,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Up
          </Box>
          <Box component="span" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'text.primary' }}>
            Skilled
          </Box>
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            // button
            key={item.text}
            component={Link}
            href={item.path}
            selected={pathname === item.path}
            onClick={() => isMobile && setMobileOpen(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

  if (!mounted) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={1}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {menuItems.find(item => item.path === pathname)?.text || 'Training App'}
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {user && (
              <>
                <Typography variant="body2">
                  Hi {user.name || user.email} ({user.role})
                </Typography>
                <Button color="inherit" size="small" startIcon={<LogoutIcon />} onClick={logout}>
                  Logout
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // Height of AppBar
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
