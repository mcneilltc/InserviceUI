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
  PhotoLibrary as PhotoLibraryIcon,
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
import { rolesAtLeast } from '../lib/roles';

const drawerWidth = 240;

// Display labels — the raw role strings (esp. 'seniorSupervisor') aren't fit
// for showing to a user.
const ROLE_LABELS = {
  admin: 'Admin',
  seniorSupervisor: 'Senior Supervisor',
  supervisor: 'Supervisor',
  trainer: 'Trainer',
  employee: 'Employee',
};

const ALL_MENU_ITEMS = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/manager-dashboard', roles: rolesAtLeast('supervisor') },
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/trainer-dashboard', roles: ['trainer'] },
  { text: 'Add Training', icon: <AddIcon />, path: '/add-training', roles: rolesAtLeast('trainer') },
  { text: 'Upload Sheet', icon: <CloudUploadIcon />, path: '/upload-inservice', roles: rolesAtLeast('trainer') },
  { text: 'Sign-In Sheets', icon: <PhotoLibraryIcon />, path: '/sign-in-sheets', roles: rolesAtLeast('trainer') },
  { text: 'Certifications', icon: <VerifiedUserIcon />, path: '/certifications', roles: rolesAtLeast('supervisor') },
  { text: 'Training Analytics', icon: <InsightsIcon />, path: '/training-analytics', roles: rolesAtLeast('supervisor') },
  { text: 'Manage Employees', icon: <PeopleIcon />, path: '/manage-employees', roles: rolesAtLeast('supervisor') },
  { text: 'Manage Topics', icon: <TopicIcon />, path: '/manage-topics', roles: rolesAtLeast('supervisor') },
  { text: 'Manage Sites', icon: <LocationOnIcon />, path: '/manage-sites', roles: rolesAtLeast('supervisor') },
  { text: 'Incentive Program', icon: <EmojiEventsIcon />, path: '/manage-incentives', roles: rolesAtLeast('supervisor') },
  { text: 'Reports', icon: <AssessmentIcon />, path: '/reports', roles: rolesAtLeast('trainer') },
  { text: 'Employee Portal', icon: <PersonIcon />, path: '/employee', roles: rolesAtLeast('trainer') },
  // When I Work integration commented out of production for now — both of
  // these depend on backend routes currently unmounted in app.ts. Restore
  // together with the app.ts route mounts when re-enabling.
  // { text: 'Shift Attendance', icon: <EventBusyIcon />, path: '/shift-attendance', roles: rolesAtLeast('supervisor') },
  // { text: 'Shifts', icon: <EventAvailableIcon />, path: '/shifts', roles: ['employee'] },
];

const SIDEBAR_OPEN_STORAGE_KEY = 'sidebarOpen';

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop sidebar defaults open; the actual saved preference is read from
  // localStorage after mount (see the mounted-gated effect below) so it
  // doesn't cause a server/client hydration mismatch.
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const theme = useTheme();
  const { mode, systemMode, setMode } = useColorScheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const menuItems = ALL_MENU_ITEMS.filter((item) => !user || item.roles.includes(user.role));

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    if (stored !== null) setDesktopOpen(stored === 'true');
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, String(desktopOpen));
  }, [desktopOpen, mounted]);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setDesktopOpen((prev) => !prev);
    }
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
          width: { sm: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { sm: desktopOpen ? `${drawerWidth}px` : 0 },
          bgcolor: 'background.paper',
          color: 'text.primary',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle navigation"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
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
                  Hi {user.name || user.email} ({ROLE_LABELS[user.role] || user.role})
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
        sx={{
          width: { sm: desktopOpen ? drawerWidth : 0 },
          flexShrink: { sm: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
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
            variant="persistent"
            open={desktopOpen}
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
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
          width: { sm: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          mt: '64px', // Height of AppBar
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
