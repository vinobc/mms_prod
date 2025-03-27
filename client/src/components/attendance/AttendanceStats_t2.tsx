// client/src/components/attendance/AttendanceStats.tsx
import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  GetApp as GetAppIcon,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";

// Define colors
const COLORS = ["#4caf50", "#ff9800", "#f44336"];
const THRESHOLD = 75;

const AttendanceStats = ({
  courseId,
  component,
  attendanceData,
  attendanceSummary,
  onRefresh,
}) => {
  // Group students by attendance range
  const attendanceRanges = useMemo(() => {
    const ranges = [
      { name: "Good (≥75%)", value: 0, color: "#4caf50" },
      { name: "Average (50-75%)", value: 0, color: "#ff9800" },
      { name: "Poor (<50%)", value: 0, color: "#f44336" },
    ];

    if (!Array.isArray(attendanceData)) {
      return ranges;
    }

    attendanceData.forEach((student) => {
      if (!student) return;

      const percentage = student.attendancePercentage || 0;

      if (percentage >= 75) {
        ranges[0].value++;
      } else if (percentage >= 50) {
        ranges[1].value++;
      } else {
        ranges[2].value++;
      }
    });

    return ranges;
  }, [attendanceData]);

  // Get students with below threshold attendance
  const studentsBelowThreshold = useMemo(() => {
    if (!Array.isArray(attendanceData)) {
      return [];
    }

    return attendanceData
      .filter((student) => student?.belowThreshold && student?.studentId)
      .sort(
        (a, b) => (a.attendancePercentage || 0) - (b.attendancePercentage || 0)
      );
  }, [attendanceData]);

  // If data is loading or not available
  if (
    !attendanceData ||
    !Array.isArray(attendanceData) ||
    attendanceData.length === 0 ||
    !attendanceSummary
  ) {
    return (
      <Box
        sx={{
          mt: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {!attendanceData || !attendanceSummary ? (
          <CircularProgress />
        ) : (
          <Alert
            severity="info"
            action={
              <Button color="inherit" size="small" onClick={onRefresh}>
                Refresh
              </Button>
            }
          >
            No attendance data available. Start taking attendance to see
            statistics.
          </Alert>
        )}
      </Box>
    );
  }

  // Filter valid students
  const validStudents = useMemo(() => {
    return Array.isArray(attendanceData)
      ? attendanceData.filter((student) => student?.studentId)
      : [];
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
          Attendance Statistics{" "}
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Students
              </Typography>
              <Typography variant="h4">
                {attendanceSummary?.totalStudents || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Classes
              </Typography>
              <Typography variant="h4">
                {attendanceSummary?.totalClasses || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Attendance
              </Typography>
              <Typography variant="h4">
                {attendanceSummary?.averageAttendance?.toFixed(2) || "0.00"}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            variant="outlined"
            sx={{ borderColor: "error.light", bgcolor: "error.lightest" }}
          >
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Below Threshold
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography variant="h4" color="error">
                  {attendanceSummary?.belowThresholdCount || 0}
                </Typography>
                <Box component="span" sx={{ ml: 1, color: "text.secondary" }}>
                  student
                  {(attendanceSummary?.belowThresholdCount || 0) !== 1
                    ? "s"
                    : ""}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Attendance Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceRanges}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {attendanceRanges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip
                    formatter={(value, name) => [
                      `${value} student${value !== 1 ? "s" : ""}`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Bar Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Students with Low Attendance
            </Typography>

            {studentsBelowThreshold.length === 0 ? (
              <Box
                sx={{
                  mt: 8,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Alert severity="success" icon={<TrendingUpIcon />}>
                  Great! All students have attendance above the threshold (75%).
                </Alert>
              </Box>
            ) : (
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={studentsBelowThreshold.map((student, index) => ({
                      name: student.studentId?.registrationNumber || "Unknown",
                      attendance: student.attendancePercentage || 0,
                      fullName: student.studentId?.name || "Unknown Student",
                      id: `student-${index}`, // Added to ensure uniqueness
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      domain={[0, 100]}
                      label={{
                        value: "Attendance %",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <RechartsTooltip
                      formatter={(value, name, props) => [
                        `${(value || 0).toFixed(2)}%`,
                        props?.payload?.fullName || "Unknown",
                      ]}
                    />
                    <Bar
                      dataKey="attendance"
                      fill="#f44336"
                      name="Attendance %"
                    />
                    {/* Threshold line */}
                    <ReferenceLine y={75} stroke="#000" strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Students Below Threshold */}
      {studentsBelowThreshold.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center" }}
            >
              <WarningIcon color="error" sx={{ mr: 1 }} />
              Students Below Attendance Threshold ({THRESHOLD}%)
            </Typography>

            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<GetAppIcon />}
              onClick={() => {
                // Generate CSV content
                const headers = [
                  "Registration No.",
                  "Name",
                  "Program",
                  "Attendance %",
                  "Classes Attended",
                  "Total Classes",
                ];

                // Create CSV rows from student data
                const rows = studentsBelowThreshold.map((student) => [
                  student.studentId?.registrationNumber || "Unknown",
                  student.studentId?.name || "Unknown Student",
                  student.studentId?.program || "Unknown Program",
                  `${(student.attendancePercentage || 0).toFixed(2)}%`,
                  student.presentClasses || 0,
                  student.totalClasses || 0,
                ]);

                // Combine headers and rows
                const csvContent = [
                  headers.join(","),
                  ...rows.map((row) =>
                    row
                      .map((cell) =>
                        typeof cell === "string" && cell.includes(",")
                          ? `"${cell}"`
                          : cell
                      )
                      .join(",")
                  ),
                ].join("\n");

                // Create a Blob with the CSV content
                const blob = new Blob([csvContent], {
                  type: "text/csv;charset=utf-8;",
                });

                // Create a download link and trigger the download
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute(
                  "download",
                  `students_below_threshold_${new Date()
                    .toISOString()
                    .slice(0, 10)}.csv`
                );
                document.body.appendChild(link);
                link.click();

                // Clean up
                setTimeout(() => {
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }, 0);
              }}
            >
              Export to CSV
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>Registration No.</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Program</TableCell>
                  <TableCell>Attendance %</TableCell>
                  <TableCell>Classes Attended</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentsBelowThreshold.map((student, index) => (
                  <TableRow key={`below-student-${index}`}>
                    <TableCell>
                      {student.studentId?.registrationNumber || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {student.studentId?.name || "Unknown Student"}
                    </TableCell>
                    <TableCell>
                      {student.studentId?.program || "Unknown Program"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${(student.attendancePercentage || 0).toFixed(
                          2
                        )}%`}
                        color="error"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {student.presentClasses || 0} /{" "}
                      {student.totalClasses || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* All Students */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          All Students Attendance
        </Typography>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Registration No.</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Program</TableCell>
                <TableCell>Attendance %</TableCell>
                <TableCell>Classes Attended</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {validStudents
                .sort(
                  (a, b) =>
                    (a.attendancePercentage || 0) -
                    (b.attendancePercentage || 0)
                )
                .map((student, index) => (
                  <TableRow
                    key={`all-student-${index}`}
                    sx={{
                      backgroundColor: student.belowThreshold
                        ? "rgba(255, 0, 0, 0.05)"
                        : "inherit",
                    }}
                  >
                    <TableCell>
                      {student.studentId?.registrationNumber || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {student.studentId?.name || "Unknown Student"}
                    </TableCell>
                    <TableCell>
                      {student.studentId?.program || "Unknown Program"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${(student.attendancePercentage || 0).toFixed(
                          2
                        )}%`}
                        color={student.belowThreshold ? "error" : "success"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {student.presentClasses || 0} /{" "}
                      {student.totalClasses || 0}
                    </TableCell>
                    <TableCell>
                      {student.belowThreshold ? (
                        <Chip
                          icon={<TrendingDownIcon />}
                          label="Below Threshold"
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<TrendingUpIcon />}
                          label="Good Standing"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default AttendanceStats;
