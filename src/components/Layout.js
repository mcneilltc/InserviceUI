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
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
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
  LocationOn as LocationOnIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Insights as InsightsIcon,
  EmojiEvents as EmojiEventsIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import BrandLogo from './BrandLogo';

const drawerWidth = 240;

const ALL_MENU_ITEMS = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/manager-dashboard', roles: ['supervisor'] },
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/trainer-dashboard', roles: ['trainer'] },
  { text: 'Add Training', icon: <AddIcon />, path: '/add-training', roles: ['supervisor', 'trainer'] },
  { text: 'Upload Sheet', icon: <CloudUploadIcon />, path: '/upload-inservice', roles: ['supervisor', 'trainer'] },
  { text: 'Certifications', icon: <VerifiedUserIcon />, path: '/certifications', roles: ['supervisor'] },
  { text: 'Training Analytics', icon: <InsightsIcon />, path: '/training-analytics', roles: ['supervisor'] },
  { text: 'Manage Employees', icon: <PeopleIcon />, path: '/manage-employees', roles: ['supervisor'] },
  { text: 'Manage Topics', icon: <TopicIcon />, path: '/manage-topics', roles: ['supervisor'] },
  { text: 'Manage Sites', icon: <LocationOnIcon />, path: '/manage-sites', roles: ['supervisor'] },
  { text: 'Incentive Program', icon: <EmojiEventsIcon />, path: '/manage-incentives', roles: ['supervisor'] },
  { text: 'Reports', icon: <AssessmentIcon />, path: '/reports', roles: ['supervisor', 'trainer'] },
  { text: 'Employee Portal', icon: <PersonIcon />, path: '/employee', roles: ['supervisor', 'trainer'] },
  // When I Work integration commented out of production for now — both of
  // these depend on backend routes currently unmounted in app.ts. Restore
  // together with the app.ts route mounts when re-enabling.
  // { text: 'Shift Attendance', icon: <EventBusyIcon />, path: '/shift-attendance', roles: ['supervisor'] },
  // { text: 'Shifts', icon: <EventAvailableIcon />, path: '/shifts', roles: ['employee'] },
];

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const theme = useTheme();
  const { mode, systemMode, setMode } = useColorScheme();
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

  const resolvedMode = mode === 'system' ? systemMode : mode;
  const handleToggleColorMode = () => {
    setMode(resolvedMode === 'dark' ? 'light' : 'dark');
  };

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', alignItems: 'center' }}>
        <BrandLogo iconSize={32} fontSize={20} />
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            // button
            key={item.path}
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
            <Tooltip title={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton color="inherit" onClick={handleToggleColorMode} aria-label="toggle color mode">
                {resolvedMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            {user && (
              <>
                <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }} noWrap>
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
          minWidth: 0, // flex items default to min-width:auto, which lets content refuse to shrink and overflow the viewport instead of wrapping
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
