// client/src/components/attendance/EditAttendanceDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  InputAdornment,
  Tooltip,
  Chip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  Save as SaveIcon,
  Close as CloseIcon,
  CommentOutlined as CommentIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  PersonOutline as PersonOutlineIcon,
} from "@mui/icons-material";
import { parse, format } from "date-fns";
import { CourseType } from "../../types";
import { attendanceService } from "../../services/attendanceService";
import {
  THEORY_TIME_SLOTS,
  LAB_TIME_SLOTS,
} from "../../services/attendanceService";

interface EditAttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseType: CourseType;
  sessionData: {
    date: string;
    timeSlot: string | null;
    components?: string[];
  } | null;
  onUpdate: () => void;
}

// Interface for student data
interface StudentAttendanceRecord {
  studentId: string;
  registrationNumber: string;
  name: string;
  program: string;
  status: "present" | "absent";
  remarks: string;
  isEditing: boolean;
}

const EditAttendanceDialog: React.FC<EditAttendanceDialogProps> = ({
  open,
  onClose,
  courseId,
  courseType,
  sessionData,
  onUpdate,
}) => {
  // State for form data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentAttendanceRecord[]>([]);

  // Original session data
  const [originalDate, setOriginalDate] = useState<Date | null>(null);
  const [originalStartTime, setOriginalStartTime] = useState<string>("");
  const [originalEndTime, setOriginalEndTime] = useState<string>("");
  const [originalComponent, setOriginalComponent] = useState<
    "theory" | "lab" | ""
  >("");

  // New session data
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [component, setComponent] = useState<"theory" | "lab" | "">("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("custom");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [startTimeObj, setStartTimeObj] = useState<Date | null>(null);
  const [endTimeObj, setEndTimeObj] = useState<Date | null>(null);
  const [showCustomTime, setShowCustomTime] = useState<boolean>(true);

  useEffect(() => {
    if (open && sessionData) {
      // Initialize students as an empty array to prevent mapping errors
      setStudents([]);

      // Parse and set the original date
      if (sessionData.date) {
        try {
          const parsedDate = new Date(sessionData.date);
          setOriginalDate(parsedDate);
          setNewDate(parsedDate);
        } catch (err) {
          console.error("Error parsing date:", err);
          // Set default values on error
          setOriginalDate(new Date());
          setNewDate(new Date());
        }
      }

      // Parse and set time slot if available
      if (sessionData.timeSlot) {
        try {
          const parts = sessionData.timeSlot.split(" - ");
          if (parts.length === 2) {
            const [start, end] = parts;
            setOriginalStartTime(start);
            setOriginalEndTime(end);
            setStartTime(start);
            setEndTime(end);

            // Set time objects for the pickers
            try {
              if (start) setStartTimeObj(parse(start, "HH:mm", new Date()));
              if (end) setEndTimeObj(parse(end, "HH:mm", new Date()));
            } catch (err) {
              console.error("Error parsing time:", err);
              setStartTimeObj(null);
              setEndTimeObj(null);
            }
          }
        } catch (err) {
          console.error("Error processing time slot:", err);
        }
      }

      // Set component if available
      if (
        sessionData.components &&
        Array.isArray(sessionData.components) &&
        sessionData.components.length > 0
      ) {
        const comp = sessionData.components[0];
        if (comp === "theory" || comp === "lab") {
          setOriginalComponent(comp);
          setComponent(comp);
        }
      }

      // Load student attendance data for this session
      fetchSessionAttendance();
    }
  }, [open, sessionData, courseId]);

  // Set available time slots based on the component
  const getTimeSlots = () => {
    // For lab-only courses, always show lab time slots
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

  // Handle time slot selection
  const handleTimeSlotChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    const value = event.target.value as string;
    setSelectedTimeSlot(value);

    if (value !== "custom") {
      const timeSlots = getTimeSlots();
      const slot = timeSlots.find(
        (slot) => `${slot.startTime}-${slot.endTime}` === value
      );
      if (slot) {
        setStartTime(slot.startTime);
        setEndTime(slot.endTime);
        setShowCustomTime(false);

        // Set Date objects for the TimePicker
        try {
          setStartTimeObj(parse(slot.startTime, "HH:mm", new Date()));
          setEndTimeObj(parse(slot.endTime, "HH:mm", new Date()));
        } catch (err) {
          console.error("Error parsing time slot times:", err);
        }
      }
    } else {
      setShowCustomTime(true);
    }
  };
  // Handle custom time changes
  const handleStartTimeChange = (newTime: Date | null) => {
    setStartTimeObj(newTime);
    if (newTime) {
      try {
        setStartTime(format(newTime, "HH:mm"));
      } catch (err) {
        console.error("Error formatting start time:", err);
        setStartTime("");
      }
    } else {
      setStartTime("");
    }
  };

  const handleEndTimeChange = (newTime: Date | null) => {
    setEndTimeObj(newTime);
    if (newTime) {
      try {
        setEndTime(format(newTime, "HH:mm"));
      } catch (err) {
        console.error("Error formatting end time:", err);
        setEndTime("");
      }
    } else {
      setEndTime("");
    }
  };

  // Fetch attendance data for the session
  const fetchSessionAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure we have required data
      if (!courseId || !originalDate) {
        setStudents([]);
        return;
      }

      // Format the date for the API
      const formattedDate = format(originalDate, "yyyy-MM-dd");

      // Fetch attendance data
      const attendanceData = await attendanceService.getCourseAttendance(
        courseId,
        {
          component: originalComponent || undefined,
          startDate: formattedDate,
          endDate: formattedDate,
        }
      );

      // Process and filter students for this specific time slot
      if (Array.isArray(attendanceData) && attendanceData.length > 0) {
        const sessionStudents = attendanceData
          .filter(
            (student) => student && student.studentId && student.studentId._id
          ) // Filter out invalid student data
          .map((student) => {
            // Find the specific record for this session
            const sessionRecord = Array.isArray(student.records)
              ? student.records.find((record: any) => {
                  if (!record || !record.date) return false;

                  try {
                    const recordDate = new Date(record.date).toDateString();
                    const sessionDate = originalDate.toDateString();

                    const matchesTime =
                      !originalStartTime ||
                      !originalEndTime ||
                      (record.startTime === originalStartTime &&
                        record.endTime === originalEndTime);

                    const matchesComponent =
                      !originalComponent ||
                      record.component === originalComponent;

                    return (
                      recordDate === sessionDate &&
                      matchesTime &&
                      matchesComponent
                    );
                  } catch (err) {
                    console.error("Error comparing record dates:", err);
                    return false;
                  }
                })
              : null;

            return {
              studentId: student.studentId._id,
              registrationNumber:
                student.studentId.registrationNumber || "Unknown",
              name: student.studentId.name || "Unknown",
              program: student.studentId.program || "Unknown",
              status: sessionRecord?.status || "absent",
              remarks: sessionRecord?.remarks || "",
              isEditing: false,
            };
          });

        setStudents(sessionStudents);
      } else {
        // Initialize with empty array if no data
        setStudents([]);
      }
    } catch (error: any) {
      console.error("Error loading session attendance:", error);
      setError(error.message || "Failed to load attendance data");
      setStudents([]); // Initialize with empty array to prevent errors
    } finally {
      setLoading(false);
    }
  };

  // Toggle student status
  const toggleStudentStatus = (index: number) => {
    if (!Array.isArray(students) || index < 0 || index >= students.length)
      return;

    const updatedStudents = [...students];
    updatedStudents[index].status =
      updatedStudents[index].status === "present" ? "absent" : "present";
    setStudents(updatedStudents);
  };

  // Toggle remarks editing
  const toggleRemarks = (index: number) => {
    if (!Array.isArray(students) || index < 0 || index >= students.length)
      return;

    const updatedStudents = [...students];
    updatedStudents[index].isEditing = !updatedStudents[index].isEditing;
    setStudents(updatedStudents);
  };

  // Update student remarks
  const updateRemarks = (index: number, value: string) => {
    if (!Array.isArray(students) || index < 0 || index >= students.length)
      return;

    const updatedStudents = [...students];
    updatedStudents[index].remarks = value;
    setStudents(updatedStudents);
  };

  // Mark all students as present
  const markAllPresent = () => {
    if (!Array.isArray(students) || students.length === 0) return;

    const updatedStudents = students.map((student) => ({
      ...student,
      status: "present",
    }));
    setStudents(updatedStudents);
  };

  // Mark all students as absent
  const markAllAbsent = () => {
    if (!Array.isArray(students) || students.length === 0) return;

    const updatedStudents = students.map((student) => ({
      ...student,
      status: "absent",
    }));
    setStudents(updatedStudents);
  };

  // Handle save button
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!courseId || !originalDate || !newDate) {
        setError("Course and dates are required");
        return;
      }

      // Check if we have students data
      if (!Array.isArray(students) || students.length === 0) {
        setError("No student data available to save");
        return;
      }

      // Format attendance data
      const formattedData = students.map((record) => ({
        studentId: record.studentId,
        status: record.status || "absent",
        remarks: record.remarks,
      }));

      // Get academic year from localStorage or use default
      const academicYear =
        localStorage.getItem(`courseAcademicYear_${courseId}`) || "2023-24";

      // Call the service to modify attendance
      await attendanceService.modifyAttendance(
        courseId,
        originalDate,
        newDate,
        formattedData,
        originalStartTime,
        originalEndTime,
        startTime,
        endTime,
        originalComponent || undefined,
        component || undefined,
        academicYear
      );

      // Close the dialog and refresh data
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error("Error updating attendance:", error);
      setError(error.message || "Failed to update attendance");
    } finally {
      setLoading(false);
    }
  };

  // Safely calculate attendance stats
  const presentCount = Array.isArray(students)
    ? students.filter((s) => s.status === "present").length
    : 0;

  const absentCount = Array.isArray(students)
    ? students.length - presentCount
    : 0;

  // Safely get timeslots
  const timeSlots = getTimeSlots();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
        {loading && (!Array.isArray(students) || students.length === 0) ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Original Session:{" "}
              {originalDate?.toLocaleDateString() || "Unknown"}
              {originalStartTime &&
                originalEndTime &&
                ` (${originalStartTime} - ${originalEndTime})`}
              {originalComponent &&
                ` - ${
                  originalComponent.charAt(0).toUpperCase() +
                  originalComponent.slice(1)
                }`}
            </Typography>

            <Grid container spacing={3} sx={{ mt: 1, mb: 3 }}>
              {/* Date Picker */}
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="New Date"
                    value={newDate}
                    onChange={(date) => setNewDate(date)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>

              {/* Component Selection for Integrated Courses */}
              {courseType && courseType.includes("Integrated") && (
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel id="component-label">Component</InputLabel>
                    <Select
                      labelId="component-label"
                      value={component}
                      onChange={(e) =>
                        setComponent(e.target.value as "theory" | "lab" | "")
                      }
                      label="Component"
                    >
                      <MenuItem value="theory">Theory</MenuItem>
                      <MenuItem value="lab">Lab</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Time Slot Selection */}
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
                    {getTimeSlots().map((slot) => (
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
              {/* Custom Time Pickers */}
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
            </Grid>

            {/* Quick Actions */}
            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              <Button
                variant="outlined"
                color="success"
                onClick={markAllPresent}
                startIcon={<PersonIcon />}
                disabled={!Array.isArray(students) || students.length === 0}
              >
                Mark All Present
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={markAllAbsent}
                startIcon={<PersonOutlineIcon />}
                disabled={!Array.isArray(students) || students.length === 0}
              >
                Mark All Absent
              </Button>
            </Box>

            {/* Attendance stats */}
            <Box sx={{ display: "flex", mt: 2, gap: 1, mb: 2 }}>
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
                label={`Time: ${startTime || "-"} - ${endTime || "-"}`}
                color="primary"
                variant="outlined"
              />
            </Box>

            {/* Student Attendance List */}
            {!Array.isArray(students) || students.length === 0 ? (
              <Typography>
                No student data available for this session
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell>Registration No.</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student, index) => (
                      <TableRow
                        key={`student-${student.studentId}-${index}`}
                        hover
                      >
                        <TableCell>{student.registrationNumber}</TableCell>
                        <TableCell>{student.name}</TableCell>
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
                        <TableCell>
                          {student.isEditing ? (
                            <TextField
                              size="small"
                              value={student.remarks || ""}
                              onChange={(e) =>
                                updateRemarks(index, e.target.value)
                              }
                              onBlur={() => toggleRemarks(index)}
                              autoFocus
                              fullWidth
                            />
                          ) : (
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ maxWidth: 200 }}
                              >
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
            )}

            {error && (
              <Box sx={{ mt: 2 }}>
                <Typography color="error">{error}</Typography>
              </Box>
            )}
          </>
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
          startIcon={loading ? <CircularProgress size={24} /> : <SaveIcon />}
          disabled={
            loading ||
            !newDate ||
            !startTime ||
            !endTime ||
            !Array.isArray(students) ||
            students.length === 0
          }
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditAttendanceDialog;
