/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Tooltip,
  Box,
  Chip,
  Popover,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import StudentForm from "../components/students/StudentForm";
import { Student, Course } from "../types";
import { studentService } from "../services/studentService";
import { courseService } from "../services/courseService";

const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [popoverStudent, setPopoverStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudentsAndCourses();
  }, []);

  const fetchStudentsAndCourses = async () => {
    try {
      setLoading(true);
      const [studentsData, coursesData] = await Promise.all([
        studentService.getAllStudents(),
        courseService.getAllCourses(),
      ]);

      console.log("Fetched students:", studentsData);
      console.log("Fetched courses:", coursesData);

      setStudents(studentsData);
      setCourses(coursesData);
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = () => {
    setSelectedStudent(undefined);
    setOpenForm(true);
  };

  const handleEditStudent = (student: Student) => {
    console.log("Editing student:", student);
    setSelectedStudent({ ...student }); // Create a new object to avoid reference issues
    setOpenForm(true);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        await studentService.deleteStudent(studentId);
        setStudents(students.filter((student) => student._id !== studentId));
        setSuccessMessage("Student deleted successfully");
      } catch (err) {
        setError("Failed to delete student");
        console.error("Error deleting student:", err);
      }
    }
  };

  const handleSubmit = async (studentData: Partial<Student>) => {
    try {
      console.log("Submitting student data:", studentData);

      if (selectedStudent) {
        // Update existing student
        const updatedStudent = await studentService.updateStudent(
          selectedStudent._id,
          studentData
        );
        setStudents(
          students.map((student) =>
            student._id === selectedStudent._id ? updatedStudent : student
          )
        );
        setSuccessMessage("Student updated successfully");
      } else {
        // Add new student
        const newStudent = await studentService.createStudent(studentData);
        setStudents([...students, newStudent]);
        setSuccessMessage("Student created successfully");
      }
      setOpenForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save student");
      console.error("Error saving student:", err);
    }
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const getCoursesForStudent = (courseIds: string[]) => {
    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return [];
    }

    const courseNames = [];

    for (const courseId of courseIds) {
      const course = courses.find((c) => c._id === courseId);
      if (course) {
        courseNames.push(`${course.code} - ${course.name}`);
      }
    }

    return courseNames;
  };

  const handlePopoverOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
    student: Student
  ) => {
    console.log("Opening popover for student:", student);
    console.log("Student courseIds:", student.courseIds);
    setAnchorEl(event.currentTarget);
    setPopoverStudent(student);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setPopoverStudent(null);
  };

  const open = Boolean(anchorEl);

  if (loading) {
    return <Typography>Loading students...</Typography>;
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
          Students Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddStudent}
        >
          Add Student
        </Button>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Registration Number</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Courses</TableCell>
              <TableCell>Semester</TableCell>
              <TableCell>Academic Year</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student._id}>
                <TableCell>{student.registrationNumber}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.program || "N/A"}</TableCell>
                <TableCell>
                  {student.courseIds && student.courseIds.length > 0 ? (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Chip
                        label={`${student.courseIds.length} course(s)`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Tooltip title="View Courses">
                        <IconButton
                          size="small"
                          onClick={(e) => handlePopoverOpen(e, student)}
                          aria-label="view courses"
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    "No courses"
                  )}
                </TableCell>
                <TableCell>{student.semester}</TableCell>
                <TableCell>{student.academicYear}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEditStudent(student)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDeleteStudent(student._id)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No students available. Click "Add Student" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <StudentForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSubmit={handleSubmit}
        student={selectedStudent}
        courses={courses}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        {popoverStudent && (
          <List sx={{ width: 300, maxWidth: "100%", p: 0 }}>
            <ListItem sx={{ bgcolor: "primary.main", color: "white" }}>
              <ListItemText primary="Enrolled Courses" />
            </ListItem>

            {popoverStudent.courseIds && popoverStudent.courseIds.length > 0 ? (
              <>
                {getCoursesForStudent(popoverStudent.courseIds).map(
                  (courseName, index) => (
                    <ListItem
                      key={index}
                      dense
                      divider={
                        index <
                        getCoursesForStudent(popoverStudent.courseIds).length -
                          1
                      }
                    >
                      <ListItemText primary={courseName} />
                    </ListItem>
                  )
                )}

                {getCoursesForStudent(popoverStudent.courseIds).length ===
                  0 && (
                  <ListItem>
                    <ListItemText secondary="No course details found" />
                  </ListItem>
                )}
              </>
            ) : (
              <ListItem>
                <ListItemText secondary="No courses found" />
              </ListItem>
            )}
          </List>
        )}
      </Popover>

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

export default StudentsPage;
