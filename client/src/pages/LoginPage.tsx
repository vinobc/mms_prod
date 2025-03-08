/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Link,
  Grid,
  Avatar,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  LockOutlined as LockOutlinedIcon,
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import amityLogo from "../assets/amity_logo.png";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, register, error, loading, clearError, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Check for redirect message from location state
  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      setLocalError(state.message);
    }
  }, [location]);

  const validateForm = () => {
    if (!email.trim()) {
      setLocalError("Email is required");
      return false;
    }

    if (!password.trim()) {
      setLocalError("Password is required");
      return false;
    }

    if (showRegister) {
      if (!name.trim()) {
        setLocalError("Name is required");
        return false;
      }

      if (!department.trim()) {
        setLocalError("Department is required");
        return false;
      }

      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters");
        return false;
      }
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearLocalErrors();

    if (!validateForm()) {
      return;
    }

    try {
      await login({ email, password });
      // If login is successful, the user will be redirected via the useEffect hook
    } catch (err: any) {
      console.error("Login failed:", err);
      setLocalError(err.message || "Login failed. Please try again.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearLocalErrors();

    if (!validateForm()) {
      return;
    }

    try {
      await register({ name, email, password, department });
      // If registration is successful, the user will be redirected via the useEffect hook
    } catch (err: any) {
      console.error("Registration failed:", err);
      setLocalError(err.message || "Registration failed. Please try again.");
    }
  };

  const toggleForm = () => {
    setShowRegister(!showRegister);
    clearLocalErrors();
    // Clear form fields when switching forms
    if (!showRegister) {
      setName("");
      setDepartment("");
    }
    setEmail("");
    setPassword("");
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const clearLocalErrors = () => {
    setLocalError(null);
    clearError();
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <img
            src={amityLogo}
            alt="Amity University Logo"
            style={{
              maxWidth: "100%",
              height: "auto",
              maxHeight: "100px",
            }}
          />
        </Box>
        <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          {showRegister ? "Register" : "Sign in"}
        </Typography>
        <Paper elevation={3} sx={{ mt: 2, p: 4, width: "100%" }}>
          {showRegister ? (
            <Box component="form" onSubmit={handleRegister} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Full Name"
                name="name"
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={localError?.includes("Name")}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={localError?.includes("Email")}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="department"
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                error={localError?.includes("Department")}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={localError?.includes("Password")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={toggleShowPassword} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Register"}
              </Button>
              <Grid container justifyContent="flex-end">
                <Grid item>
                  <Link
                    variant="body2"
                    onClick={toggleForm}
                    sx={{ cursor: "pointer" }}
                  >
                    Already have an account? Sign in
                  </Link>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleLogin} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={
                  localError?.includes("Email") || localError?.includes("email")
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={
                  localError?.includes("Password") ||
                  localError?.includes("password")
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={toggleShowPassword} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Sign In"}
              </Button>
              <Grid container justifyContent="flex-end">
                <Grid item>
                  <Link
                    variant="body2"
                    onClick={toggleForm}
                    sx={{ cursor: "pointer" }}
                  >
                    Don't have an account? Register
                  </Link>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
      </Box>
      <Snackbar
        open={!!localError || !!error}
        autoHideDuration={6000}
        onClose={clearLocalErrors}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={clearLocalErrors}
          severity="error"
          sx={{ width: "100%" }}
        >
          {localError || error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LoginPage;
