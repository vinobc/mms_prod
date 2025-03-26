// client/src/pages/AttendancePage.tsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip, // Add Chip import
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon, // Add AccessTimeIcon import
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import AttendanceTable from "../components/attendance/AttendanceTable";
import AttendanceHistory from "../components/attendance/AttendanceHistory";
import AttendanceStats from "../components/attendance/AttendanceStats";
import { courseService } from "../services/courseService";
import { attendanceService } from "../services/attendanceService";
import { Course } from "../types";
import { facultyService } from "../services/facultyService";

// Rest of the component code remains the same

const AttendancePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State variables
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [attendanceDate, setAttendanceDate] = useState<Date | null>(new Date());
  const [component, setComponent] = useState<"theory" | "lab" | "">("");
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any | null>(null);

  // For course selection screen
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Check if courseId is provided in URL
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const courseId = query.get("courseId");

    if (courseId) {
      fetchCourseData(courseId);
    } else {
      // If no courseId, load assigned courses
      fetchAssignedCourses();
    }
  }, [location]);

  // Fetch assigned courses for selection
  const fetchAssignedCourses = async () => {
    try {
      setLoadingCourses(true);
      const courses = await facultyService.getAssignedCourses();
      setAssignedCourses(courses);
      setLoading(false);
    } catch (error: any) {
      setError(error.message || "Failed to load assigned courses");
      setLoading(false);
    } finally {
      setLoadingCourses(false);
    }
  };

  // Fetch course data
  const fetchCourseData = async (courseId: string) => {
    try {
      setLoading(true);
      const courseData = await courseService.getCourse(courseId);
      setCourse(courseData);

      // Check if course type is integrated to set default component
      if (courseData.type.includes("Integrated")) {
        setComponent("theory");
      } else if (
        courseData.type === "UG-Lab-Only" ||
        courseData.type === "PG-Lab-Only"
      ) {
        // For lab-only courses, automatically set component to lab
        setComponent("lab");
      } else {
        // For other courses, keep component empty
        setComponent("");
      }

      // Fetch attendance data
      await fetchAttendanceData(courseId);
      await fetchAttendanceSummary(courseId);
    } catch (error: any) {
      setError(error.message || "Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance data for current course
  const fetchAttendanceData = async (courseId: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (component) params.component = component;

      const attendanceData = await attendanceService.getCourseAttendance(
        courseId,
        params
      );
      setAttendanceData(attendanceData);
    } catch (error: any) {
      setError(error.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance summary
  const fetchAttendanceSummary = async (courseId: string) => {
    try {
      setLoading(true);
      const summary = await attendanceService.getAttendanceSummary(
        courseId,
        component || undefined
      );
      setAttendanceSummary(summary);
    } catch (error: any) {
      console.error("Error fetching attendance summary:", error);
      // Don't set error state here to avoid blocking the page if only summary fails
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent<{}>, newValue: number) => {
    setTabIndex(newValue);
  };

  // Handle component change (theory/lab)
  const handleComponentChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    const newComponent = event.target.value as "theory" | "lab" | "";
    setComponent(newComponent);

    // Refresh data with new component
    if (course) {
      fetchAttendanceData(course._id);
      fetchAttendanceSummary(course._id);
    }
  };

  // Handle date change
  const handleDateChange = (date: Date | null) => {
    setAttendanceDate(date);
  };

  // Handle selecting a course from the grid
  const handleCourseSelect = (courseId: string) => {
    navigate(`/attendance?courseId=${courseId}`);
  };

  // Take attendance
  const handleSaveAttendance = async (attendanceData: any) => {
    if (!course || !attendanceDate) {
      setError("Course and date are required");
      return;
    }

    // Check if component is required for integrated courses
    if (course.type.includes("Integrated") && !component) {
      setError(
        "Please select a component (Theory/Lab) for this integrated course"
      );
      return;
    }

    try {
      setLoading(true);

      // Extract the student records and time data
      const { students, startTime, endTime } = attendanceData;

      // Format data for API
      const formattedData = students.map((record: any) => ({
        studentId: record.studentId,
        status: record.status || "absent",
        remarks: record.remarks,
      }));

      // Get academic year from localStorage or use default
      const academicYear =
        localStorage.getItem(`courseAcademicYear_${course._id}`) || "2023-24";

      // Save attendance with time slot information
      await attendanceService.takeAttendance(
        course._id,
        attendanceDate,
        formattedData,
        component || undefined,
        academicYear,
        undefined, // No global remarks
        startTime,
        endTime
      );

      setSuccess("Attendance saved successfully");

      // Refresh attendance data
      await fetchAttendanceData(course._id);
      await fetchAttendanceSummary(course._id);
    } catch (error: any) {
      setError(error.message || "Failed to save attendance");
    } finally {
      setLoading(false);
    }
  };

  // Delete attendance for a date and time slot
  const handleDeleteAttendance = async (sessionData: any) => {
    if (!course) return;

    const { date, timeSlot } = sessionData;
    let startTime = undefined;
    let endTime = undefined;

    // Parse time slot if provided
    if (timeSlot && timeSlot !== "unknown") {
      const [start, end] = timeSlot.split("-");
      startTime = start.trim();
      endTime = end.trim();
    }

    const confirmMessage = timeSlot
      ? `Are you sure you want to delete attendance for ${new Date(
          date
        ).toLocaleDateString()} (${timeSlot})?`
      : `Are you sure you want to delete all attendance records for ${new Date(
          date
        ).toLocaleDateString()}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      await attendanceService.deleteAttendance(
        course._id,
        new Date(date),
        component || undefined,
        startTime,
        endTime
      );
      setSuccess("Attendance deleted successfully");

      // Refresh attendance data
      await fetchAttendanceData(course._id);
      await fetchAttendanceSummary(course._id);
    } catch (error: any) {
      setError(error.message || "Failed to delete attendance");
    } finally {
      setLoading(false);
    }
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };

  // Render course selection screen if no course is selected
  if (!course) {
    return (
      <Container maxWidth="lg">
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h4" gutterBottom>
            Attendance Management
          </Typography>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 4 }}>
            Please select a course to manage attendance
          </Typography>

          {loadingCourses ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : assignedCourses.length === 0 ? (
            <Alert severity="info">
              You don't have any assigned courses. Please contact your
              administrator if this is incorrect.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {assignedCourses.map((course) => (
                <Grid item xs={12} sm={6} md={4} key={course._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {course.code}
                      </Typography>
                      <Typography variant="body1">{course.name}</Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Type: {course.type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Slot:{" "}
                          {Array.isArray(course.slot)
                            ? course.slot.join(", ")
                            : course.slot}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Venue: {course.venue}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        onClick={() => handleCourseSelect(course._id)}
                      >
                        Manage Attendance
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        {/* Snackbar for messages */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity="error"
            sx={{ width: "100%" }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Container>
    );
  }

  // If loading course data
  if (loading && !attendanceData.length) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Main attendance management UI once course is selected
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h4" gutterBottom>
          Attendance Management
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          {course.code} - {course.name}
        </Typography>

        {/* Show component selection for integrated courses */}
        {course.type.includes("Integrated") && (
          <Box mt={2} mb={3}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="component-label">Component</InputLabel>
              <Select
                labelId="component-label"
                value={component}
                onChange={handleComponentChange}
                label="Component"
              >
                <MenuItem value="theory">Theory</MenuItem>
                <MenuItem value="lab">Lab</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              This is an integrated course. Please select whether you want to
              manage theory or lab attendance. Time slots will adjust
              accordingly.
            </Typography>
          </Box>
        )}
        {(course.type === "UG-Lab-Only" || course.type === "PG-Lab-Only") && (
          <Box mt={2} mb={3}>
            <Chip
              label="Lab Course"
              color="primary"
              variant="outlined"
              icon={<AccessTimeIcon />}
            />
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              This is a lab-only course. Lab time slots are available for
              attendance.
            </Typography>
          </Box>
        )}

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            aria-label="attendance tabs"
          >
            <Tab label="Take Attendance" />
            <Tab label="Attendance History" />
            <Tab label="Attendance Statistics" />
          </Tabs>
        </Box>

        {/* Take Attendance Tab */}
        <div role="tabpanel" hidden={tabIndex !== 0}>
          {tabIndex === 0 && (
            <Box>
              <Box display="flex" alignItems="center" mb={3} gap={2}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Attendance Date"
                    value={attendanceDate}
                    onChange={handleDateChange}
                  />
                </LocalizationProvider>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  onClick={() => {
                    if (course) {
                      fetchAttendanceData(course._id);
                      fetchAttendanceSummary(course._id);
                    }
                  }}
                >
                  Refresh Data
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/attendance")}
                >
                  Change Course
                </Button>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <AttendanceTable
                courseId={course._id}
                date={attendanceDate}
                component={component || undefined}
                loading={loading}
                onSave={handleSaveAttendance}
                courseType={course.type}
              />
            </Box>
          )}
        </div>

        {/* Attendance History Tab */}
        <div role="tabpanel" hidden={tabIndex !== 1}>
          {tabIndex === 1 && (
            <AttendanceHistory
              courseId={course._id}
              component={component || undefined}
              attendanceData={attendanceData}
              attendanceSummary={attendanceSummary}
              onDelete={handleDeleteAttendance}
              onRefresh={() => {
                fetchAttendanceData(course._id);
                fetchAttendanceSummary(course._id);
              }}
            />
          )}
        </div>

        {/* Attendance Statistics Tab */}
        <div role="tabpanel" hidden={tabIndex !== 2}>
          {tabIndex === 2 && (
            <AttendanceStats
              courseId={course._id}
              component={component || undefined}
              attendanceData={attendanceData}
              attendanceSummary={attendanceSummary}
              onRefresh={() => {
                fetchAttendanceData(course._id);
                fetchAttendanceSummary(course._id);
              }}
            />
          )}
        </div>
      </Paper>

      {/* Snackbar for messages */}
      <Snackbar
        open={!!error || !!success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={error ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {error || success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AttendancePage;
