// client/src/components/attendance/AttendanceHistory.tsx
import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Info as InfoIcon,
  FormatListBulleted as FormatListBulletedIcon,
  CalendarMonth as CalendarMonthIcon,
  Refresh as RefreshIcon,
  AccessTime as AccessTimeIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import EditAttendanceDialog from "./EditAttendanceDialog";
import { CourseType } from "../../types";

interface AttendanceHistoryProps {
  courseId: string;
  course?: {
    _id: string;
    type: CourseType;
    name: string;
    code: string;
  };
  component?: "theory" | "lab";
  attendanceData: any[];
  attendanceSummary: any;
  onDelete: (sessionData: any) => void;
  onRefresh: () => void;
}

interface AttendanceDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  student: any;
  attendanceRecords: any[];
  component?: "theory" | "lab";
}

// Dialog for viewing student's attendance details
const AttendanceDetailsDialog: React.FC<AttendanceDetailsDialogProps> = ({
  open,
  onClose,
  student,
  attendanceRecords,
  component,
}) => {
  if (!student) return null;

  // Filter records by component if needed
  const filteredRecords = useMemo(() => {
    if (!Array.isArray(attendanceRecords)) return [];

    return component
      ? attendanceRecords.filter((record) => record?.component === component)
      : attendanceRecords;
  }, [attendanceRecords, component]);

  // Calculate attendance percentage
  const totalClasses = filteredRecords.length;
  const presentClasses = filteredRecords.filter(
    (r) => r?.status === "present"
  ).length;
  const attendancePercentage = totalClasses
    ? (presentClasses / totalClasses) * 100
    : 0;

  // Get absent dates
  const absentDates = useMemo(() => {
    return filteredRecords
      .filter((record) => record?.status === "absent")
      .map((record, index) => {
        const timeInfo =
          record.startTime && record.endTime
            ? `${record.startTime} - ${record.endTime}`
            : undefined;

        return {
          id: `absent-${index}`,
          date: new Date(record.date),
          timeSlot: timeInfo,
          component: record.component,
        };
      });
  }, [filteredRecords]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Attendance Details - {student?.name || "Unknown"} (
        {student?.registrationNumber || "N/A"})
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="subtitle1" gutterBottom>
                  Student Information
                </Typography>
                <Typography>
                  <strong>Name:</strong> {student?.name || "Unknown"}
                </Typography>
                <Typography>
                  <strong>Registration No:</strong>{" "}
                  {student?.registrationNumber || "N/A"}
                </Typography>
                <Typography>
                  <strong>Program:</strong> {student?.program || "N/A"}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="subtitle1" gutterBottom>
                  Attendance Summary
                </Typography>
                <Typography>
                  <strong>Total Classes:</strong> {totalClasses}
                </Typography>
                <Typography>
                  <strong>Classes Attended:</strong> {presentClasses}
                </Typography>
                <Typography>
                  <strong>Attendance Percentage:</strong>{" "}
                  <Chip
                    label={`${attendancePercentage.toFixed(2)}%`}
                    color={attendancePercentage < 75 ? "error" : "success"}
                    size="small"
                  />
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Absent Dates Section */}
        {absentDates.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Paper sx={{ p: 2, bgcolor: "error.lightest" }}>
              <Typography variant="subtitle1" color="error" gutterBottom>
                <strong>Absent Dates ({absentDates.length})</strong>
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {absentDates.map((absentInfo) => (
                  <Chip
                    key={absentInfo.id}
                    label={`${absentInfo.date.toLocaleDateString()} ${
                      absentInfo.timeSlot ? `(${absentInfo.timeSlot})` : ""
                    }`}
                    color="error"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Paper>
          </Box>
        )}

        <Typography variant="h6" gutterBottom>
          Attendance Records
        </Typography>

        {filteredRecords.length === 0 ? (
          <Alert severity="info">
            No attendance records found for this student.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time Slot</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Component</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((record, index) => (
                  <TableRow
                    key={`record-${index}-${record?.date || "unknown"}`}
                    sx={{
                      bgcolor:
                        record?.status === "absent"
                          ? "rgba(244, 67, 54, 0.08)"
                          : "inherit",
                    }}
                  >
                    <TableCell>
                      {record?.date
                        ? new Date(record.date).toLocaleDateString()
                        : "Unknown"}
                    </TableCell>
                    <TableCell>
                      {record?.startTime && record?.endTime
                        ? `${record.startTime} - ${record.endTime}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          record?.status === "present" ? "Present" : "Absent"
                        }
                        color={
                          record?.status === "present" ? "success" : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{record?.component || "-"}</TableCell>
                    <TableCell>{record?.remarks || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  courseId,
  course,
  component,
  attendanceData,
  attendanceSummary,
  onDelete,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState("students");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Validate data is in expected format
  const isValidData = useMemo(() => {
    if (!Array.isArray(attendanceData)) return false;
    if (!attendanceSummary) return false;
    return true;
  }, [attendanceData, attendanceSummary]);

  // Handle view mode change
  const handleViewModeChange = (_, newValue) => {
    setViewMode(newValue);
  };

  // Open details dialog
  const handleOpenDetails = (student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
  };

  // Close details dialog
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  // Open edit dialog
  const handleOpenEdit = (sessionData) => {
    setSelectedSession(sessionData);
    setEditDialogOpen(true);
  };

  // Close edit dialog
  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setSelectedSession(null);
  };

  // Handle delete attendance for a date and time slot
  const handleDeleteAttendance = (sessionData) => {
    onDelete(sessionData);
  };

  if (!isValidData || attendanceData.length === 0) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={onRefresh}>
              Refresh
            </Button>
          }
        >
          No attendance records found for this course. Start taking attendance
          to see history.
        </Alert>
      </Box>
    );
  }

  if (!attendanceSummary) {
    return <CircularProgress />;
  }

  // Ensure attendanceSessions is available and is an array
  const attendanceSessions = useMemo(() => {
    return Array.isArray(attendanceSummary?.attendanceSessions)
      ? attendanceSummary.attendanceSessions
      : [];
  }, [attendanceSummary]);

  // Validate students for rendering
  const validStudents = useMemo(() => {
    return attendanceData.filter((student) => student?.studentId);
  }, [attendanceData]);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h6">
          Attendance History{" "}
          {component
            ? `(${component.charAt(0).toUpperCase() + component.slice(1)})`
            : ""}
        </Typography>

        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" gutterBottom>
                Total Students
              </Typography>
              <Typography variant="h6">
                {attendanceSummary?.totalStudents || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" gutterBottom>
                Total Classes
              </Typography>
              <Typography variant="h6">
                {attendanceSummary?.totalClasses || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" gutterBottom>
                Average Attendance
              </Typography>
              <Typography variant="h6">
                {attendanceSummary?.averageAttendance?.toFixed(2) || "0.00"}%
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" gutterBottom>
                Below Threshold
              </Typography>
              <Typography variant="h6" color="error">
                {attendanceSummary?.belowThresholdCount || 0} students
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Tabs
          value={viewMode}
          onChange={handleViewModeChange}
          aria-label="view mode tabs"
          sx={{ mb: 2 }}
        >
          <Tab
            icon={<FormatListBulletedIcon />}
            label="Student View"
            value="students"
          />
          <Tab icon={<CalendarMonthIcon />} label="Date View" value="dates" />
        </Tabs>
      </Box>

      {viewMode === "students" ? (
        // Student-wise attendance view
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>S.No.</TableCell>
                <TableCell>Registration No.</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Program</TableCell>
                <TableCell>Attendance %</TableCell>
                <TableCell>Classes Attended</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {validStudents
                .sort((a, b) => {
                  const regA = a.studentId?.registrationNumber || "";
                  const regB = b.studentId?.registrationNumber || "";
                  return regA.localeCompare(regB);
                })
                .map((student, index) => (
                  <TableRow
                    key={`student-row-${index}`}
                    sx={{
                      backgroundColor: student.belowThreshold
                        ? "rgba(255, 0, 0, 0.05)"
                        : "inherit",
                    }}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {student.studentId?.registrationNumber || "N/A"}
                    </TableCell>
                    <TableCell>
                      {student.studentId?.name || "Unknown"}
                    </TableCell>
                    <TableCell>{student.studentId?.program || "N/A"}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${
                          student.attendancePercentage?.toFixed(2) || "0.00"
                        }%`}
                        color={student.belowThreshold ? "error" : "success"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {student.presentClasses ?? 0} /{" "}
                      {student.totalClasses ?? 0}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDetails(student.studentId)}
                      >
                        <InfoIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        // Date-wise attendance view with time slots - with defensive checks
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>S.No.</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Time Slot</TableCell>
                <TableCell>Components</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendanceSessions.length > 0 ? (
                attendanceSessions.map((sessionInfo, index) => (
                  <TableRow key={`session-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {sessionInfo?.date
                        ? new Date(sessionInfo.date).toLocaleDateString()
                        : "Unknown Date"}
                    </TableCell>
                    <TableCell>
                      {sessionInfo?.timeSlot ? (
                        <Chip
                          icon={<AccessTimeIcon />}
                          label={sessionInfo.timeSlot}
                          color="primary"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No time specified
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {Array.isArray(sessionInfo?.components) &&
                      sessionInfo.components.length > 0 ? (
                        sessionInfo.components.map((comp, i) => (
                          <Chip
                            key={`comp-${index}-${i}`}
                            label={
                              comp === "default"
                                ? "Regular"
                                : comp.charAt(0).toUpperCase() + comp.slice(1)
                            }
                            size="small"
                            sx={{ mr: 0.5 }}
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex" }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEdit(sessionInfo)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteAttendance(sessionInfo)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Alert severity="info">
                      No attendance sessions data available
                    </Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Attendance Details Dialog */}
      <AttendanceDetailsDialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        student={selectedStudent}
        attendanceRecords={
          (selectedStudent &&
            attendanceData.find(
              (student) =>
                student?.studentId &&
                student.studentId._id === selectedStudent._id
            )?.records) ||
          []
        }
        component={component}
      />

      {/* Edit Attendance Dialog */}
      <EditAttendanceDialog
        open={editDialogOpen}
        onClose={handleCloseEdit}
        courseId={courseId}
        courseType={course?.type || "UG"}
        sessionData={selectedSession}
        onUpdate={onRefresh}
      />
    </Box>
  );
};

export default AttendanceHistory;
