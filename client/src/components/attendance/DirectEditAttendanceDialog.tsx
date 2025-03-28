// DirectEditAttendanceDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  CircularProgress,
  IconButton,
  Chip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  PersonOutline as PersonOutlineIcon,
} from "@mui/icons-material";
import { attendanceService } from "../../services/attendanceService";
import { CourseType } from "../../types";

interface DirectEditAttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseType: CourseType;
  sessionData: {
    date: string;
    timeSlot: string | null;
    components?: string[];
  } | null;
  // Pass existing attendance data directly from parent
  attendanceData: any[];
  onUpdate: () => void;
}

// Simplified student record interface
interface SimpleStudentRecord {
  studentId: string;
  registrationNumber: string;
  name: string;
  program: string;
  status: "present" | "absent";
}

const DirectEditAttendanceDialog: React.FC<DirectEditAttendanceDialogProps> = ({
  open,
  onClose,
  courseId,
  courseType,
  sessionData,
  attendanceData,
  onUpdate,
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<SimpleStudentRecord[]>([]);

  // Extract session data
  const sessionDate = sessionData?.date || "";
  const sessionTimeSlot = sessionData?.timeSlot || "";
  const sessionComponent = sessionData?.components?.[0] || "";

  // Parse time from time slot
  const parseTimeSlot = () => {
    if (!sessionTimeSlot) return { startTime: "", endTime: "" };

    // Try different delimiters
    let parts: string[] = [];
    if (sessionTimeSlot.includes(" - ")) {
      parts = sessionTimeSlot.split(" - ");
    } else if (sessionTimeSlot.includes("-")) {
      parts = sessionTimeSlot.split("-");
    } else {
      return { startTime: "", endTime: "" };
    }

    if (parts.length === 2) {
      return { startTime: parts[0], endTime: parts[1] };
    }
    return { startTime: "", endTime: "" };
  };

  const { startTime, endTime } = parseTimeSlot();

  // Calculate present/absent counts
  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.length - presentCount;

  // Prepare student data from parent component data when dialog opens
  useEffect(() => {
    if (open && sessionData && Array.isArray(attendanceData)) {
      prepareStudentData();
    }
  }, [open, sessionData, attendanceData]);

  // Process attendance data passed from parent
  const prepareStudentData = () => {
    if (!Array.isArray(attendanceData) || !sessionData) return;

    // Helper function to check if the record belongs to this session
    const recordMatchesSession = (record: any) => {
      if (!record.date || !sessionTimeSlot) return false;

      // Check date match
      const recordDate = new Date(record.date).toDateString();
      const targetDate = new Date(sessionData.date).toDateString();
      if (recordDate !== targetDate) return false;

      // Check time match
      if (record.startTime && record.endTime) {
        const recordTimeSlot = `${record.startTime} - ${record.endTime}`;
        if (
          recordTimeSlot !== sessionTimeSlot &&
          recordTimeSlot.replace(/ - /g, "-") !==
            sessionTimeSlot.replace(/ - /g, "-")
        ) {
          return false;
        }
      }

      // Check component match
      if (sessionComponent && record.component !== sessionComponent) {
        return false;
      }

      return true;
    };

    // Process attendance data to find students and their status
    const studentRecords: SimpleStudentRecord[] = [];
    const processedStudents = new Set();

    attendanceData.forEach((student) => {
      if (!student.studentId || processedStudents.has(student.studentId._id))
        return;

      // Mark student as processed to avoid duplicates
      processedStudents.add(student.studentId._id);

      // Default to absent
      let status: "present" | "absent" = "absent";

      // Look for a matching attendance record for this session
      if (student.records && Array.isArray(student.records)) {
        const matchingRecord = student.records.find(recordMatchesSession);
        if (matchingRecord) {
          status = matchingRecord.status || "absent";
        }
      }

      // Add student to our list
      studentRecords.push({
        studentId: student.studentId._id,
        registrationNumber: student.studentId.registrationNumber || "Unknown",
        name: student.studentId.name || "Unknown",
        program: student.studentId.program || "Unknown",
        status,
      });
    });

    // Sort by registration number
    const sortedRecords = studentRecords.sort((a, b) =>
      a.registrationNumber.localeCompare(b.registrationNumber)
    );

    setStudents(sortedRecords);
  };

  // Toggle student's attendance status
  const toggleStudentStatus = (index: number) => {
    const updatedStudents = [...students];
    updatedStudents[index].status =
      updatedStudents[index].status === "present" ? "absent" : "present";
    setStudents(updatedStudents);
  };

  // Mark all students as present
  const markAllPresent = () => {
    const updatedStudents = students.map((student) => ({
      ...student,
      status: "present",
    }));
    setStudents(updatedStudents);
  };

  // Mark all students as absent
  const markAllAbsent = () => {
    const updatedStudents = students.map((student) => ({
      ...student,
      status: "absent",
    }));
    setStudents(updatedStudents);
  };

  // Save the updated attendance data
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!sessionData || !sessionData.date) {
        setError("Invalid session data");
        return;
      }

      // Format data for the API
      const attendanceData = students.map((student) => ({
        studentId: student.studentId,
        status: student.status,
      }));

      // Get academic year from localStorage or use default
      const academicYear =
        localStorage.getItem(`courseAcademicYear_${courseId}`) || "2023-24";

      // Use the attendance service to update the records
      await attendanceService.takeAttendance(
        courseId,
        new Date(sessionData.date),
        attendanceData,
        (sessionComponent as any) || undefined,
        academicYear,
        "", // No global remarks
        startTime,
        endTime
      );

      // Close the dialog and refresh the parent component
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error saving attendance:", error);
      setError("Failed to save attendance data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: "90vh" },
      }}
    >
      <DialogTitle>
        Edit Attendance Session
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box mb={3}>
          <Typography variant="h6">Session Details</Typography>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                Date:
              </Typography>
              <Typography variant="body1">
                {new Date(sessionDate).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                Time Slot:
              </Typography>
              <Typography variant="body1">
                {sessionTimeSlot || "Not specified"}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                Component:
              </Typography>
              <Typography variant="body1">
                {sessionComponent
                  ? sessionComponent.charAt(0).toUpperCase() +
                    sessionComponent.slice(1)
                  : "Regular"}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            color="success"
            onClick={markAllPresent}
            startIcon={<PersonIcon />}
            disabled={students.length === 0}
          >
            Mark All Present
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={markAllAbsent}
            startIcon={<PersonOutlineIcon />}
            disabled={students.length === 0}
          >
            Mark All Absent
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Chip
            label={`Present: ${presentCount}`}
            color="success"
            variant="outlined"
          />
          <Chip
            label={`Absent: ${absentCount}`}
            color="error"
            variant="outlined"
          />
        </Box>

        {students.length === 0 ? (
          <Typography>No students available for this session.</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: "50vh" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Registration No.</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Program</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student, index) => (
                  <TableRow key={`student-${student.studentId}-${index}`} hover>
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
                          label="Present"
                        />
                        <FormControlLabel
                          value="absent"
                          control={<Radio color="error" />}
                          label="Absent"
                        />
                      </RadioGroup>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          startIcon={saving ? <CircularProgress size={24} /> : <SaveIcon />}
          disabled={saving || students.length === 0}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DirectEditAttendanceDialog;
