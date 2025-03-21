import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Typography,
  Button,
  Tooltip,
  Chip,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { Student, CourseType } from "../../types";
import { getComponentScale, getPartMaxMarks } from "../../utils/scoreUtils";
import format from "date-fns/format";

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
}

interface DetailedScore {
  [studentId: string]: StudentDetailedScore;
}

interface CAScoreEntryComponentProps {
  students: Student[];
  componentName: string; // e.g., "CA1", "CA2", "CA3"
  courseType: CourseType;
  courseConfig?: any; // Course-specific configuration including part weights
  onScoresChange?: (scores: DetailedScore) => void;
  initialScores?: DetailedScore;
  onReconfigure?: () => void; // NEW: Added to support reconfiguration
}

type QuestionKey = "I" | "II" | "III" | "IV" | "V";

// Helper for date format
const DATE_FORMAT = "dd/MM/yyyy";

const CAScoreEntryComponent: React.FC<CAScoreEntryComponentProps> = ({
  students,
  componentName,
  courseType,
  courseConfig,
  onScoresChange,
  initialScores,
  onReconfigure,
}) => {
  // State for all scores (by student ID)
  const [scores, setScores] = useState<DetailedScore>({});

  // State for test date (shared across all students for this component)
  const [testDate, setTestDate] = useState<string>(
    format(new Date(), DATE_FORMAT)
  );

  // State to track if the component has been initialized with data
  const [initialized, setInitialized] = useState<boolean>(false);

  // Initialize scores from props or create empty structure
  useEffect(() => {
    if (initialScores) {
      console.log(
        `Receiving initialScores for ${componentName}:`,
        initialScores
      );
      setScores(initialScores);

      // If scores exist, check for a test date
      const firstStudentKey = Object.keys(initialScores)[0];
      if (firstStudentKey && initialScores[firstStudentKey]?.testDate) {
        setTestDate(
          initialScores[firstStudentKey].testDate ||
            format(new Date(), DATE_FORMAT)
        );
      }

      setInitialized(true);
    } else {
      // Initialize empty scores when no initial data is provided
      console.log(
        `No initialScores for ${componentName}, initializing empty scores`
      );
      const emptyScores: DetailedScore = {};

      students.forEach((student) => {
        if (student._id) {
          emptyScores[student._id] = {
            I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            outOf50: 0,
            outOf20: 0,
            testDate: format(new Date(), DATE_FORMAT),
          };
        }
      });

      setScores(emptyScores);
      setInitialized(true);
    }
  }, [initialScores, students, componentName]);

  // Update test date across all student scores
  useEffect(() => {
    if (!initialized) return;

    setScores((prev) => {
      const updated = { ...prev };

      Object.keys(updated).forEach((studentId) => {
        if (updated[studentId]) {
          updated[studentId] = {
            ...updated[studentId],
            testDate: testDate,
          };
        }
      });

      return updated;
    });
  }, [testDate, initialized]);

  // Effect to notify parent of changes
  useEffect(() => {
    if (initialized && onScoresChange) {
      console.log(`Notifying parent of score changes in ${componentName}`);
      onScoresChange(scores);
    }
  }, [scores, onScoresChange, initialized, componentName]);

  // Handle score change for a specific question part
  const handleScoreChange = (
    studentId: string,
    questionNumber: string,
    part: string,
    value: string
  ) => {
    const numValue = Number(value);
    console.log(
      `Changing ${componentName} score: student=${studentId}, Q${questionNumber}${part}=${value}`
    );

    setScores((prev) => {
      const updatedScores = { ...prev };

      // Ensure student object exists
      if (!updatedScores[studentId]) {
        console.log(`Creating new score object for student ${studentId}`);
        updatedScores[studentId] = {
          I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
          II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
          III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
          IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
          V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
          outOf50: 0,
          outOf20: 0,
          testDate: testDate,
        };
      }

      const studentScore = updatedScores[studentId];
      const questionKey = questionNumber as QuestionKey;
      const questionScores = studentScore[questionKey] as QuestionPartScores;

      // Update the specific part
      (questionScores as any)[part] = isNaN(numValue) ? 0 : numValue;

      // Recalculate total for this question
      questionScores.total =
        questionScores.a +
        questionScores.b +
        questionScores.c +
        questionScores.d;

      // Recalculate total out of 50
      studentScore.outOf50 =
        (studentScore.I as QuestionPartScores).total +
        (studentScore.II as QuestionPartScores).total +
        (studentScore.III as QuestionPartScores).total +
        (studentScore.IV as QuestionPartScores).total +
        (studentScore.V as QuestionPartScores).total;

      // Calculate outOf20 based on conversion factor
      try {
        const conversionFactor =
          getComponentScale(courseType, componentName, courseConfig)
            .conversionFactor || 0.4;

        studentScore.outOf20 = Math.round(
          studentScore.outOf50 * conversionFactor
        );
      } catch (err) {
        console.warn(`Error calculating conversion for ${componentName}:`, err);
        studentScore.outOf20 = Math.round(studentScore.outOf50 * 0.4); // Default to 0.4
      }

      return updatedScores;
    });
  };

  // Handle test date change
  const handleTestDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTestDate(e.target.value);
    console.log(`Test date changed to: ${e.target.value}`);
  };

  // Get max marks for a specific part
  const getMaxMarks = (question: string, part: string) => {
    try {
      return getPartMaxMarks(
        courseType,
        componentName,
        question,
        part,
        courseConfig
      );
    } catch (err) {
      console.warn(`Error getting max marks for ${question}${part}:`, err);
      return 2.5; // Default value
    }
  };

  // Calculate the column span for the header
  const getHeaderColSpan = () => {
    // Base span: a, b, c, d columns + total column
    return 5;
  };

  // Handle click on reconfigure button
  const handleReconfigure = () => {
    if (onReconfigure) {
      onReconfigure();
    }
  };

  // Define question keys and part keys for easier iteration
  const questionKeys: QuestionKey[] = ["I", "II", "III", "IV", "V"];
  const partKeys = ["a", "b", "c", "d"];

  // Get scale information for this component
  let maxMarks = 20;
  let passingMarks = 8;

  try {
    const scale = getComponentScale(courseType, componentName);
    maxMarks = scale.maxMarks;
    passingMarks = scale.passingMarks;
  } catch (err) {
    console.warn(`Error getting scale for ${componentName}:`, err);
    // Use defaults
  }

  return (
    <Box sx={{ mt: 3 }}>
      {/* Header with test date and configuration */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6">
            {componentName} Score Entry
            <Chip
              size="small"
              label={`${maxMarks} marks`}
              color="primary"
              sx={{ ml: 1 }}
            />
            <Chip
              size="small"
              label={`Pass: ${passingMarks} marks`}
              color="secondary"
              sx={{ ml: 1 }}
            />
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Passing criteria: {passingMarks} out of {maxMarks} marks (
            {((passingMarks / maxMarks) * 100).toFixed(0)}%)
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Test Date Input */}
          <TextField
            label="Test Date"
            type="date"
            value={testDate}
            onChange={handleTestDateChange}
            size="small"
            sx={{ width: 165 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            InputLabelProps={{ shrink: true }}
          />

          {/* Reconfigure Button - Only if handler is provided */}
          {onReconfigure && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleReconfigure}
              size="small"
            >
              Reconfigure Weights
            </Button>
          )}
        </Box>
      </Box>

      {/* Score Entry Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} sx={{ width: "5%" }}>
                SNo.
              </TableCell>
              <TableCell rowSpan={2} sx={{ width: "15%" }}>
                Enrollment No.
              </TableCell>
              <TableCell rowSpan={2} sx={{ width: "20%" }}>
                Name
              </TableCell>
              <TableCell
                colSpan={getHeaderColSpan()}
                align="center"
                sx={{ backgroundColor: "#f5f5f5" }}
              >
                Question I
              </TableCell>
              <TableCell
                colSpan={getHeaderColSpan()}
                align="center"
                sx={{ backgroundColor: "#f5f5f5" }}
              >
                Question II
              </TableCell>
              <TableCell
                colSpan={getHeaderColSpan()}
                align="center"
                sx={{ backgroundColor: "#f5f5f5" }}
              >
                Question III
              </TableCell>
              <TableCell
                colSpan={getHeaderColSpan()}
                align="center"
                sx={{ backgroundColor: "#f5f5f5" }}
              >
                Question IV
              </TableCell>
              <TableCell
                colSpan={getHeaderColSpan()}
                align="center"
                sx={{ backgroundColor: "#f5f5f5" }}
              >
                Question V
              </TableCell>
              <TableCell rowSpan={2} align="center" sx={{ width: "8%" }}>
                Out_of_50
              </TableCell>
              <TableCell rowSpan={2} align="center" sx={{ width: "8%" }}>
                Out_of_{maxMarks} (pass {passingMarks})
              </TableCell>
              <TableCell rowSpan={2} align="center" sx={{ width: "10%" }}>
                Marks in Words
              </TableCell>
            </TableRow>
            <TableRow>
              {/* Parts headers for each question */}
              {questionKeys.map((question) => (
                <React.Fragment key={`parts-${question}`}>
                  {partKeys.map((part) => (
                    <TableCell
                      key={`${question}-${part}`}
                      align="center"
                      sx={{ fontWeight: "bold" }}
                    >
                      <Tooltip
                        title={`Max: ${getMaxMarks(question, part)} marks`}
                      >
                        <Box>{part}</Box>
                      </Tooltip>
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    Total
                  </TableCell>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, index) => {
              // Get this student's scores or default to zeros
              const studentScores = scores[student._id] || {
                I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                outOf50: 0,
                outOf20: 0,
                testDate: testDate,
              };

              // Function to convert a number to words
              const numberToWords = (num: number): string => {
                if (num === 0) return "ZERO";
                const digitWords = [
                  "ZERO",
                  "ONE",
                  "TWO",
                  "THREE",
                  "FOUR",
                  "FIVE",
                  "SIX",
                  "SEVEN",
                  "EIGHT",
                  "NINE",
                ];
                return String(num)
                  .split("")
                  .map((d) => digitWords[parseInt(d, 10)] || "")
                  .join(" ");
              };

              return (
                <TableRow
                  key={student._id}
                  sx={{
                    "&:hover": { backgroundColor: "#f5f5f5" },
                    // Highlight row red if failing (outOf20 < passing)
                    backgroundColor:
                      studentScores.outOf20 < passingMarks
                        ? "rgba(255, 0, 0, 0.05)"
                        : "inherit",
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{student.registrationNumber}</TableCell>
                  <TableCell>{student.name}</TableCell>

                  {/* Question parts for each question (I to V) */}
                  {questionKeys.map((questionKey) => {
                    const questionScores = studentScores[
                      questionKey
                    ] as QuestionPartScores;

                    return (
                      <React.Fragment key={`${student._id}-${questionKey}`}>
                        {/* Parts a, b, c, d for this question */}
                        {partKeys.map((part) => {
                          const maxMarksForPart = getMaxMarks(
                            questionKey,
                            part
                          );
                          const value = (questionScores as any)[part] || 0;
                          const isMaxed = value >= maxMarksForPart;

                          return (
                            <TableCell
                              key={`${student._id}-${questionKey}-${part}`}
                              align="center"
                              sx={{ p: 0.5 }}
                            >
                              <TextField
                                type="number"
                                value={value}
                                onChange={(e) =>
                                  handleScoreChange(
                                    student._id,
                                    questionKey,
                                    part,
                                    e.target.value
                                  )
                                }
                                inputProps={{
                                  min: 0,
                                  max: maxMarksForPart * 1.05, // Allow slight overage
                                  step: 0.5,
                                  style: {
                                    textAlign: "center",
                                    padding: "6px",
                                    backgroundColor: isMaxed
                                      ? "rgba(76, 175, 80, 0.1)"
                                      : "inherit",
                                  },
                                }}
                                variant="outlined"
                                size="small"
                                sx={{ width: "50px" }}
                              />
                            </TableCell>
                          );
                        })}

                        {/* Total for this question */}
                        <TableCell
                          align="center"
                          sx={{
                            backgroundColor: "#f9f9f9",
                            fontWeight: "bold",
                          }}
                        >
                          {questionScores.total}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}

                  {/* Final scores */}
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {studentScores.outOf50}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "bold",
                      color:
                        studentScores.outOf20 < passingMarks
                          ? "error.main"
                          : "success.main",
                    }}
                  >
                    {studentScores.outOf20}
                  </TableCell>
                  <TableCell align="center">
                    {numberToWords(studentScores.outOf20)}
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

export default CAScoreEntryComponent;
