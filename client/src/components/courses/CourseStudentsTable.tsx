import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  Chip,
  InputLabel,
  Card,
  CardContent,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  DeleteForever as DeleteForeverIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { Course, ProgramType, Student } from "../../types";
import { studentService } from "../../services/studentService";
import { useAuth } from "../../context/AuthContext";
import StudentAutocomplete from "../students/StudentAutocomplete";

// Academic year options
const academicYearOptions = [
  "2023-24",
  "2024-25",
  "2025-26",
  "2026-27",
  "2027-28",
];

// Program options
const programOptions = [
  "BBA",
  "B.Com.",
  "B.Tech (CSE)",
  "B.Tech (AI&ML)",
  "B.Tech CSE (AI & ML)",
  "B.Tech CSE (IoT)",
  "B.Tech CSE (Robotics)",
  "B.Tech.(Biotechnology)",
  "B.Pharm",
  "BA Applied Psychology",
  "B.Sc. Clinical Psychology",
  "BA LLB",
  "BA",
  "B.Sc.",
  "B.A. LLB",
  "B.Des.",
  "BCA",
  "M.Sc. Data Science",
  "M.Sc. Cyber Security",
  "M.Tech.",
  "MCA",
  "LLM",
  "MBA",
  "M.Sc. Clinical Psychology",
  "M.Sc(Biotechnology)",
];

// Student row interface
interface StudentRow {
  id: string; // Temporary ID for new rows or actual _id for existing
  _id?: string; // MongoDB ID for existing students
  registrationNumber: string;
  name: string;
  program: string;
  school?: string; // Added school field
  semester: number;
  isNew: boolean; // Flag for new vs existing students
  isSaving?: boolean; // Loading state indicator
  isEditing?: boolean; // UI editing state
  isDeleting?: boolean; // Deletion state
}

interface CourseStudentsTableProps {
  course: Course;
  onSaveComplete?: () => void;
}

