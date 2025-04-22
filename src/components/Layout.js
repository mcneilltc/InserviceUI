'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
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
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import GoogleAuth from '@/components/GoogleAuth';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/manager-dashboard' },
  { text: 'Add Training', icon: <AddIcon />, path: '/add-training' },
  { text: 'Manage Topics', icon: <TopicIcon />, path: '/manage-topics' },
  { text: 'Manage Trainers', icon: <PersonIcon />, path: '/manage-trainers' },
  { text: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
];

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          iTrain
        </Typography>
      </Toolbar>
      <Divider />
      <List>
  {menuItems.map((item) => (
    <ListItem key={item.text} disablePadding>
      <ListItemButton
        component={Link}
        href={item.path}
        selected={pathname === item.path}
        onClick={() => isMobile && setMobileOpen(false)}
      >
        <ListItemIcon>{item.icon}</ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
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
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
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
          <Box sx={{ ml: 'auto' }}>
            <GoogleAuth /> {/* Add GoogleAuth component here */}
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