/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  OutlinedInput,
  SelectChangeEvent,
} from "@mui/material";
import { School as SchoolIcon } from "@mui/icons-material";
import { facultyService, FacultyData } from "../services/facultyService";
import { courseService } from "../services/courseService";
import { Course } from "../types";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const FacultyManagementPage: React.FC = () => {
  const [faculties, setFaculties] = useState<FacultyData[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyData | null>(
    null
  );
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchFacultiesAndCourses();
  }, []);

  const fetchFacultiesAndCourses = async () => {
    try {
      setLoading(true);
      const [facultiesData, coursesData] = await Promise.all([
        facultyService.getAllFaculties(),
        courseService.getAllCourses(),
      ]);
      setFaculties(facultiesData);
      setCourses(coursesData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (faculty: FacultyData) => {
    setSelectedFaculty(faculty);
    setSelectedCourseIds(faculty.courseIds || []);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedFaculty(null);
    setSelectedCourseIds([]);
  };

  const handleCourseSelection = (event: SelectChangeEvent<string[]>) => {
    const { value } = event.target;
    setSelectedCourseIds(typeof value === "string" ? value.split(",") : value);
  };

  const handleAssignCourses = async () => {
    if (!selectedFaculty) return;

    try {
      setSaving(true);
      await facultyService.assignCourses(
        selectedFaculty._id,
        selectedCourseIds
      );

      // Update the faculty in the local state
      setFaculties(
        faculties.map((faculty) =>
          faculty._id === selectedFaculty._id
            ? { ...faculty, courseIds: selectedCourseIds }
            : faculty
        )
      );

      setSuccess("Courses assigned successfully");
      handleCloseDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to assign courses");
    } finally {
      setSaving(false);
    }
  };

  const getCourseNames = (courseIds: string[]) => {
    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return "No courses assigned";
    }

    const assignedCourses = courses.filter((course) =>
      courseIds.includes(course._id)
    );
    if (assignedCourses.length === 0) return "No courses assigned";

    if (assignedCourses.length <= 2) {
      return assignedCourses.map((course) => `${course.code}`).join(", ");
    }

    return `${assignedCourses.length} courses assigned`;
  };

  if (loading && faculties.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "70vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Faculty Management
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Assigned Courses</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {faculties.map((faculty) => (
              <TableRow key={faculty._id}>
                <TableCell>{faculty.name}</TableCell>
                <TableCell>{faculty.email}</TableCell>
                <TableCell>{faculty.department}</TableCell>
                <TableCell>{getCourseNames(faculty.courseIds)}</TableCell>
                <TableCell>
                  {faculty.isAdmin ? (
                    <Chip color="primary" label="Admin" size="small" />
                  ) : (
                    <Chip label="Faculty" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleOpenDialog(faculty)}
                    size="small"
                    color="primary"
                    title="Assign Courses"
                  >
                    <SchoolIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {faculties.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No faculty members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Course Assignment Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedFaculty && (
          <>
            <DialogTitle>Assign Courses to {selectedFaculty.name}</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="course-assignment-label">
                    Assigned Courses
                  </InputLabel>
                  <Select
                    labelId="course-assignment-label"
                    multiple
                    value={selectedCourseIds}
                    onChange={handleCourseSelection}
                    input={<OutlinedInput label="Assigned Courses" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((courseId) => {
                          const course = courses.find(
                            (c) => c._id === courseId
                          );
                          return course ? (
                            <Chip
                              key={courseId}
                              label={`${course.code} - ${course.name}`}
                            />
                          ) : null;
                        })}
                      </Box>
                    )}
                    MenuProps={MenuProps}
                  >
                    {courses.map((course) => (
                      <MenuItem key={course._id} value={course._id}>
                        {course.code} - {course.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={handleAssignCourses}
                color="primary"
                variant="contained"
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : "Save"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

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

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert
          onClose={() => setSuccess(null)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FacultyManagementPage;
