/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
  Box,
  Paper,
} from "@mui/material";
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { facultyService } from "../services/facultyService";
import { Course } from "../types";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const assignedCourses = await facultyService.getAssignedCourses();
        setCourses(assignedCourses);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch courses");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleCourseClick = (courseId: string) => {
    navigate(`/courses?courseId=${courseId}`);
  };

  const handleScoresClick = (courseId: string) => {
    navigate(`/scores?courseId=${courseId}`);
  };

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user?.name}
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {user?.department} - {user?.isAdmin ? "Administrator" : "Faculty"}
        </Typography>
      </Paper>

      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Your Assigned Courses
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : courses.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" color="textSecondary">
            You don't have any assigned courses yet.
            {user?.isAdmin &&
              " As an admin, you can manage all courses from the Courses page."}
          </Typography>
          {user?.isAdmin && (
            <button
              style={{
                backgroundColor: "#1976d2",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "16px",
              }}
              onClick={() => navigate("/courses")}
            >
              Manage Courses
            </button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={4}>
          {courses.map((course) => (
            <Grid item key={course._id} xs={12} sm={12} md={6}>
              <div
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                  backgroundColor: "white",
                  minHeight: "40%",
                  width: "100%",
                }}
              >
                {/* Course Header */}
                <div style={{ padding: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <SchoolIcon
                      style={{
                        color: "#1976d2",
                        marginRight: "12px",
                        fontSize: "28px",
                      }}
                    />
                    <span style={{ fontSize: "24px", fontWeight: 500 }}>
                      {course.code}
                    </span>
                  </div>

                  <h2
                    style={{
                      fontSize: "22px",
                      fontWeight: 600,
                      marginTop: "0",
                      marginBottom: "0px",
                      color: "#212121",
                    }}
                  >
                    {course.name}
                  </h2>

                  <div
                    style={{
                      marginBottom: "0px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#666",
                        width: "80px",
                        display: "inline-block",
                      }}
                    >
                      Type:
                    </span>
                    <span style={{ display: "inline-block" }}>
                      {course.type}
                    </span>
                  </div>

                  <div
                    style={{
                      marginBottom: "0px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#666",
                        width: "80px",
                        display: "inline-block",
                      }}
                    >
                      Slot:
                    </span>
                    <span style={{ display: "inline-block" }}>
                      {course.slot}
                    </span>
                  </div>

                  <div
                    style={{
                      marginBottom: "24px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#666",
                        width: "80px",
                        display: "inline-block",
                      }}
                    >
                      Venue:
                    </span>
                    <span style={{ display: "inline-block" }}>
                      {course.venue || "Not specified"}
                    </span>
                  </div>
                </div>

                {/* Course Actions */}
                <div
                  style={{
                    padding: "16px 24px",
                    display: "flex",
                    borderTop: "1px solid #eee",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={() => handleCourseClick(course._id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 24px",
                      borderRadius: "4px",
                      border: "1px solid #1976d2",
                      backgroundColor: "white",
                      color: "#1976d2",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      marginRight: "12px",
                      width: "45%",
                    }}
                  >
                    <SchoolIcon
                      style={{ marginRight: "8px", fontSize: "18px" }}
                    />
                    Details
                  </button>

                  <button
                    onClick={() => handleScoresClick(course._id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 24px",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: "#1976d2",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      width: "55%",
                    }}
                  >
                    <AssignmentIcon
                      style={{ marginRight: "8px", fontSize: "18px" }}
                    />
                    Manage Scores
                  </button>
                </div>
              </div>
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DashboardPage;
