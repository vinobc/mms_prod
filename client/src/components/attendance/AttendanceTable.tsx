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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Grid,
  InputAdornment,
} from "@mui/material";
import {
  Save as SaveIcon,
  Person as PersonIcon,
  PersonOutline as PersonOutlineIcon,
  Comment as CommentIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { studentService } from "../../services/studentService";
import { CourseType } from "../../types";
import { format, parse } from "date-fns";

// client/src/components/attendance/AttendanceTable.tsx

// Import statements remain the same

// Predefined time slots for theory and lab sessions
const THEORY_TIME_SLOTS = [
  { label: "9:00 - 9.50", startTime: "09:00", endTime: "09:50" },
  { label: "9:55 - 10.45", startTime: "09:55", endTime: "10:45" },
  { label: "10:50 - 11.40", startTime: "10:50", endTime: "11:40" },
  { label: "11:45 - 12.35", startTime: "11:45", endTime: "12:35" },
  { label: "1:15 - 2.05", startTime: "13:15", endTime: "14:05" },
  { label: "2:10 - 3.00", startTime: "14:10", endTime: "15:00" },
  { label: "3:05 - 3.55", startTime: "15:05", endTime: "15:55" },
  { label: "4:00 - 4.50", startTime: "16:00", endTime: "16:50" },
];

const LAB_TIME_SLOTS = [
  { label: "9:00 AM - 10:40 AM", startTime: "09:00", endTime: "10:40" },
  { label: "10:50 AM - 12:30 PM", startTime: "10:50", endTime: "12:30" },
  { label: "1:15 PM - 2:55 PM", startTime: "13:15", endTime: "14:55" },
  { label: "3:05 PM - 4:45 PM", startTime: "15:05", endTime: "16:45" },
];

interface AttendanceTableProps {
  courseId: string;
  date: Date | null;
  component?: "theory" | "lab";
  loading?: boolean;
  onSave: (attendanceRecords: any[]) => void;
  courseType: CourseType;
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

  // New state for time slots
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("custom");
  const [showCustomTime, setShowCustomTime] = useState<boolean>(false);
  const [startTimeObj, setStartTimeObj] = useState<Date | null>(null);
  const [endTimeObj, setEndTimeObj] = useState<Date | null>(null);

  // Get appropriate time slots based on component
  const getTimeSlots = () => {
    // For lab-only courses, always show lab time slots regardless of component
    if (courseType === "UG-Lab-Only" || courseType === "PG-Lab-Only") {
      return LAB_TIME_SLOTS;
    }
    // For integrated courses, show time slots based on component
    if (component === "lab") {
      return LAB_TIME_SLOTS;
    }
    // Default to theory time slots
    return THEORY_TIME_SLOTS;
  };

  // Fetch students when component mounts or courseId changes
  useEffect(() => {
    if (courseId) {
      fetchStudents();
    }
  }, [courseId]);

  // Reset time slot when component changes
  useEffect(() => {
    setSelectedTimeSlot("custom");
    setStartTime("");
    setEndTime("");
    setStartTimeObj(null);
    setEndTimeObj(null);
    setShowCustomTime(true);
  }, [component]);

  // Set time slot based on selection
  useEffect(() => {
    if (selectedTimeSlot !== "custom") {
      const timeSlots = getTimeSlots();
      const slot = timeSlots.find(
        (slot) => `${slot.startTime}-${slot.endTime}` === selectedTimeSlot
      );
      if (slot) {
        setStartTime(slot.startTime);
        setEndTime(slot.endTime);
        setShowCustomTime(false);

        // Set Date objects for the TimePicker
        if (slot.startTime) {
          setStartTimeObj(parse(slot.startTime, "HH:mm", new Date()));
        }
        if (slot.endTime) {
          setEndTimeObj(parse(slot.endTime, "HH:mm", new Date()));
        }
      }
    } else {
      setShowCustomTime(true);
    }
  }, [selectedTimeSlot, component]);

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

  // Handle time slot selection
  const handleTimeSlotChange = (event: SelectChangeEvent) => {
    setSelectedTimeSlot(event.target.value);
  };

  // Handle custom time changes
  const handleStartTimeChange = (newTime: Date | null) => {
    setStartTimeObj(newTime);
    if (newTime) {
      setStartTime(format(newTime, "HH:mm"));
    } else {
      setStartTime("");
    }
  };

  const handleEndTimeChange = (newTime: Date | null) => {
    setEndTimeObj(newTime);
    if (newTime) {
      setEndTime(format(newTime, "HH:mm"));
    } else {
      setEndTime("");
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

    // Validate time slots
    if (!startTime || !endTime) {
      setError("Please select a time slot or enter custom start and end times");
      return;
    }

    // Call the parent save handler with time information
    onSave({
      students,
      startTime,
      endTime,
    });
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

  // Get appropriate time slots based on the current component
  const timeSlots = getTimeSlots();

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

        {/* Time Slot Selection */}
        <Box sx={{ mt: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="time-slot-label">Time Slot</InputLabel>
                <Select
                  labelId="time-slot-label"
                  value={selectedTimeSlot}
                  onChange={handleTimeSlotChange}
                  label="Time Slot"
                  startAdornment={
                    <InputAdornment position="start">
                      <ScheduleIcon />
                    </InputAdornment>
                  }
                >
                  {timeSlots.map((slot) => (
                    <MenuItem
                      key={`${slot.startTime}-${slot.endTime}`}
                      value={`${slot.startTime}-${slot.endTime}`}
                    >
                      {slot.label}
                    </MenuItem>
                  ))}
                  <MenuItem value="custom">Custom Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {showCustomTime && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Grid item xs={12} md={4}>
                  <TimePicker
                    label="Start Time"
                    value={startTimeObj}
                    onChange={handleStartTimeChange}
                    ampm={false}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TimePicker
                    label="End Time"
                    value={endTimeObj}
                    onChange={handleEndTimeChange}
                    ampm={false}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </LocalizationProvider>
            )}

            {!showCustomTime && (
              <Grid item xs={12} md={8}>
                <Typography variant="body2" color="textSecondary">
                  Selected time slot: {startTime} - {endTime}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>

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
          <Chip
            icon={<ScheduleIcon />}
            label={`Time: ${startTime} - ${endTime}`}
            color="primary"
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
          disabled={loading || !startTime || !endTime}
        >
          Save Attendance
        </Button>
      </Box>
    </Box>
  );
};

export default AttendanceTable;
