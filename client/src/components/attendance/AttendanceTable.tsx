// client/src/components/attendance/AttendanceTable.tsx
import React, { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Box,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Save as SaveIcon,
  Person as PersonIcon,
  PersonOutline as PersonOutlineIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";
import { studentService } from "../../services/studentService";
import { CourseType } from "../../types";

interface AttendanceTableProps {
  courseId: string;
  date: Date | null;
  component?: "theory" | "lab";
  loading?: boolean;
  onSave: (attendanceRecords: any[]) => void;
  courseType: CourseType;
}

interface StudentAttendanceRecord {
  studentId: string;
  registrationNumber: string;
  name: string;
  program: string;
  status: "present" | "absent";
  attendancePercentage?: number;
  belowThreshold?: boolean;
  remarks?: string;
  isEditing?: boolean;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  courseId,
  date,
  component,
  loading = false,
  onSave,
  courseType,
}) => {
  const [students, setStudents] = useState<StudentAttendanceRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allStatus, setAllStatus] = useState<"present" | "absent" | "">("");
  const [remarks, setRemarks] = useState<string>("");

  // Fetch students when component mounts or courseId changes
  useEffect(() => {
    if (courseId) {
      fetchStudents();
    }
  }, [courseId]);

  // Fetch students for this course
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      setError(null);

      // Get students for this course
      const courseStudents = await studentService.getStudentsByCourse(courseId);

      // Map to student attendance records
      const studentRecords = courseStudents.map((student: any) => ({
        studentId: student._id,
        registrationNumber: student.registrationNumber,
        name: student.name,
        program: student.program,
        status: "absent" as "present" | "absent", // Default to absent
        attendancePercentage: undefined,
        belowThreshold: false,
        remarks: "",
        isEditing: false,
      }));

      setStudents(studentRecords);
    } catch (error: any) {
      console.error("Error loading students:", error);
      setError(error.message || "Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  };

  // Toggle student status (present/absent)
  const toggleStudentStatus = (index: number) => {
    const updatedStudents = [...students];
    updatedStudents[index].status =
      updatedStudents[index].status === "present" ? "absent" : "present";
    setStudents(updatedStudents);
  };

  // Set all students to present/absent
  const handleSetAllStatus = (status: "present" | "absent") => {
    setAllStatus(status);

    const updatedStudents = students.map((student) => ({
      ...student,
      status,
    }));

    setStudents(updatedStudents);
  };

  // Toggle remarks editing
  const toggleRemarks = (index: number) => {
    const updatedStudents = [...students];
    updatedStudents[index].isEditing = !updatedStudents[index].isEditing;
    setStudents(updatedStudents);
  };

  // Update student remarks
  const updateRemarks = (index: number, value: string) => {
    const updatedStudents = [...students];
    updatedStudents[index].remarks = value;
    setStudents(updatedStudents);
  };

  // Handle global remarks change
  const handleRemarksChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRemarks(event.target.value);
  };

  // Apply global remarks to all
  const applyRemarksToAll = () => {
    if (!remarks.trim()) return;

    const updatedStudents = students.map((student) => ({
      ...student,
      remarks,
    }));

    setStudents(updatedStudents);
  };

  // Save attendance
  const handleSaveAttendance = () => {
    if (!date) {
      setError("Please select a date");
      return;
    }

    // If course is integrated, component is required
    if (courseType.includes("Integrated") && !component) {
      setError(
        "Please select a component (Theory/Lab) for this integrated course"
      );
      return;
    }

    // Call the parent save handler
    onSave(students);
  };

  // Calculate status counts
  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.length - presentCount;

  if (loadingStudents) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (students.length === 0) {
    return <Alert severity="info">No students found for this course.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Take Attendance{" "}
          {component
            ? `(${component.charAt(0).toUpperCase() + component.slice(1)})`
            : ""}
        </Typography>

        {date && (
          <Typography variant="subtitle1">
            Date: {date.toLocaleDateString()}
          </Typography>
        )}

        <Box sx={{ display: "flex", mt: 2, gap: 2, alignItems: "center" }}>
          <Button
            variant="outlined"
            color="success"
            startIcon={<PersonIcon />}
            onClick={() => handleSetAllStatus("present")}
          >
            Mark All Present
          </Button>

          <Button
            variant="outlined"
            color="error"
            startIcon={<PersonOutlineIcon />}
            onClick={() => handleSetAllStatus("absent")}
          >
            Mark All Absent
          </Button>

          <Box sx={{ display: "flex", gap: 1, ml: 3, flexGrow: 1 }}>
            <TextField
              label="Remarks for all"
              size="small"
              value={remarks}
              onChange={handleRemarksChange}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="outlined"
              onClick={applyRemarksToAll}
              disabled={!remarks.trim()}
            >
              Apply to All
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", mt: 2, gap: 1 }}>
          <Chip
            icon={<PersonIcon />}
            label={`Present: ${presentCount}`}
            color="success"
            variant="outlined"
          />
          <Chip
            icon={<PersonOutlineIcon />}
            label={`Absent: ${absentCount}`}
            color="error"
            variant="outlined"
          />
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>S.No.</TableCell>
              <TableCell>Registration No.</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, index) => (
              <TableRow key={student.studentId} hover>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{student.registrationNumber}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.program}</TableCell>
                <TableCell>
                  <RadioGroup
                    row
                    value={student.status}
                    onChange={() => toggleStudentStatus(index)}
                  >
                    <FormControlLabel
                      value="present"
                      control={<Radio color="success" />}
                      label="P"
                    />
                    <FormControlLabel
                      value="absent"
                      control={<Radio color="error" />}
                      label="A"
                    />
                  </RadioGroup>
                </TableCell>
                <TableCell>
                  {student.isEditing ? (
                    <TextField
                      size="small"
                      value={student.remarks || ""}
                      onChange={(e) => updateRemarks(index, e.target.value)}
                      onBlur={() => toggleRemarks(index)}
                      autoFocus
                      fullWidth
                    />
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {student.remarks || "-"}
                      </Typography>
                      <Tooltip title="Add/Edit Remark">
                        <IconButton
                          size="small"
                          onClick={() => toggleRemarks(index)}
                        >
                          <CommentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={24} /> : <SaveIcon />}
          onClick={handleSaveAttendance}
          disabled={loading}
        >
          Save Attendance
        </Button>
      </Box>
    </Box>
  );
};

export default AttendanceTable;
