import React, { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { CircularProgress, Box, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  adminOnly = false,
}) => {
  const { user, loading, checkAuthStatus } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      setIsChecking(true);
      try {
        // Verify authentication status
        const isAuthenticated = await checkAuthStatus();

        // Check if authorized (authenticated + admin if required)
        const hasAdminAccess = adminOnly ? !!user?.isAdmin : true;
        setIsAuthorized(isAuthenticated && hasAdminAccess);
      } catch (error) {
        console.error("Authentication check failed:", error);
        setIsAuthorized(false);
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [checkAuthStatus, user, adminOnly]);

  // Show loading state while checking authentication
  if (loading || isChecking) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          mt: 8,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Verifying your session...
        </Typography>
      </Box>
    );
  }

  // If not authorized, redirect to login
  if (!isAuthorized) {
    // If admin-only route and user is authenticated but not admin
    if (adminOnly && user) {
      return (
        <Navigate
          to="/dashboard"
          replace
          state={{ message: "You don't have permission to access this page" }}
        />
      );
    }

    // Otherwise, redirect to login with return path
    return (
      <Navigate
        to="/login"
        replace
        state={{
          message: "Please log in to continue",
          from: location.pathname,
        }}
      />
    );
  }

  // Otherwise, render the protected content
  return <Outlet />;
};

export default ProtectedRoute;
