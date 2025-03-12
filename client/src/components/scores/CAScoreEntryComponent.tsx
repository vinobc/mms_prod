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
  TextField,
  Typography,
  Grid,
  Alert,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Student } from "../../types";
import { CourseType } from "../../types";
import { getComponentScale, convertCAScore } from "../../utils/scoreUtils";
import ErrorBoundary from "./ErrorBoundary";
import format from "date-fns/format";
import parse from "date-fns/parse";

interface QuestionPartScores {
  a: number;
  b: number;
  c: number;
  d: number;
  total: number;
}

interface StudentDetailedScore {
  I: QuestionPartScores;
  II: QuestionPartScores;
  III: QuestionPartScores;
  IV: QuestionPartScores;
  V: QuestionPartScores;
  outOf50: number;
  outOf20: number;
  testDate?: string; // Add testDate to store the date
  [key: string]: QuestionPartScores | number | string | undefined; // Add string type for testDate
}

interface DetailedScore {
  [studentId: string]: StudentDetailedScore;
}

interface CAScoreEntryComponentProps {
  students: Student[];
  componentName: string;
  courseType: CourseType;
  onScoresChange: (scores: DetailedScore) => void;
  initialScores?: DetailedScore;
}

const numberToWords = (num: number): string => {
  const numStr = num.toString();
  const digits = numStr.split("");
  const words = digits.map((digit) => {
    switch (digit) {
      case "0":
        return "ZERO";
      case "1":
        return "ONE";
      case "2":
        return "TWO";
      case "3":
        return "THREE";
      case "4":
        return "FOUR";
      case "5":
        return "FIVE";
      case "6":
        return "SIX";
      case "7":
        return "SEVEN";
      case "8":
        return "EIGHT";
      case "9":
        return "NINE";
      default:
        return "";
    }
  });
  return words.join(" ");
};

// Format for displaying dates (dd/mm/yyyy)
const DATE_FORMAT = "dd/MM/yyyy";

