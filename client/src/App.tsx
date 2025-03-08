import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import MainLayout from "./components/layout/MainLayout";
import CoursesPage from "./pages/CoursesPage";
import ScoresPage from "./pages/ScoresPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import FacultyManagementPage from "./pages/admin/FacultyManagementPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <MainLayout>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/scores" element={<ScoresPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute adminOnly={true} />}>
                <Route
                  path="/admin/faculty"
                  element={<FacultyManagementPage />}
                />
              </Route>

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </MainLayout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
