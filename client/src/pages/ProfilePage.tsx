/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const ProfilePage: React.FC = () => {
  const { user, updateProfile, loading, error } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [success, setSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation for profile update
    if (!name.trim() || !email.trim() || !department.trim()) {
      setValidationError("All fields are required");
      return;
    }

    try {
      // Update profile without password change
      if (!currentPassword && !newPassword) {
        await updateProfile({ name, email, department });
      }
      // Update with password change
      else {
        // Validate password fields
        if (newPassword !== confirmPassword) {
          setValidationError("New passwords do not match");
          return;
        }

        if (newPassword.length < 6) {
          setValidationError("Password must be at least 6 characters long");
          return;
        }

        await updateProfile({
          name,
          email,
          department,
          currentPassword,
          newPassword,
        });

        // Clear password fields after success
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      setSuccess("Profile updated successfully");
    } catch (err) {
      // Error is handled by the AuthContext
    }
  };

  const clearSuccess = () => {
    setSuccess(null);
  };

  const clearError = () => {
    setValidationError(null);
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Faculty Profile
      </Typography>

      <Paper elevation={3} sx={{ p: 4 }}>
        <form onSubmit={handleUpdateProfile}>
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </Grid>
          </Grid>

          <Box sx={{ my: 3 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Update Profile"}
            </Button>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Leave blank to keep current password"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Update Password"}
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={clearSuccess}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={clearSuccess} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!validationError || !!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={clearError} severity="error">
          {validationError || error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage;