export const CAScoreEntryComponent: React.FC<CAScoreEntryComponentProps> = ({
  students,
  componentName,
  courseType,
  onScoresChange,
  initialScores = {},
}) => {
  // Get date from first student's score or use current date
  const getInitialDate = (): Date => {
    if (initialScores) {
      // Try to find any student with a testDate
      for (const studentId in initialScores) {
        const studentScore = initialScores[studentId];
        if (studentScore?.testDate) {
          try {
            // Parse the stored date (could be in various formats)
            if (studentScore.testDate.includes("/")) {
              // If it's already in dd/mm/yyyy format
              return parse(studentScore.testDate, DATE_FORMAT, new Date());
            } else {
              // If it's in ISO format or another format, try direct parsing
              return new Date(studentScore.testDate);
            }
          } catch (err) {
            console.error("Error parsing stored date:", err);
          }
        }
      }
    }
    return new Date(); // Default to current date if no stored date found
  };

  const [testDate, setTestDate] = useState<Date | null>(getInitialDate());
  const [scores, setScores] = useState<DetailedScore>(initialScores);
  const [error, setError] = useState<string | null>(null);

  const scaleConfig = getComponentScale(courseType, componentName);
  const maxMarks = scaleConfig.maxMarks;
  const passingMarks = scaleConfig.passingMarks;

  useEffect(() => {
    if (initialScores && Object.keys(initialScores).length > 0) {
      const formattedScores: DetailedScore = {};
      Object.keys(initialScores).forEach((studentId) => {
        const studentScore = initialScores[studentId];
        formattedScores[studentId] = {
          I: studentScore.I || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          II: studentScore.II || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          III: studentScore.III || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          IV: studentScore.IV || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          V: studentScore.V || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          outOf50: studentScore.outOf50 || 0,
          outOf20: studentScore.outOf20 || 0,
          testDate:
            studentScore.testDate || format(getInitialDate(), DATE_FORMAT),
        };
      });
      setScores(formattedScores);
    } else {
      const newScores: DetailedScore = {};
      (students || []).forEach((student) => {
        if (student && student._id) {
          newScores[student._id] = {
            I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            outOf50: 0,
            outOf20: 0,
            testDate: format(getInitialDate(), DATE_FORMAT),
          };
        }
      });
      setScores(newScores);
    }
  }, [students, initialScores]);

  // Update test date for all students when the date changes
  const handleDateChange = (newDate: Date | null) => {
    if (!newDate) return;

    const formattedDate = format(newDate, DATE_FORMAT);

    setTestDate(newDate);
    setScores((prev) => {
      const updatedScores = { ...prev };
      // Update testDate for all students
      Object.keys(updatedScores).forEach((studentId) => {
        updatedScores[studentId] = {
          ...updatedScores[studentId],
          testDate: formattedDate,
        };
      });

      // Notify parent component of the changes
      onScoresChange(updatedScores);

      return updatedScores;
    });
  };

  const handleScoreChange = (
    studentId: string,
    question: "I" | "II" | "III" | "IV" | "V",
    part: "a" | "b" | "c" | "d",
    value: number
  ) => {
    if (!studentId) {
      console.error("Missing studentId in handleScoreChange");
      return;
    }
    try {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        setError("Please enter a valid positive number");
        return;
      }

      // Use a deep clone to avoid potential state mutation issues
      setScores((prev) => {
        // Create a deep copy of the previous state
        const newScores = JSON.parse(JSON.stringify(prev)) as DetailedScore;

        // Ensure student entry exists
        if (!newScores[studentId]) {
          newScores[studentId] = {
            I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            outOf50: 0,
            outOf20: 0,
            testDate: testDate
              ? format(testDate, DATE_FORMAT)
              : format(new Date(), DATE_FORMAT),
          };
        }

        // Access the question object with the right type
        const questionObj = newScores[studentId][
          question
        ] as QuestionPartScores;
        if (!questionObj) {
          newScores[studentId][question] = { a: 0, b: 0, c: 0, d: 0, total: 0 };
        }

        // Update the specific part
        (newScores[studentId][question] as QuestionPartScores)[part] = numValue;

        // Recalculate question total
        (newScores[studentId][question] as QuestionPartScores).total =
          (newScores[studentId][question] as QuestionPartScores).a +
          (newScores[studentId][question] as QuestionPartScores).b +
          (newScores[studentId][question] as QuestionPartScores).c +
          (newScores[studentId][question] as QuestionPartScores).d;

        // Update the total scores
        newScores[studentId].outOf50 =
          (newScores[studentId].I as QuestionPartScores).total +
          (newScores[studentId].II as QuestionPartScores).total +
          (newScores[studentId].III as QuestionPartScores).total +
          (newScores[studentId].IV as QuestionPartScores).total +
          (newScores[studentId].V as QuestionPartScores).total;

        newScores[studentId].outOf20 = convertCAScore(
          newScores[studentId].outOf50 as number,
          courseType,
          componentName
        );

        onScoresChange(newScores);
        return newScores;
      });

      setError(null);
    } catch (err) {
      console.error("Error updating score:", err);
      setError("Failed to update score");
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">{componentName} Score Entry</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Test Date"
              value={testDate}
              onChange={handleDateChange}
              format={DATE_FORMAT}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <TableContainer
        component={Paper}
        sx={{ overflowX: "auto", width: "100%" }}
      >
        <Table size="small" sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell>SNo.</TableCell>
              <TableCell>Academic_Year</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Enrollment No.</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Semester</TableCell>
              <TableCell>Q.No.</TableCell>
              <TableCell align="center">a</TableCell>
              <TableCell align="center">b</TableCell>
              <TableCell align="center">c</TableCell>
              <TableCell align="center">d</TableCell>
              <TableCell align="center">Total</TableCell>
              <TableCell align="center">Out_of_50</TableCell>
              <TableCell align="center">
                Out_of_{maxMarks} (pass {passingMarks})
              </TableCell>
              <TableCell>Marks in Words</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(students || []).map((student, studentIndex) => {
              if (!student || !student._id) return null;

              // Create React Fragment to group all rows for this student
              return (
                <React.Fragment key={`student-${student._id}`}>
                  {(["I", "II", "III", "IV", "V"] as const).map(
                    (questionNo, questionIndex) => {
                      // Ensure student has a score entry
                      const studentScore = scores[student._id] || {
                        I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                        II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                        III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                        IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                        V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                        outOf50: 0,
                        outOf20: 0,
                        testDate: testDate
                          ? format(testDate, DATE_FORMAT)
                          : format(new Date(), DATE_FORMAT),
                      };

                      const scaledScore = studentScore.outOf20 as number;
                      const isPassing = scaledScore >= passingMarks;

                      return (
                        <TableRow key={`${student._id}-${questionNo}`}>
                          {questionIndex === 0 && (
                            <>
                              <TableCell rowSpan={5}>
                                {studentIndex + 1}
                              </TableCell>
                              <TableCell rowSpan={5}>
                                {student.academicYear}
                              </TableCell>
                              <TableCell rowSpan={5}>
                                {student.program}
                              </TableCell>
                              <TableCell rowSpan={5}>
                                {student.registrationNumber}
                              </TableCell>
                              <TableCell rowSpan={5}>{student.name}</TableCell>
                              <TableCell rowSpan={5}>
                                {student.semester}
                              </TableCell>
                            </>
                          )}
                          <TableCell>{questionNo}</TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              value={
                                (studentScore[questionNo] as QuestionPartScores)
                                  ?.a || 0
                              }
                              onChange={(e) =>
                                handleScoreChange(
                                  student._id,
                                  questionNo,
                                  "a",
                                  Number(e.target.value)
                                )
                              }
                              inputProps={{
                                min: 0,
                                style: { textAlign: "center" },
                              }}
                              size="small"
                              sx={{ width: 60 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              value={
                                (studentScore[questionNo] as QuestionPartScores)
                                  ?.b || 0
                              }
                              onChange={(e) =>
                                handleScoreChange(
                                  student._id,
                                  questionNo,
                                  "b",
                                  Number(e.target.value)
                                )
                              }
                              inputProps={{
                                min: 0,
                                style: { textAlign: "center" },
                              }}
                              size="small"
                              sx={{ width: 60 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              value={
                                (studentScore[questionNo] as QuestionPartScores)
                                  ?.c || 0
                              }
                              onChange={(e) =>
                                handleScoreChange(
                                  student._id,
                                  questionNo,
                                  "c",
                                  Number(e.target.value)
                                )
                              }
                              inputProps={{
                                min: 0,
                                style: { textAlign: "center" },
                              }}
                              size="small"
                              sx={{ width: 60 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              value={
                                (studentScore[questionNo] as QuestionPartScores)
                                  ?.d || 0
                              }
                              onChange={(e) =>
                                handleScoreChange(
                                  student._id,
                                  questionNo,
                                  "d",
                                  Number(e.target.value)
                                )
                              }
                              inputProps={{
                                min: 0,
                                style: { textAlign: "center" },
                              }}
                              size="small"
                              sx={{ width: 60 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {(studentScore[questionNo] as QuestionPartScores)
                              ?.total || 0}
                          </TableCell>

                          {/* Show totals on the FIRST row for each student instead of last row */}
                          {questionIndex === 0 && (
                            <>
                              <TableCell align="center" rowSpan={5}>
                                {studentScore.outOf50}
                              </TableCell>
                              <TableCell
                                align="center"
                                rowSpan={5}
                                sx={{
                                  color: isPassing
                                    ? "success.main"
                                    : "error.main",
                                  fontWeight: "bold",
                                }}
                              >
                                {scaledScore}
                              </TableCell>
                              <TableCell rowSpan={5}>
                                {numberToWords(scaledScore)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    }
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Wrap the component with ErrorBoundary at export
const WrappedCAScoreEntryComponent: React.FC<CAScoreEntryComponentProps> = (
  props
) => (
  <ErrorBoundary
    fallback={
      <Paper
        elevation={3}
        sx={{
          p: 3,
          m: 2,
          backgroundColor: "#fff8f8",
          borderLeft: "4px solid #f44336",
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          Something went wrong
        </Typography>
        <Typography variant="body1" paragraph>
          There was an error in the CA Score Entry component.
        </Typography>
      </Paper>
    }
  >
    <CAScoreEntryComponent {...props} />
  </ErrorBoundary>
);

export default WrappedCAScoreEntryComponent;
