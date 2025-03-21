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
  Chip,
  Button,
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
  testDate?: string;
  [key: string]: QuestionPartScores | number | string | undefined;
}

interface DetailedScore {
  [studentId: string]: StudentDetailedScore;
}

interface CAScoreEntryComponentProps {
  students: Student[];
  componentName: string;
  courseType: CourseType;
  courseConfig?: any;
  onScoresChange: (scores: DetailedScore) => void;
  initialScores?: DetailedScore;
  onReconfigure?: () => void;
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
  courseConfig,
  onScoresChange,
  initialScores = {},
  onReconfigure,
}) => {
  // Get date from first student's score or use current date
  const getInitialDate = (): Date => {
    if (initialScores) {
      for (const studentId in initialScores) {
        const studentScore = initialScores[studentId];
        if (studentScore?.testDate) {
          try {
            if (studentScore.testDate.includes("/")) {
              return parse(studentScore.testDate, DATE_FORMAT, new Date());
            } else {
              return new Date(studentScore.testDate);
            }
          } catch (err) {
            console.error(`Error parsing date for ${componentName}:`, err);
          }
        }
      }
    }
    return new Date();
  };

  const [testDate, setTestDate] = useState<Date | null>(getInitialDate());
  const [scores, setScores] = useState<DetailedScore>(initialScores);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [totalOverflow, setTotalOverflow] = useState<boolean>(false);

  // Use course-specific configuration if available
  const scaleConfig = getComponentScale(
    courseType,
    componentName,
    courseConfig
  );
  const maxMarks = scaleConfig.maxMarks;
  const passingMarks = scaleConfig.passingMarks;
  const partWeights = scaleConfig.partWeights || {
    Ia: 2.5,
    Ib: 2.5,
    Ic: 2.5,
    Id: 2.5,
    IIa: 2.5,
    IIb: 2.5,
    IIc: 2.5,
    IId: 2.5,
    IIIa: 2.5,
    IIIb: 2.5,
    IIIc: 2.5,
    IIId: 2.5,
    IVa: 2.5,
    IVb: 2.5,
    IVc: 2.5,
    IVd: 2.5,
    Va: 2.5,
    Vb: 2.5,
    Vc: 2.5,
    Vd: 2.5,
  };

  useEffect(() => {
    // If we have initial scores, use them; otherwise create new ones
    if (initialScores && Object.keys(initialScores).length > 0) {
      // We have scores for this specific component - use them
      const formattedScores: DetailedScore = {};

      Object.keys(initialScores).forEach((studentId) => {
        const studentScore = initialScores[studentId];

        // Get the test date for this specific component
        // If not found, generate one based on initial date calculation
        const componentTestDate =
          studentScore.testDate || format(getInitialDate(), DATE_FORMAT);

        formattedScores[studentId] = {
          I: studentScore.I || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          II: studentScore.II || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          III: studentScore.III || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          IV: studentScore.IV || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          V: studentScore.V || { a: 0, b: 0, c: 0, d: 0, total: 0 },
          outOf50: studentScore.outOf50 || 0,
          outOf20: studentScore.outOf20 || 0,
          testDate: componentTestDate, // Use component-specific date
        };
      });

      setScores(formattedScores);
      // Also set the test date state for the date picker
      const firstStudent = Object.values(initialScores)[0];
      if (firstStudent?.testDate) {
        try {
          if (firstStudent.testDate.includes("/")) {
            setTestDate(parse(firstStudent.testDate, DATE_FORMAT, new Date()));
          } else {
            setTestDate(new Date(firstStudent.testDate));
          }
        } catch (err) {
          console.error("Error setting date from initial scores:", err);
          setTestDate(new Date());
        }
      }
    } else {
      // Create new scores for all students with today's date
      const newScores: DetailedScore = {};
      const today = format(new Date(), DATE_FORMAT);

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
            testDate: today,
          };
        }
      });

      setScores(newScores);
    }
  }, [students, initialScores, componentName]);

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

      // NEW: Validate against configured weight for this part
      const partKey = `${question}${part}` as keyof typeof partWeights;
      const maxPartMarks = partWeights[partKey] || 0;

      // Don't allow scores higher than the configured weight for this part
      if (numValue > maxPartMarks) {
        setError(`Maximum marks for ${question}${part} is ${maxPartMarks}`);
        return;
      }

      // Skip update if weight is zero
      if (maxPartMarks === 0) {
        setError(
          `Part ${question}${part} has zero weight and cannot be edited`
        );
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

        // Calculate total directly based on the entered scores
        let directTotal = 0;
        const questions = ["I", "II", "III", "IV", "V"] as const;
        const parts = ["a", "b", "c", "d"] as const;

        questions.forEach((q) => {
          parts.forEach((p) => {
            const questionPartScore = (
              newScores[studentId][q] as QuestionPartScores
            )[p];
            directTotal += questionPartScore;
          });
        });

        // Check if total is greater than 50 (warning only, don't prevent input)
        setTotalOverflow(directTotal > 50);
        if (directTotal > 50) {
          setWarning(`Warning: Total marks entered (${directTotal}) exceed 50`);
        } else {
          setWarning(null);
        }

        // Calculate weighted total based on configured part weights
        let weightedTotal = 0;
        questions.forEach((q) => {
          parts.forEach((p) => {
            const questionPartScore = (
              newScores[studentId][q] as QuestionPartScores
            )[p];
            const partKey = `${q}${p}` as keyof typeof partWeights;
            const maxPartMarks = partWeights[partKey] || 0;

            // Calculate percentage of possible marks and apply weight
            if (maxPartMarks > 0) {
              weightedTotal += questionPartScore;
            }
          });
        });

        // Ensure weightedTotal doesn't exceed 50
        newScores[studentId].outOf50 = Math.min(weightedTotal, 50);

        // Convert to outOf20 using the course type and component
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

  // Get the configured weight for a specific part
  const getPartWeight = (question: string, part: string): number => {
    const key = `${question}${part}` as keyof typeof partWeights;
    return partWeights[key] || 0; // Default to 0 if not found
  };

  const handleReconfigure = () => {
    if (onReconfigure) {
      if (
        window.confirm(
          "Reconfiguring will reset all existing scores to zero. Are you sure you want to continue?"
        )
      ) {
        onReconfigure();
      }
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">{componentName} Score Entry</Typography>
        </Grid>
        <Grid
          item
          xs={12}
          sm={6}
          sx={{ display: "flex", justifyContent: "space-between" }}
        >
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Test Date"
              value={testDate}
              onChange={handleDateChange}
              format={DATE_FORMAT}
            />
          </LocalizationProvider>

          {/* NEW: Button to reconfigure weights */}
          {onReconfigure && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleReconfigure}
            >
              Reconfigure Weights
            </Button>
          )}
        </Grid>
      </Grid>

      {/* Display the configured weights */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: "background.default" }}>
        <Typography variant="subtitle1" gutterBottom>
          Configured Question Weights:
        </Typography>
        <Grid container spacing={2}>
          {["I", "II", "III", "IV", "V"].map((question) => (
            <Grid item key={question} xs={12} sm={2.4}>
              <Typography variant="subtitle2">Question {question}:</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {["a", "b", "c", "d"].map((part) => {
                  const weight = getPartWeight(question, part);
                  return (
                    <Chip
                      key={`${question}${part}`}
                      label={`${part}: ${weight}`}
                      size="small"
                      color={weight === 0 ? "default" : "primary"}
                      variant="outlined"
                      sx={{
                        opacity: weight === 0 ? 0.6 : 1,
                      }}
                    />
                  );
                })}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {warning && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          onClose={() => setWarning(null)}
        >
          {warning}
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

                          {/* Each part shows its weight in the label and limits input */}
                          {["a", "b", "c", "d"].map((partLetter) => {
                            const part = partLetter as "a" | "b" | "c" | "d";
                            const partWeight = getPartWeight(questionNo, part);
                            const isZeroWeight = partWeight === 0;

                            return (
                              <TableCell
                                align="center"
                                key={`${questionNo}${part}`}
                              >
                                <TextField
                                  type="number"
                                  value={
                                    (
                                      studentScore[
                                        questionNo
                                      ] as QuestionPartScores
                                    )?.[part] || 0
                                  }
                                  onChange={(e) =>
                                    handleScoreChange(
                                      student._id,
                                      questionNo,
                                      part,
                                      Number(e.target.value)
                                    )
                                  }
                                  inputProps={{
                                    min: 0,
                                    max: partWeight, // Limit to configured weight
                                    step: 0.5,
                                    style: {
                                      textAlign: "center",
                                      // Gray out zero-weight fields
                                      color: isZeroWeight
                                        ? "#888888"
                                        : "inherit",
                                    },
                                  }}
                                  size="small"
                                  sx={{
                                    width: 60,
                                    // Visually indicate zero-weight fields
                                    backgroundColor: isZeroWeight
                                      ? "#f8f8f8"
                                      : "inherit",
                                  }}
                                  label={`${partWeight}`} // Show actual weight (0)
                                  disabled={isZeroWeight} // Disable if weight is zero
                                  error={
                                    (
                                      studentScore[
                                        questionNo
                                      ] as QuestionPartScores
                                    )[part] > partWeight
                                  }
                                  helperText={
                                    (
                                      studentScore[
                                        questionNo
                                      ] as QuestionPartScores
                                    )[part] > partWeight
                                      ? "Max!"
                                      : ""
                                  }
                                />
                              </TableCell>
                            );
                          })}

                          <TableCell align="center">
                            {(studentScore[questionNo] as QuestionPartScores)
                              ?.total || 0}
                          </TableCell>

                          {/* Show totals on the FIRST row for each student instead of last row */}
                          {questionIndex === 0 && (
                            <>
                              <TableCell
                                align="center"
                                rowSpan={5}
                                sx={{
                                  color: totalOverflow
                                    ? "warning.main"
                                    : "text.primary",
                                }}
                              >
                                {(studentScore.outOf50 as number).toFixed(1)}
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
