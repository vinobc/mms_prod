import React, { useState, useEffect } from "react";
import {
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import CourseForm from "../components/courses/CourseForm";
import CourseStudentsTable from "../components/courses/CourseStudentsTable";
import { Course } from "../types";
import { courseService } from "../services/courseService";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`course-tabpanel-${index}`}
      aria-labelledby={`course-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CoursesPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.isAdmin || false;

  const [courses, setCourses] = useState<Course[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // For course details dialog and student management
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Fetch courses on component mount
  // useEffect(() => {
  //   fetchCourses();
  // }, []);
  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
  }, []);

  // Handle the courseId query parameter
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const courseId = query.get("courseId");

    if (courseId && courses.length > 0) {
      const selectedCourse = courses.find((course) => course._id === courseId);
      if (selectedCourse) {
        handleViewCourse(selectedCourse);
      }
    }
  }, [location.search, courses]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const fetchedCourses = await courseService.getAllCourses();
      setCourses(fetchedCourses);
    } catch (err) {
      setError("Failed to fetch courses");
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = () => {
    setSelectedCourse(undefined);
    setOpenForm(true);
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setOpenForm(true);
  };

  const handleViewCourse = (course: Course) => {
    setViewingCourse(course);
    setTabValue(0); // Reset to first tab
    setDetailsOpen(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await courseService.deleteCourse(courseId);
        setCourses(courses.filter((course) => course._id !== courseId));
        setSuccessMessage("Course deleted successfully");
      } catch (err) {
        setError("Failed to delete course");
        console.error("Error deleting course:", err);
      }
    }
  };

  const handleSubmit = async (courseData: Partial<Course>) => {
    try {
      if (selectedCourse) {
        // Update existing course
        const updatedCourse = await courseService.updateCourse(
          selectedCourse._id,
          courseData
        );
        setCourses(
          courses.map((course) =>
            course._id === selectedCourse._id ? updatedCourse : course
          )
        );
        setSuccessMessage("Course updated successfully");
      } else {
        // Add new course
        const newCourse = await courseService.createCourse(courseData);
        setCourses([...courses, newCourse]);
        setSuccessMessage("Course created successfully");
      }
      setOpenForm(false);
    } catch (err) {
      setError("Failed to save course");
      console.error("Error saving course:", err);
    }
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStudentsSaveComplete = () => {
    // Refresh courses to get latest enrollment counts
    fetchCourses();
  };

  if (loading && courses.length === 0) {
    return <Typography>Loading courses...</Typography>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <Typography variant="h4" gutterBottom>
          Courses Management
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddCourse}
          >
            Add Course
          </Button>
        )}
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Slot</TableCell>
              <TableCell>Venue</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course._id}>
                <TableCell>{course.code}</TableCell>
                <TableCell>{course.name}</TableCell>
                <TableCell>{course.type}</TableCell>
                <TableCell>{course.slot}</TableCell>
                <TableCell>{course.venue}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleViewCourse(course)}
                    size="small"
                    color="primary"
                    title="View course details and manage students"
                  >
                    <PeopleIcon />
                  </IconButton>
                  {isAdmin && (
                    <>
                      <IconButton
                        onClick={() => handleEditCourse(course)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteCourse(course._id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {courses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No courses available.
                  {isAdmin && ' Click "Add Course" to create one.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Course Form Dialog - Only for admins */}
      {isAdmin && (
        <CourseForm
          open={openForm}
          onClose={() => setOpenForm(false)}
          onSubmit={handleSubmit}
          course={selectedCourse}
        />
      )}

      {/* Course Details Dialog with Students Management */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        {viewingCourse && (
          <>
            <DialogTitle>
              {viewingCourse.code} - {viewingCourse.name}
            </DialogTitle>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="course tabs"
              >
                <Tab label="Course Details" />
                <Tab label="Manage Students" />
              </Tabs>
            </Box>
            <DialogContent>
              <TabPanel value={tabValue} index={0}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1">
                    Course Type: {viewingCourse.type}
                  </Typography>
                  <Typography variant="subtitle1">
                    Slot: {viewingCourse.slot}
                  </Typography>
                  <Typography variant="subtitle1">
                    Venue: {viewingCourse.venue || "Not specified"}
                  </Typography>

                  <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                    Evaluation Scheme
                  </Typography>
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Component</TableCell>
                          <TableCell>Weight</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(viewingCourse.evaluationScheme).map(
                          ([component, weight]) => (
                            <TableRow key={component}>
                              <TableCell>{component}</TableCell>
                              <TableCell>
                                {(weight * 100).toFixed(0)}%
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <CourseStudentsTable
                  course={viewingCourse}
                  onSaveComplete={handleStudentsSaveComplete}
                />
              </TabPanel>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={!!error || !!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={error ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {error || successMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default CoursesPage;
