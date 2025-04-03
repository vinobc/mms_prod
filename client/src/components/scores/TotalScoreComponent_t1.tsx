import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  // Button,
  Alert,
  CircularProgress,
} from "@mui/material";
// import {
// Download as DownloadIcon,
// Print as PrintIcon,
// } from "@mui/icons-material";
import { Course, Student } from "../../types";
import { scoreService } from "../../services/scoreService";
import { getComponentScale } from "../../utils/scoreUtils";

// Helper: converts a number to words (digit-by-digit) if needed
// const numberToWords = (num: number): string => {
//   const digitWords = [
//     "ZERO",
//     "ONE",
//     "TWO",
//     "THREE",
//     "FOUR",
//     "FIVE",
//     "SIX",
//     "SEVEN",
//     "EIGHT",
//     "NINE",
//   ];
//   return String(num)
//     .split("")
//     .map((d) => digitWords[parseInt(d, 10)] || "")
//     .join(" ");
// };

interface TotalScoreComponentProps {
  course: Course;
  students: Student[];
  passingThreshold?: number;
}

const TotalScoreComponent: React.FC<TotalScoreComponentProps> = ({
  course,
  students,
  passingThreshold = 40, // This threshold is the overall threshold
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawScores, setRawScores] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!course || students.length === 0) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const scores = await scoreService.getScoresByCourse(course._id);
        setRawScores(scores);
      } catch (err) {
        console.error("Error fetching scores:", err);
        setError("Failed to load scores");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [course, students]);

  // Format number (remove trailing .0)
  const formatNumber = (num: number) => num.toFixed(1).replace(/\.0$/, "");

  // Retrieve a student's raw score for a given component
  const getComponentScore = (
    studentId: string,
    componentName: string
  ): number => {
    const studentScore = rawScores.find((score) => {
      const scoreStudentId =
        typeof score.studentId === "string"
          ? score.studentId
          : score.studentId._id;
      return scoreStudentId === studentId;
    });
    if (!studentScore || !studentScore.scores) return 0;
    const componentScore = studentScore.scores.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => s.componentName === componentName
    );
    return componentScore ? Number(componentScore.obtainedMarks) : 0;
  };

  // Calculate the scaled score for a given component based on course type.
  // (For example, a raw CA1 might be converted to a score out of 40 for PG.)
  const calculateScaledScore = (
    studentId: string,
    componentName: string
  ): number => {
    const raw = getComponentScore(studentId, componentName);
    const scale = getComponentScale(course.type, componentName);
    // Multiply raw score by conversionFactor (if defined)
    return Math.round(raw * (scale.conversionFactor || 1));
  };

  // Calculate total scaled score for a student (sum of each component's scaled score)
  const calculateTotal = (studentId: string): number => {
    const components = Object.keys(course.evaluationScheme || {});
    let total = 0;
    components.forEach((comp) => {
      total += calculateScaledScore(studentId, comp);
    });
    return total;
  };

  // Additional lab passing check for specific course types.
  // For "ug-integrated", "pg-integrated", "ug lab only", "pg lab only" courses,
  // the LAB component must be at least 50% of its maximum.
  const isLabPassing = (studentId: string): boolean => {
    const labRaw = getComponentScore(studentId, "LAB");
    const labScale = getComponentScale(course.type, "LAB");
    // Convert lab raw score using conversionFactor if available.
    const labScaled = Math.round(labRaw * (labScale.conversionFactor || 1));
    return labScaled >= 0.5 * labScale.maxMarks;
  };

  // Determine if student is passing.
  // In addition to the overall total being above the passing threshold,
  // if the course type requires it, the LAB score must be at least 50%.
  const isStudentPassing = (studentId: string): boolean => {
    const totalPass = calculateTotal(studentId) >= passingThreshold;
    // Define course types that have the lab constraint (case-insensitive)
    const labConstraintTypes = [
      "ug-integrated",
      "pg-integrated",
      "ug lab only",
      "pg lab only",
    ];
    const courseTypeLower = course.type.toLowerCase();
    if (labConstraintTypes.includes(courseTypeLower)) {
      return totalPass && isLabPassing(studentId);
    }
    return totalPass;
  };

  // Handle printing
  // const handlePrint = () => {
  //   window.print();
  // };

  // Handle CSV export for total scores
  // const handleExportCsv = () => {
  //   if (!course || students.length === 0) return;

  //   const components = Object.keys(course.evaluationScheme || {});

  //   // Build header row with course-specific scale details for each component
  //   const headers = [
  //     "SNo.",
  //     "Academic_Year",
  //     "Program",
  //     "Enrollment No.",
  //     "Name",
  //     "Semester",
  //   ];
  //   components.forEach((comp) => {
  //     const scale = getComponentScale(course.type, comp);
  //     headers.push(
  //       `${comp} (Out of ${scale.maxMarks}, Pass ${scale.passingMarks})`
  //     );
  //   });
  //   headers.push("TOTAL", "Status");

  //   // Build data rows
  //   const rows = students.map((student, index) => {
  //     const row: (string | number)[] = [
  //       index + 1,
  //       student.academicYear,
  //       student.program,
  //       student.registrationNumber,
  //       student.name,
  //       student.semester,
  //     ];
  //     components.forEach((comp) => {
  //       const scaled = calculateScaledScore(student._id, comp);
  //       row.push(scaled);
  //     });
  //     const total = calculateTotal(student._id);
  //     row.push(total, isStudentPassing(student._id) ? "PASS" : "FAIL");
  //     return row;
  //   });

  //   // Prepend course info at the very top
  //   const csvRows: string[] = [];
  //   csvRows.push(`Course Code: ${course.code}, Course Name: ${course.name}`);
  //   csvRows.push(""); // empty row
  //   csvRows.push(headers.join(","));
  //   rows.forEach((row) => {
  //     csvRows.push(row.join(","));
  //   });
  //   const csvContent = csvRows.join("\n");

  //   const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  //   const url = URL.createObjectURL(blob);
  //   const link = document.createElement("a");
  //   link.href = url;
  //   link.setAttribute("download", `${course.code}_scores.csv`);
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const components = Object.keys(course.evaluationScheme || {});

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">
          Total Course Scores (Pass: {passingThreshold})
        </Typography>
        <Box>
          {/* <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            sx={{ mr: 1 }}
            onClick={handlePrint}
          >
            Print
          </Button> */}
          {/* <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button> */}
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>SNo.</TableCell>
              <TableCell>Academic_Year</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Enrollment No.</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Semester</TableCell>
              {components.map((comp) => {
                const scale = getComponentScale(course.type, comp);
                return (
                  <TableCell key={comp} align="center">
                    {comp} (Out of {scale.maxMarks}, Pass {scale.passingMarks})
                  </TableCell>
                );
              })}
              <TableCell align="center">TOTAL</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, index) => {
              const total = calculateTotal(student._id);
              const passing = isStudentPassing(student._id);
              return (
                <TableRow key={student._id} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{student.academicYear}</TableCell>
                  <TableCell>{student.program}</TableCell>
                  <TableCell>{student.registrationNumber}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.semester}</TableCell>
                  {components.map((comp) => (
                    <TableCell key={comp} align="center">
                      {formatNumber(calculateScaledScore(student._id, comp))}
                    </TableCell>
                  ))}
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "bold",
                      color: passing ? "success.main" : "error.main",
                    }}
                  >
                    {formatNumber(total)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={passing ? "PASS" : "FAIL"}
                      color={passing ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TotalScoreComponent;
