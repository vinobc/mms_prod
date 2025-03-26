import React, { useState } from "react";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Button,
  Menu,
  MenuItem,
  Avatar,
  ListItemButton,
} from "@mui/material";
import {
  Menu as MenuIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Dashboard as DashboardIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Group as GroupIcon, // Added for Student Database
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import amityLogo from "../../assets/amity_logo.png"; // Import the logo

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] =
    useState<null | HTMLElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isAuthenticated = !!user;
  const isAdmin = user?.isAdmin || false;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    handleProfileMenuClose();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/dashboard",
      requireAuth: true,
    },
    {
      text: "Courses",
      icon: <SchoolIcon />,
      path: "/courses",
      requireAuth: true,
    },
    {
      text: "Scores",
      icon: <AssessmentIcon />,
      path: "/scores",
      requireAuth: true,
    },
  ];

  // Admin-only menu items
  const adminMenuItems = [
    {
      text: "Faculty Management",
      icon: <PeopleIcon />,
      path: "/admin/faculty",
      adminOnly: true,
    },
    {
      text: "Student Database", // New entry for Student Database
      icon: <GroupIcon />,
      path: "/admin/students",
      adminOnly: true,
    },
    {
      text: "System Settings",
      icon: <SettingsIcon />,
      path: "/admin/settings",
      adminOnly: true,
    },
  ];

  // Combine regular and admin items if user is admin
  const allMenuItems = isAdmin ? [...menuItems, ...adminMenuItems] : menuItems;

  // Only show items appropriate for auth state
  const filteredMenuItems = allMenuItems.filter(
    (item) =>
      (!item.requireAuth || isAuthenticated) && (!item.adminOnly || isAdmin)
  );

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          MMS
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {filteredMenuItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => handleNavigate(item.path)}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
    </div>
  );

  const profileMenu = (
    <Menu
      anchorEl={profileMenuAnchor}
      open={Boolean(profileMenuAnchor)}
      onClose={handleProfileMenuClose}
      transformOrigin={{ horizontal: "right", vertical: "top" }}
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
    >
      <MenuItem
        onClick={() => {
          handleProfileMenuClose();
          navigate("/profile");
        }}
      >
        <ListItemIcon>
          <AccountCircleIcon fontSize="small" />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: "none" } }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ display: { xs: "block", sm: "block" } }}
            >
              Marks Management System
            </Typography>
          </Box>

          {/* Logo in the center of the AppBar */}
          <Box
            component="img"
            src={amityLogo}
            alt="Amity University Logo"
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              height: 40,
            }}
          />

          {isAuthenticated ? (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {isAdmin && (
                <Typography
                  variant="caption"
                  sx={{
                    mr: 1,
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  Admin
                </Typography>
              )}
              <Button
                color="inherit"
                onClick={handleProfileMenuOpen}
                startIcon={
                  <Avatar
                    sx={{ width: 28, height: 28, bgcolor: "primary.dark" }}
                  >
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </Avatar>
                }
              >
                {user.name}
              </Button>
              {profileMenu}
            </Box>
          ) : (
            <Button color="inherit" onClick={() => navigate("/login")}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {isAuthenticated && (
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: "block", sm: "none" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: "none", sm: "block" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: {
            sm: isAuthenticated ? `calc(100% - ${drawerWidth}px)` : "100%",
          },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
