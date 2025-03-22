import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { debounce } from "lodash";
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
  Warning as WarningIcon,
} from "@mui/icons-material";
import { Student, CourseType } from "../../types";
import {
  getComponentScale,
  getPartMaxMarks,
  validateCAScores,
} from "../../utils/scoreUtils";
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

// Date format constants
const ISO_DATE_FORMAT = "yyyy-MM-dd";
const DISPLAY_DATE_FORMAT = "dd/MM/yyyy";

// Format date for display and storage
const formatDateForDisplay = (date: string | undefined): string => {
  if (!date) return format(new Date(), ISO_DATE_FORMAT);

  try {
    // If it's already in DISPLAY_DATE_FORMAT, convert to ISO
    if (date.includes("/")) {
      const [day, month, year] = date.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    // Otherwise, assume it's already in ISO format
    return date;
  } catch (err) {
    console.error("Error formatting date:", err);
    return format(new Date(), ISO_DATE_FORMAT);
  }
};

const formatDateForStorage = (date: string): string => {
  if (!date) return format(new Date(), DISPLAY_DATE_FORMAT);

  try {
    // Handle ISO format
    if (date.includes("-")) {
      const [year, month, day] = date.split("-");
      return `${day}/${month}/${year}`;
    }
    // Otherwise assume it's already in display format
    return date;
  } catch (err) {
    console.error("Error formatting date for storage:", err);
    return format(new Date(), DISPLAY_DATE_FORMAT);
  }
};

// Create a serializer for deep comparison
const serializeScores = (scores: DetailedScore): string => {
  return JSON.stringify(scores, (key, value) => {
    // Skip the testDate in serialization since it doesn't affect scoring logic
    if (key === "testDate") return undefined;
    return value;
  });
};

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

  // Previous scores ref to prevent unnecessary updates
  const prevSerializedScoresRef = React.useRef<string | null>(null);

  // State for test date (shared across all students for this component)
  const [testDate, setTestDate] = useState<string>(
    format(new Date(), ISO_DATE_FORMAT)
  );

  // State to track if the component has been initialized with data
  const [initialized, setInitialized] = useState<boolean>(false);

  // Create a stable debounced version of the score change handler
  const debouncedOnScoresChange = useCallback(
    debounce((updatedScores: DetailedScore) => {
      if (!onScoresChange) return;

      // Serialize for deep comparison
      const serializedScores = serializeScores(updatedScores);

      // Skip update if nothing changed in the scores (except dates)
      if (serializedScores === prevSerializedScoresRef.current) return;

      // Store serialized version for future comparison
      prevSerializedScoresRef.current = serializedScores;

      console.log(`Notifying parent of score changes in ${componentName}`);
      onScoresChange(updatedScores);
    }, 500),
    [onScoresChange, componentName]
  );

  // Initialize scores from props or create empty structure
  useEffect(() => {
    if (!initialized && initialScores) {
      console.log(`Receiving initialScores for ${componentName}`);

      // Create a deep copy with validated totals
      const validatedScores: DetailedScore = {};

      Object.keys(initialScores).forEach((studentId) => {
        const studentScore = initialScores[studentId];

        // Apply validation to ensure outOf50 is capped at 50
        validatedScores[studentId] = {
          ...studentScore,
          outOf50: Math.min(studentScore.outOf50, 50),
        };

        // Recalculate outOf20 based on validated outOf50
        try {
          const conversionFactor =
            getComponentScale(courseType, componentName, courseConfig)
              .conversionFactor || 0.4;
          validatedScores[studentId].outOf20 = Math.round(
            validatedScores[studentId].outOf50 * conversionFactor
          );
        } catch (err) {
          console.warn(
            `Error calculating conversion for ${componentName}:`,
            err
          );
          validatedScores[studentId].outOf20 = Math.round(
            validatedScores[studentId].outOf50 * 0.4
          );
        }
      });

      // Set the initial serialized scores for comparison
      prevSerializedScoresRef.current = serializeScores(validatedScores);

      setScores(validatedScores);

      // If scores exist, check for a test date
      const firstStudentKey = Object.keys(initialScores)[0];
      if (firstStudentKey && initialScores[firstStudentKey]?.testDate) {
        const dateString = initialScores[firstStudentKey].testDate || "";
        setTestDate(formatDateForDisplay(dateString));
      }

      setInitialized(true);
    } else if (!initialized) {
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
            testDate: formatDateForStorage(format(new Date(), ISO_DATE_FORMAT)),
          };
        }
      });

      prevSerializedScoresRef.current = serializeScores(emptyScores);
      setScores(emptyScores);
      setInitialized(true);
    }
  }, [
    initialScores,
    students,
    componentName,
    courseType,
    courseConfig,
    initialized,
  ]);

  // Update test date across all student scores
  useEffect(() => {
    if (!initialized) return;

    const storedDate = formatDateForStorage(testDate);

    // Check if any student score already has this date to avoid unnecessary updates
    let needsUpdate = false;
    const studentIds = Object.keys(scores);

    if (studentIds.length > 0) {
      const existingDate = scores[studentIds[0]]?.testDate;
      if (existingDate !== storedDate) {
        needsUpdate = true;
      }
    }

    if (!needsUpdate) return;

    setScores((prev) => {
      // Create a new object to trigger a proper re-render
      const updated = { ...prev };

      Object.keys(updated).forEach((studentId) => {
        if (updated[studentId]) {
          updated[studentId] = {
            ...updated[studentId],
            testDate: storedDate,
          };
        }
      });

      return updated;
    });
  }, [testDate, initialized]);

  // Effect to notify parent of changes
  useEffect(() => {
    if (initialized && Object.keys(scores).length > 0) {
      debouncedOnScoresChange(scores);
    }

    // Cleanup function to cancel any pending debounced calls
    return () => {
      debouncedOnScoresChange.cancel();
    };
  }, [scores, debouncedOnScoresChange, initialized, testDate]);

  // Handle score change for a specific question part
  const handleScoreChange = useCallback(
    (
      studentId: string,
      questionNumber: string,
      part: string,
      value: string
    ) => {
      const numValue = Number(value);

      // Get max marks for this specific question part
      const maxMarksForPart = getMaxMarks(
        questionNumber,
        part,
        courseType,
        componentName,
        courseConfig
      );

      // Skip updates for zero-weighted parts
      if (maxMarksForPart <= 0) {
        console.log(
          `Skipping update for zero-weighted part ${questionNumber}${part}`
        );
        return;
      }

      // Cap the value at the maximum allowed for this part
      const validatedValue = Math.min(
        isNaN(numValue) ? 0 : Math.max(0, numValue),
        maxMarksForPart
      );

      setScores((prev) => {
        // First check if there's an actual change
        const prevScore = prev[studentId];
        const currentPartValue =
          (prevScore?.[questionNumber as QuestionKey] as any)?.[part] || 0;

        if (currentPartValue === validatedValue) {
          // No change, return previous state to prevent unnecessary updates
          return prev;
        }

        // Create new state copies for immutability
        const updatedScores = { ...prev };

        // Ensure student object exists
        if (!updatedScores[studentId]) {
          updatedScores[studentId] = {
            I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
            outOf50: 0,
            outOf20: 0,
            testDate: formatDateForStorage(testDate),
          };
        } else {
          // Create a new reference for this student's scores
          updatedScores[studentId] = { ...updatedScores[studentId] };

          // Create a new reference for this question's scores
          const qKey = questionNumber as QuestionKey;
          updatedScores[studentId][qKey] = {
            ...updatedScores[studentId][qKey],
          };
        }

        const studentScore = updatedScores[studentId];
        const questionKey = questionNumber as QuestionKey;
        const questionScores = studentScore[questionKey] as QuestionPartScores;

        // Update the specific part with the validated value
        (questionScores as any)[part] = validatedValue;

        // Recalculate total for this question
        questionScores.total =
          questionScores.a +
          questionScores.b +
          questionScores.c +
          questionScores.d;

        // Recalculate total out of 50 with strict validation
        let calculatedTotal =
          (studentScore.I as QuestionPartScores).total +
          (studentScore.II as QuestionPartScores).total +
          (studentScore.III as QuestionPartScores).total +
          (studentScore.IV as QuestionPartScores).total +
          (studentScore.V as QuestionPartScores).total;

        // Apply a strict validation to ensure the total cannot exceed 50
        studentScore.outOf50 = Math.min(calculatedTotal, 50);

        // Calculate outOf20 based on conversion factor
        try {
          const conversionFactor =
            getComponentScale(courseType, componentName, courseConfig)
              .conversionFactor || 0.4;

          studentScore.outOf20 = Math.round(
            studentScore.outOf50 * conversionFactor
          );
        } catch (err) {
          console.warn(
            `Error calculating conversion for ${componentName}:`,
            err
          );
          studentScore.outOf20 = Math.round(studentScore.outOf50 * 0.4); // Default to 0.4
        }

        return updatedScores;
      });
    },
    [courseType, componentName, courseConfig, testDate]
  );

  // Handle test date change
  const handleTestDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newISODate = e.target.value; // This will be in yyyy-MM-dd format
    setTestDate(newISODate);

    console.log(
      `Date changed to ${newISODate}, converting to display format...`
    );
    const storedDate = formatDateForStorage(newISODate);
    console.log(`Stored date format: ${storedDate}`);

    // Update all student scores with the new date
    setScores((prev) => {
      const updated = { ...prev };

      Object.keys(updated).forEach((studentId) => {
        if (updated[studentId]) {
          updated[studentId] = {
            ...updated[studentId],
            testDate: formatDateForStorage(newISODate),
          };
          console.log(
            `Updated test date for student ${studentId} to ${storedDate}`
          );
        }
      });
      if (onScoresChange) {
        onScoresChange(updated);
      }

      return updated;
    });
  };

  // Get max marks for a specific part
  const getMaxMarks = useCallback(
    (question: string, part: string): number => {
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
    },
    [courseType, componentName, courseConfig]
  );

  // Calculate the column span for the header
  const getHeaderColSpan = () => {
    // Base span: a, b, c, d columns + total column
    return 5;
  };

  // Handle click on reconfigure button
  const handleReconfigure = useCallback(() => {
    if (onReconfigure) {
      onReconfigure();
    }
  }, [onReconfigure]);

  // Define question keys and part keys for easier iteration
  const questionKeys: QuestionKey[] = ["I", "II", "III", "IV", "V"];
  const partKeys = ["a", "b", "c", "d"];

  // Get scale information for this component
  const { maxMarks, passingMarks } = useMemo(() => {
    let maxM = 20;
    let passM = 8;

    try {
      const scale = getComponentScale(courseType, componentName);
      maxM = scale.maxMarks;
      passM = scale.passingMarks;
    } catch (err) {
      console.warn(`Error getting scale for ${componentName}:`, err);
    }

    return { maxMarks: maxM, passingMarks: passM };
  }, [courseType, componentName]);

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
              <TableCell rowSpan={2} sx={{ width: "4%" }}>
                SNo.
              </TableCell>
              <TableCell rowSpan={2} sx={{ width: "15%" }}>
                Enrollment No.
              </TableCell>
              <TableCell rowSpan={2} sx={{ width: "15%" }}>
                Name
              </TableCell>
              <TableCell rowSpan={2} sx={{ width: "10%" }}>
                Program
              </TableCell>

              {questionKeys.map((question) => {
                // Calculate total weight for this question
                const questionTotalWeight = partKeys.reduce((sum, part) => {
                  return sum + getMaxMarks(question, part);
                }, 0);

                return (
                  <TableCell
                    key={`question-${question}`}
                    colSpan={getHeaderColSpan()}
                    align="center"
                    sx={{ backgroundColor: "#f5f5f5" }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography component="span">
                        Question {question}
                      </Typography>
                      <Chip
                        label={`Total: ${questionTotalWeight.toFixed(1)}`}
                        color={
                          questionTotalWeight === 0 ? "default" : "primary"
                        }
                        size="small"
                        sx={{ ml: 1, fontSize: "0.7rem" }}
                      />
                    </Box>
                  </TableCell>
                );
              })}
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
                  {partKeys.map((part) => {
                    const maxMarksForPart = getMaxMarks(question, part);
                    const isZero = maxMarksForPart <= 0;

                    return (
                      <TableCell
                        key={`${question}-${part}`}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: isZero
                            ? "rgba(200, 200, 200, 0.3)"
                            : "inherit",
                        }}
                      >
                        <Box>
                          {part}
                          <Box
                            sx={{
                              fontSize: "0.75rem",
                              fontWeight: "normal",
                              color: isZero
                                ? "text.disabled"
                                : "text.secondary",
                              mt: 0.5,
                            }}
                          >
                            Max: {maxMarksForPart}
                          </Box>
                        </Box>
                      </TableCell>
                    );
                  })}
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
                testDate: formatDateForStorage(testDate),
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

              // Ensure total is capped at 50
              const cappedTotal = Math.min(studentScores.outOf50, 50);

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
                  <TableCell>
                    <Tooltip title={student.program}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: "medium",
                          color: "text.primary",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {student.program}
                      </Typography>
                    </Tooltip>
                  </TableCell>

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
                          const isZeroWeighted = maxMarksForPart <= 0;

                          return (
                            <TableCell
                              key={`${student._id}-${questionKey}-${part}`}
                              align="center"
                              sx={{ p: 0.5 }}
                            >
                              <TextField
                                type="number"
                                value={isZeroWeighted ? 0 : value}
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
                                  max: maxMarksForPart,
                                  step: 0.5,
                                  style: {
                                    textAlign: "center",
                                    padding: "6px",
                                    backgroundColor: isMaxed
                                      ? "rgba(76, 175, 80, 0.1)"
                                      : isZeroWeighted
                                      ? "rgba(200, 200, 200, 0.3)"
                                      : "inherit",
                                  },
                                }}
                                variant="outlined"
                                size="small"
                                sx={{
                                  width: "50px",
                                  "& .Mui-error": {
                                    color: "error.main",
                                  },
                                  "& .Mui-disabled": {
                                    backgroundColor: "rgba(200, 200, 200, 0.3)",
                                  },
                                }}
                                disabled={isZeroWeighted}
                                error={value > maxMarksForPart}
                                helperText={
                                  value > maxMarksForPart
                                    ? `Max: ${maxMarksForPart}`
                                    : isZeroWeighted
                                    ? "Max: 0"
                                    : ""
                                }
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
                          {questionScores.total.toFixed(1)}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}

                  {/* Final scores */}
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {cappedTotal.toFixed(1)}
                    {studentScores.outOf50 > 50 && (
                      <Tooltip title="Score capped at maximum 50">
                        <WarningIcon
                          color="warning"
                          fontSize="small"
                          sx={{ ml: 0.5, verticalAlign: "middle" }}
                        />
                      </Tooltip>
                    )}
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

// Use memo to prevent unnecessary re-renders of the entire component
export default memo(CAScoreEntryComponent);