const CourseStudentsTable: React.FC<CourseStudentsTableProps> = ({
  course,
  onSaveComplete,
}) => {
  // State variables
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Academic year state - modified to use localStorage
  const [academicYear, setAcademicYear] = useState<string>(() => {
    // Try to get course-specific academic year from localStorage
    const savedYear = localStorage.getItem(`courseAcademicYear_${course._id}`);
    if (savedYear && academicYearOptions.includes(savedYear)) {
      return savedYear;
    }

    // Fallback to default academic year
    return localStorage.getItem("defaultAcademicYear") || "2023-24";
  });

  // Student selection dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Get current user
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;

  // Load students when component mounts or course changes
  useEffect(() => {
    if (!course || !course._id) return;
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course]);

  // Function to fetch students from API
  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const courseStudents = await studentService.getStudentsByCourse(
        course._id
      );

      // Transform API data to component format
      const studentRows = courseStudents.map((student: any) => ({
        id: student._id,
        _id: student._id,
        registrationNumber: student.registrationNumber,
        name: student.name,
        program: student.program || programOptions[0],
        school: student.school || "", // Include school field
        semester: student.semester,
        isNew: false,
        isSaving: false,
        isEditing: false,
      }));

      setStudents(studentRows);

      // If we have students, get the academic year from the first student
      // This ensures we're using the right year for the course
      if (studentRows.length > 0 && courseStudents[0].academicYear) {
        const studentsYear = courseStudents[0].academicYear;
        setAcademicYear(studentsYear);

        // Save this as the course-specific academic year
        localStorage.setItem(`courseAcademicYear_${course._id}`, studentsYear);
      }
    } catch (error) {
      console.error("Failed to load students:", error);
      setError("Could not load students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcademicYearChange = (
    e: React.ChangeEvent<{ value: unknown }>
  ) => {
    if (!isAdmin) return; // Only proceed if user is admin

    const newYear = e.target.value as string;
    setAcademicYear(newYear);

    // Store in localStorage for this specific course
    localStorage.setItem(`courseAcademicYear_${course._id}`, newYear);

    // Also update the default academic year
    localStorage.setItem("defaultAcademicYear", newYear);

    setSuccess(`Academic year updated to ${newYear}`);
  };

  // Open the add student dialog
  const handleAddStudentClick = () => {
    setSelectedStudent(null);
    setShowAddDialog(true);
  };

  // Handle selecting a student from the autocomplete
  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
  };

  // Add selected student to course
  const handleAddStudentToCourse = async () => {
    if (!selectedStudent) {
      setError("Please select a student first");
      return;
    }

    try {
      setLoading(true);

      // Check if student is already in the course
      const existingStudent = students.find(
        (s) => s.registrationNumber === selectedStudent.registrationNumber
      );

      if (existingStudent) {
        setError(`${selectedStudent.name} is already enrolled in this course`);
        return;
      }

      // Add the student to the course
      await studentService.addStudentToCourse(selectedStudent._id, course._id);

      // Update the student's academic year if needed
      await studentService.updateStudent(selectedStudent._id, {
        academicYear,
      });

      setSuccess(`${selectedStudent.name} added to the course successfully`);
      setShowAddDialog(false);

      // Reload the students list
      await loadStudents();

      // Notify parent
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      setError(error.message || "Failed to add student to course");
    } finally {
      setLoading(false);
    }
  };

  // Add an empty row for a new student
  const handleAddRow = () => {
    const newId = `temp-${Date.now()}`;
    const newStudent: StudentRow = {
      id: newId,
      registrationNumber: "",
      name: "",
      program: programOptions[0],
      semester: 1,
      isNew: true,
      isEditing: true,
    };

    setStudents([...students, newStudent]);
  };

  // Toggle edit mode for a student
  const toggleEditMode = (studentId: string) => {
    setStudents(
      students.map((student) =>
        student.id === studentId
          ? { ...student, isEditing: !student.isEditing }
          : student
      )
    );
  };

  // Save a single student
  const handleSaveStudent = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    // Validate required fields
    if (!student.registrationNumber.trim() || !student.name.trim()) {
      setError("Enrollment No. and Name are required");
      return;
    }

    try {
      // Update UI to show saving state
      setStudents(
        students.map((s) => (s.id === studentId ? { ...s, isSaving: true } : s))
      );

      const courseId = course._id;

      if (student.isNew) {
        try {
          // Check if a student with this registration number already exists
          const existingStudents = await studentService.getAllStudents();
          const existingStudent = existingStudents.find(
            (s: { registrationNumber: string }) =>
              s.registrationNumber === student.registrationNumber
          );

          if (existingStudent) {
            console.log("Student exists, adding to course:", existingStudent);
            // If the student exists, add this course to their courseIds
            await studentService.addStudentToCourse(
              existingStudent._id,
              courseId
            );

            // Update the student's academic year
            await studentService.updateStudent(existingStudent._id, {
              academicYear,
            });

            setSuccess("Existing student added to this course successfully");
          } else {
            console.log("Creating new student");
            // For new students
            await studentService.createStudent({
              registrationNumber: student.registrationNumber,
              name: student.name,
              program: student.program as ProgramType,
              school: student.school, // Include school
              semester: student.semester,
              academicYear: academicYear, // Use the current academic year
              courseIds: [courseId],
            });
            setSuccess("New student added successfully");
          }
        } catch (error) {
          console.error("Error checking existing student:", error);
          throw error;
        }
      } else {
        // For existing students
        const updateData: any = {
          semester: student.semester,
          academicYear: academicYear, // Use the current academic year
          school: student.school, // Include school
        };

        // If admin, allow updating all fields
        if (isAdmin) {
          updateData.name = student.name;
          updateData.program = student.program;
          updateData.registrationNumber = student.registrationNumber;
        }

        await studentService.updateStudent(student._id!, updateData);

        setSuccess("Student updated successfully");
      }

      // Toggle off edit mode and reload students
      setStudents(
        students.map((s) =>
          s.id === studentId ? { ...s, isEditing: false, isSaving: false } : s
        )
      );

      // Reload to get fresh data
      await loadStudents();

      // Notify parent if needed
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      console.error("Failed to save student:", error);
      let errorMsg = "Failed to save student";

      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }

      setError(errorMsg);

      // Reset saving state
      setStudents(
        students.map((s) =>
          s.id === studentId ? { ...s, isSaving: false } : s
        )
      );
    }
  };

  // Delete/Remove handling
  const handleDeleteRow = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    if (student.isNew) {
      // Simply remove from UI for new students
      setStudents(students.filter((s) => s.id !== studentId));
      return;
    }

    // For existing students
    if (isAdmin) {
      // Admins can permanently delete
      setConfirmDialog({
        open: true,
        title: "Permanently Delete Student",
        message: `Are you sure you want to permanently delete ${student.name} from the system? This cannot be undone.`,
        onConfirm: () => confirmPermanentDelete(student._id!),
      });
    } else {
      // Faculty can only remove from course
      setConfirmDialog({
        open: true,
        title: "Remove Student from Course",
        message: `Are you sure you want to remove ${student.name} from this course?`,
        onConfirm: () => confirmRemoveFromCourse(student._id!),
      });
    }
  };

  // Confirm permanent deletion (admin only)
  const confirmPermanentDelete = async (studentId: string) => {
    try {
      // Mark as processing in UI
      setStudents(
        students.map((s) =>
          s._id === studentId ? { ...s, isDeleting: true } : s
        )
      );

      // Permanently delete the student
      await studentService.deleteStudent(studentId);

      // Remove from UI
      setStudents(students.filter((s) => s._id !== studentId));
      setSuccess("Student permanently deleted");

      // Close dialog
      setConfirmDialog({ ...confirmDialog, open: false });

      // Notify parent
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      console.error("Failed to delete student:", error);
      setError(error.response?.data?.message || "Failed to delete student");

      // Reset deleting state
      setStudents(
        students.map((s) =>
          s._id === studentId ? { ...s, isDeleting: false } : s
        )
      );

      // Close dialog
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Confirm removing from course (faculty or admin)
  const confirmRemoveFromCourse = async (studentId: string) => {
    try {
      // Mark as processing in UI
      setStudents(
        students.map((s) =>
          s._id === studentId ? { ...s, isDeleting: true } : s
        )
      );

      // Remove student from this course
      await studentService.removeStudentFromCourse(studentId, course._id);

      // Remove from UI
      setStudents(students.filter((s) => s._id !== studentId));
      setSuccess("Student removed from course");

      // Close dialog
      setConfirmDialog({ ...confirmDialog, open: false });

      // Notify parent
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      console.error("Failed to remove student:", error);
      setError(error.response?.data?.message || "Failed to remove student");

      // Reset deleting state
      setStudents(
        students.map((s) =>
          s._id === studentId ? { ...s, isDeleting: false } : s
        )
      );

      // Close dialog
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Clear/remove all students from course
  const handleClearTable = () => {
    setConfirmDialog({
      open: true,
      title: isAdmin
        ? "Clear Student Table"
        : "Remove All Students from Course",
      message: isAdmin
        ? "Are you sure you want to remove all students from this course? You can also choose to permanently delete them."
        : "Are you sure you want to remove all students from this course?",
      onConfirm: confirmClearTable,
    });
  };

  // Confirm clearing table
  const confirmClearTable = async () => {
    try {
      setLoading(true);

      // Process each existing student
      for (const student of students.filter((s) => !s.isNew)) {
        try {
          await studentService.removeStudentFromCourse(
            student._id!,
            course._id
          );
        } catch (error) {
          console.error(`Error removing student ${student._id}:`, error);
        }
      }

      // Clear UI
      setStudents([]);
      setSuccess("All students removed from course");

      // Notify parent
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      console.error("Failed to clear table:", error);
      setError(
        error.response?.data?.message || "Failed to remove all students"
      );
    } finally {
      setLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Permanently delete all students (admin only)
  const handlePermanentDeleteAll = () => {
    if (!isAdmin) return;

    setConfirmDialog({
      open: true,
      title: "Permanently Delete All Students",
      message:
        "Are you sure you want to PERMANENTLY DELETE all these students from the system? This action CANNOT be undone!",
      onConfirm: confirmPermanentDeleteAll,
    });
  };

  // Confirm permanent deletion of all students
  const confirmPermanentDeleteAll = async () => {
    try {
      setLoading(true);

      let successCount = 0;

      // Process each existing student
      for (const student of students.filter((s) => !s.isNew)) {
        try {
          await studentService.deleteStudent(student._id!);
          successCount++;
        } catch (error) {
          console.error(`Error deleting student ${student._id}:`, error);
        }
      }

      // Clear UI
      setStudents([]);
      setSuccess(`${successCount} students permanently deleted`);

      // Notify parent
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      console.error("Failed to delete students:", error);
      setError(error.response?.data?.message || "Failed to delete students");
    } finally {
      setLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Update field value in student row
  const handleFieldChange = (
    studentId: string,
    field: keyof StudentRow,
    value: any
  ) => {
    setStudents(
      students.map((s) => (s.id === studentId ? { ...s, [field]: value } : s))
    );
  };

  // Save all students
  const handleSaveAll = async () => {
    // Validate all students first
    const invalidStudents = students.filter(
      (s) => s.isNew && (!s.registrationNumber.trim() || !s.name.trim())
    );

    if (invalidStudents.length > 0) {
      setError("All students must have Enrollment No. and Name");
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Save All Students",
      message: `Are you sure you want to save all ${students.length} students with academic year ${academicYear}?`,
      onConfirm: confirmSaveAll,
    });
  };

  // Confirm saving all students
  const confirmSaveAll = async () => {
    try {
      setLoading(true);

      let successCount = 0;
      const existingStudents = await studentService.getAllStudents();

      // Process each student
      for (const student of students) {
        try {
          if (student.isNew) {
            // Check if student already exists
            const existingStudent = existingStudents.find(
              (s: { registrationNumber: string }) =>
                s.registrationNumber === student.registrationNumber
            );

            if (existingStudent) {
              // If student exists, add course to their record
              await studentService.addStudentToCourse(
                existingStudent._id,
                course._id
              );

              // Update their academic year
              await studentService.updateStudent(existingStudent._id, {
                academicYear: academicYear,
              });
            } else {
              // Create new student
              await studentService.createStudent({
                registrationNumber: student.registrationNumber,
                name: student.name,
                program: student.program as ProgramType,
                school: student.school, // Include school
                semester: student.semester,
                academicYear: academicYear, // Use current academic year
                courseIds: [course._id],
              });
            }
          } else {
            // For existing students
            const updateData: any = {
              semester: student.semester,
              academicYear: academicYear, // Use current academic year
              school: student.school, // Include school
            };

            // If admin, allow updating all fields
            if (isAdmin) {
              updateData.name = student.name;
              updateData.program = student.program;
              updateData.registrationNumber = student.registrationNumber;
            }

            await studentService.updateStudent(student._id!, updateData);
          }
          successCount++;
        } catch (error) {
          console.error(`Error processing student ${student.id}:`, error);
        }
      }

      setSuccess(`${successCount} students saved successfully`);

      // Turn off all edit modes
      setStudents(students.map((s) => ({ ...s, isEditing: false })));

      // Reload students
      await loadStudents();

      // Notify parent
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      console.error("Failed to save all students:", error);
      setError(error.response?.data?.message || "Failed to save students");
    } finally {
      setLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };

  if (loading && students.length === 0) {
    return <CircularProgress />;
  }

  return (
    <Box>
      {/* Header with role indicator and buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Students</Typography>
          {isAdmin ? (
            <Chip
              label="Admin Mode"
              color="primary"
              size="small"
              sx={{ fontWeight: "bold" }}
            />
          ) : (
            <Chip label="Faculty Mode" color="default" size="small" />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {isAdmin && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={handlePermanentDeleteAll}
              disabled={loading || students.length === 0}
              size="small"
            >
              Delete All
            </Button>
          )}
          <Button
            variant="outlined"
            color="warning"
            onClick={handleClearTable}
            disabled={loading || students.length === 0}
            size="small"
          >
            Clear Table
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleAddStudentClick}
            disabled={loading}
            color="secondary"
          >
            Add Existing Student
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRow}
            disabled={loading}
          >
            Add New Student
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAll}
            disabled={loading || students.length === 0}
            startIcon={loading ? <CircularProgress size={24} /> : <SaveIcon />}
          >
            Save All
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ width: 200 }}>
          <InputLabel id="academic-year-label">Academic Year</InputLabel>
          <Select
            labelId="academic-year-label"
            value={academicYear}
            onChange={(e: any) => handleAcademicYearChange(e)}
            label="Academic Year"
            disabled={!isAdmin} // Only admin can change the academic year
          >
            {academicYearOptions.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ ml: 2, color: "text.secondary" }}>
          {isAdmin ? "All students will be assigned to this academic year" : ""}
        </Typography>
      </Box>

      {/* Students table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell width="5%">SNo.</TableCell>
              <TableCell width="15%">Program</TableCell>
              <TableCell width="15%">Enrollment No.</TableCell>
              <TableCell width="20%">Name</TableCell>
              <TableCell width="15%">School</TableCell>{" "}
              {/* Added School column */}
              <TableCell width="10%">Semester</TableCell>
              <TableCell width="15%">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, index) => (
              <TableRow
                key={student.id}
                sx={{
                  backgroundColor: student.isEditing ? "#f0f7ff" : "inherit",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
              >
                <TableCell>{index + 1}</TableCell>
                {/* Program field */}
                <TableCell>
                  {student.isNew || (isAdmin && student.isEditing) ? (
                    <FormControl fullWidth size="small">
                      <Select
                        value={student.program}
                        onChange={(e) =>
                          handleFieldChange(
                            student.id,
                            "program",
                            e.target.value
                          )
                        }
                      >
                        {programOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    student.program
                  )}
                </TableCell>

                {/* Enrollment Number field */}
                <TableCell>
                  {student.isNew || (isAdmin && student.isEditing) ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={student.registrationNumber}
                      onChange={(e) =>
                        handleFieldChange(
                          student.id,
                          "registrationNumber",
                          e.target.value
                        )
                      }
                      placeholder="Enter enrollment no."
                    />
                  ) : (
                    student.registrationNumber
                  )}
                </TableCell>

                {/* Name field */}
                <TableCell>
                  {student.isNew || (isAdmin && student.isEditing) ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={student.name}
                      onChange={(e) =>
                        handleFieldChange(student.id, "name", e.target.value)
                      }
                      placeholder="Enter name"
                    />
                  ) : (
                    student.name
                  )}
                </TableCell>

                {/* School field - NEW */}
                <TableCell>
                  {student.isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={student.school || ""}
                      onChange={(e) =>
                        handleFieldChange(student.id, "school", e.target.value)
                      }
                      placeholder="Enter school"
                    />
                  ) : (
                    student.school || "N/A"
                  )}
                </TableCell>

                {/* Semester field - always editable when in edit mode */}
                <TableCell>
                  {student.isEditing ? (
                    <TextField
                      type="number"
                      inputProps={{ min: 1, max: 8 }}
                      size="small"
                      value={student.semester}
                      onChange={(e) =>
                        handleFieldChange(
                          student.id,
                          "semester",
                          Number(e.target.value)
                        )
                      }
                    />
                  ) : (
                    student.semester
                  )}
                </TableCell>

                {/* Action buttons */}
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {student.isEditing ? (
                      <Tooltip title="Save changes">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleSaveStudent(student.id)}
                          disabled={student.isSaving}
                        >
                          {student.isSaving ? (
                            <CircularProgress size={24} />
                          ) : (
                            <SaveIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Edit student">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => toggleEditMode(student.id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip
                      title={
                        isAdmin
                          ? "Permanently delete student"
                          : "Remove from course"
                      }
                    >
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeleteRow(student.id)}
                        disabled={student.isSaving || student.isDeleting}
                      >
                        {isAdmin ? <DeleteForeverIcon /> : <DeleteIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  No students available. Click "Add Student" to add students.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Existing Student Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Existing Student</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <StudentAutocomplete
              onStudentSelect={handleStudentSelect}
              placeholder="Search by enrollment number or name"
              label="Find Student"
              disabled={loading}
            />

            {selectedStudent && (
              <Card sx={{ mt: 3, bgcolor: "#f5f5f5" }}>
                <CardContent>
                  <Typography variant="h6">{selectedStudent.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enrollment: {selectedStudent.registrationNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Program: {selectedStudent.program} | Semester:{" "}
                    {selectedStudent.semester}
                  </Typography>
                  {selectedStudent.school && (
                    <Typography variant="body2" color="text.secondary">
                      School: {selectedStudent.school}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddStudentToCourse}
            variant="contained"
            color="primary"
            disabled={!selectedStudent || loading}
          >
            {loading ? <CircularProgress size={24} /> : "Add to Course"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        PaperProps={{
          sx: {
            borderTop: confirmDialog.title.includes("Permanently Delete")
              ? "4px solid #f44336"
              : "4px solid #1976d2",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: confirmDialog.title.includes("Permanently Delete")
              ? "#f44336"
              : "inherit",
          }}
        >
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => confirmDialog.onConfirm()}
            color={
              confirmDialog.title.includes("Permanently Delete")
                ? "error"
                : "primary"
            }
            variant="contained"
            autoFocus
          >
            {confirmDialog.title.includes("Permanently Delete")
              ? "Yes, Permanently Delete"
              : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error messages */}
      <Snackbar
        open={!!error || !!success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={error ? "error" : "success"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {error || success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CourseStudentsTable;
