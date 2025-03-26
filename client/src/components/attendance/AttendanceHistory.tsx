// client/src/components/attendance/AttendanceHistory.tsx
import React, { useState } from "react";
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
} from "@mui/icons-material";

interface AttendanceHistoryProps {
  courseId: string;
  component?: "theory" | "lab";
  attendanceData: any[];
  attendanceSummary: any;
  onDelete: (date: Date) => void;
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
  const filteredRecords = component
    ? attendanceRecords.filter((record) => record.component === component)
    : attendanceRecords;

  // Calculate attendance percentage
  const totalClasses = filteredRecords.length;
  const presentClasses = filteredRecords.filter(
    (r) => r.status === "present"
  ).length;
  const attendancePercentage = totalClasses
    ? (presentClasses / totalClasses) * 100
    : 0;

  // Get absent dates
  const absentDates = filteredRecords
    .filter((record) => record.status === "absent")
    .map((record) => new Date(record.date));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Attendance Details - {student.name} ({student.registrationNumber})
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
                  <strong>Name:</strong> {student.name}
                </Typography>
                <Typography>
                  <strong>Registration No:</strong> {student.registrationNumber}
                </Typography>
                <Typography>
                  <strong>Program:</strong> {student.program}
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
                {absentDates.map((date, index) => (
                  <Chip
                    key={index}
                    label={date.toLocaleDateString()}
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
                  <TableCell>Status</TableCell>
                  <TableCell>Component</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((record, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      bgcolor:
                        record.status === "absent"
                          ? "rgba(244, 67, 54, 0.08)"
                          : "inherit",
                    }}
                  >
                    <TableCell>
                      {new Date(record.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          record.status === "present" ? "Present" : "Absent"
                        }
                        color={
                          record.status === "present" ? "success" : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{record.component || "-"}</TableCell>
                    <TableCell>{record.remarks || "-"}</TableCell>
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
  component,
  attendanceData,
  attendanceSummary,
  onDelete,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<"students" | "dates">("students");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Handle view mode change
  const handleViewModeChange = (
    _: React.SyntheticEvent,
    newValue: "students" | "dates"
  ) => {
    setViewMode(newValue);
  };

  // Open details dialog
  const handleOpenDetails = (student: any) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
  };

  // Close details dialog
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  // Handle delete attendance for a date
  const handleDeleteAttendance = (dateString: string) => {
    onDelete(new Date(dateString));
  };

  if (!attendanceData || attendanceData.length === 0) {
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
                {attendanceSummary.totalStudents}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" gutterBottom>
                Total Classes
              </Typography>
              <Typography variant="h6">
                {attendanceSummary.totalClasses}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" gutterBottom>
                Average Attendance
              </Typography>
              <Typography variant="h6">
                {attendanceSummary.averageAttendance?.toFixed(2)}%
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" gutterBottom>
                Below Threshold
              </Typography>
              <Typography variant="h6" color="error">
                {attendanceSummary.belowThresholdCount} students
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
              {attendanceData.map((student, index) => (
                <TableRow
                  key={student.studentId._id}
                  sx={{
                    backgroundColor: student.belowThreshold
                      ? "rgba(255, 0, 0, 0.05)"
                      : "inherit",
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{student.studentId.registrationNumber}</TableCell>
                  <TableCell>{student.studentId.name}</TableCell>
                  <TableCell>{student.studentId.program}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${student.attendancePercentage.toFixed(2)}%`}
                      color={student.belowThreshold ? "error" : "success"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {student.presentClasses} / {student.totalClasses}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDetails(student.studentId)}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        // Date-wise attendance view
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>S.No.</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Components</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendanceSummary.attendanceDates.map(
                (dateInfo: any, index: number) => (
                  <TableRow key={dateInfo.date}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {new Date(dateInfo.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {dateInfo.components.map((comp: string) => (
                        <Chip
                          key={comp}
                          label={
                            comp === "default"
                              ? "Regular"
                              : comp.charAt(0).toUpperCase() + comp.slice(1)
                          }
                          size="small"
                          sx={{ mr: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Delete Attendance Record">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteAttendance(dateInfo.date)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
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
              (student) => student.studentId._id === selectedStudent._id
            )?.records) ||
          []
        }
        component={component}
      />
    </Box>
  );
};

export default AttendanceHistory;
