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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
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

// Define question keys as a type
type QuestionKey = "I" | "II" | "III" | "IV" | "V";
const questionKeys: QuestionKey[] = ["I", "II", "III", "IV", "V"];

// Define part keys as a type
type PartKey = "a" | "b" | "c" | "d";
const partKeys: PartKey[] = ["a", "b", "c", "d"];

interface QuestionPartScores {
  a: number;
  b: number;
  c: number;
  d: number;
  total: number;
}

// New interface for max marks configuration
interface QuestionPartMaxMarks {
  a: number;
  b: number;
  c: number;
  d: number;
  total: number;
}

// Interface for storing configuration of all question parts
interface MaxMarksConfiguration {
  I: QuestionPartMaxMarks;
  II: QuestionPartMaxMarks;
  III: QuestionPartMaxMarks;
  IV: QuestionPartMaxMarks;
  V: QuestionPartMaxMarks;
  isConfigured: boolean;
  componentName?: string;
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
  maxMarksConfig?: MaxMarksConfiguration; // Added to store configuration
  [key: string]:
    | QuestionPartScores
    | number
    | string
    | MaxMarksConfiguration
    | undefined;
}

interface DetailedScore {
  [studentId: string]: StudentDetailedScore;
}

interface CAScoreEntryComponentProps {
  students: Student[];
  componentName: string; // CA1, CA2, or CA3
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

// Default configuration with 5 marks for each part
const getDefaultMaxMarksConfig = (): MaxMarksConfiguration => ({
  I: { a: 5, b: 5, c: 5, d: 5, total: 20 },
  II: { a: 5, b: 5, c: 5, d: 5, total: 20 },
  III: { a: 5, b: 0, c: 0, d: 0, total: 5 },
  IV: { a: 5, b: 0, c: 0, d: 0, total: 5 },
  V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
  isConfigured: false,
});

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

  // State for max marks configuration
  const [maxMarksConfig, setMaxMarksConfig] = useState<MaxMarksConfiguration>(
    getDefaultMaxMarksConfig()
  );
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Flag to indicate if configuration is needed
  const [needsConfiguration, setNeedsConfiguration] = useState(true);

  const scaleConfig = getComponentScale(courseType, componentName);
  const outputMaxMarks = scaleConfig.maxMarks;
  const passingMarks = scaleConfig.passingMarks;

  // Function to check if a configuration exists in the scores
  const checkForExistingConfiguration = () => {
    // First check for direct configured state in props
    if (initialScores) {
      console.log(
        `Checking for existing configuration in ${
          Object.keys(initialScores).length
        } student scores`
      );

      // First, look for a configuration marked with the correct component name
      for (const studentId in initialScores) {
        const studentScore = initialScores[studentId];
        if (
          studentScore.maxMarksConfig &&
          studentScore.maxMarksConfig.isConfigured &&
          studentScore.maxMarksConfig.componentName === componentName
        ) {
          console.log(
            `Found config specifically for ${componentName}:`,
            studentScore.maxMarksConfig
          );
          return studentScore.maxMarksConfig;
        }
      }

      // If no component-specific config found, look for any valid configuration
      for (const studentId in initialScores) {
        const studentScore = initialScores[studentId];
        if (
          studentScore.maxMarksConfig &&
          studentScore.maxMarksConfig.isConfigured
        ) {
          console.log(
            `Found general config that might work for ${componentName}:`,
            studentScore.maxMarksConfig
          );

          // Clone and tag it with the current component name
          const config = {
            ...studentScore.maxMarksConfig,
            componentName,
          };

          return config;
        }
      }
    }

    // As a fallback, check localStorage
    try {
      const isConfigured = localStorage.getItem(`ca_config_${componentName}`);
      if (isConfigured === "true") {
        console.log(`Found localStorage flag for ${componentName}`);

        // Try to load saved config from localStorage
        const savedConfig = localStorage.getItem(
          `ca_config_data_${componentName}`
        );
        if (savedConfig) {
          try {
            const parsedConfig = JSON.parse(savedConfig);
            console.log(
              `Loaded config from localStorage for ${componentName}`,
              parsedConfig
            );
            return parsedConfig;
          } catch (e) {
            console.error("Failed to parse saved config from localStorage", e);
          }
        }

        // Create a default but valid configuration
        const config = {
          ...getDefaultMaxMarksConfig(),
          isConfigured: true,
          componentName,
        };

        return config;
      }
    } catch (e) {
      console.error("Error checking localStorage:", e);
    }

    console.log(
      `No valid configuration found for ${componentName}, will need to configure`
    );
    return null;
  };

  // Calculate total max marks across all questions
  const calculateTotalMaxMarks = (): number => {
    try {
      return (
        maxMarksConfig.I.total +
        maxMarksConfig.II.total +
        maxMarksConfig.III.total +
        maxMarksConfig.IV.total +
        maxMarksConfig.V.total
      );
    } catch (err) {
      console.error("Error calculating total max marks:", err);
      return 0;
    }
  };

  // Additional check for configuration using localStorage as backup
  useEffect(() => {
    // Check localStorage for saved configuration status
    try {
      const isConfigured = localStorage.getItem(`ca_config_${componentName}`);
      if (isConfigured === "true") {
        // If localStorage indicates this component was configured but we don't have config
        // Use the default or existing config and mark as configured
        if (needsConfiguration) {
          console.log(
            `Found localStorage flag for ${componentName}, using existing configuration`
          );
          // Use existing config if available, otherwise use the default
          const config = {
            ...maxMarksConfig,
            isConfigured: true,
            componentName,
          };
          setMaxMarksConfig(config);
          setNeedsConfiguration(false);
          setShowConfigDialog(false);
        }
      }
    } catch (e) {
      console.error("Error checking localStorage for configuration:", e);
    }
  }, [componentName, needsConfiguration, maxMarksConfig]);

  useEffect(() => {
    // If we have initial scores, use them; otherwise create new ones
    if (initialScores && Object.keys(initialScores).length > 0) {
      // Check for existing configuration
      const existingConfig = checkForExistingConfiguration();

      if (existingConfig && existingConfig.isConfigured) {
        // Configuration found and is valid, use it
        setMaxMarksConfig(existingConfig);
        setNeedsConfiguration(false);
        setShowConfigDialog(false); // Ensure dialog is closed
      } else {
        // No valid configuration found, will need to configure
        setShowConfigDialog(true);
      }

      const formattedScores: DetailedScore = {};

      Object.keys(initialScores).forEach((studentId) => {
        const studentScore = initialScores[studentId];

        // Get the existing config if available
        let configToUse = existingConfig;

        // If this student has a configuration, prioritize it
        if (
          studentScore.maxMarksConfig &&
          studentScore.maxMarksConfig.isConfigured
        ) {
          configToUse = studentScore.maxMarksConfig;
          // Update the component-level config with this student's config
          if (configToUse.componentName === componentName) {
            setMaxMarksConfig(configToUse);
          }
        }

        // Get the test date for this specific component
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
          testDate: componentTestDate,
          // Use this student's config if available, otherwise use the found or default config
          maxMarksConfig: configToUse || maxMarksConfig,
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
      // No existing scores, show configuration dialog
      setShowConfigDialog(true);

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
            maxMarksConfig: maxMarksConfig,
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

  // Handle changes to max marks configuration
  const handleMaxMarksChange = (
    question: QuestionKey,
    part: PartKey,
    value: number
  ) => {
    // Validate input
    if (value < 0) {
      setConfigError("Marks cannot be negative");
      return;
    }

    // Update the configuration
    setMaxMarksConfig((prev) => {
      const newConfig = { ...prev };
      const questionConfig = { ...newConfig[question] };

      questionConfig[part] = value;

      // Update total for this question
      questionConfig.total =
        questionConfig.a +
        questionConfig.b +
        questionConfig.c +
        questionConfig.d;

      newConfig[question] = questionConfig;

      return newConfig;
    });

    // Clear error if there was one
    if (configError) {
      setConfigError(null);
    }
  };

  // Save the max marks configuration
  const handleSaveConfiguration = () => {
    const total = calculateTotalMaxMarks();

    if (total !== 50) {
      setConfigError(`Total marks must equal 50. Current total: ${total}`);
      return;
    }

    // Mark as configured
    const updatedConfig = {
      ...maxMarksConfig,
      isConfigured: true,
      componentName: componentName, // Store which component this is for
    };

    setMaxMarksConfig(updatedConfig);

    // Update all student scores with the configuration
    setScores((prev) => {
      const updatedScores = { ...prev };

      Object.keys(updatedScores).forEach((studentId) => {
        updatedScores[studentId] = {
          ...updatedScores[studentId],
          maxMarksConfig: updatedConfig,
        };
      });

      // Notify parent component of the changes
      onScoresChange(updatedScores);

      return updatedScores;
    });

    setNeedsConfiguration(false);
    setShowConfigDialog(false);

    // Also set a local storage flag to remember configuration was done for this component
    try {
      localStorage.setItem(`ca_config_${componentName}`, "true");

      // Save the actual configuration in localStorage for better recovery
      localStorage.setItem(
        `ca_config_data_${componentName}`,
        JSON.stringify(updatedConfig)
      );
    } catch (e) {
      console.error("Failed to save configuration to localStorage:", e);
    }
  };

  // Open configuration dialog
  const handleOpenConfigDialog = () => {
    setShowConfigDialog(true);
  };

  // Handle score change for a student
  const handleScoreChange = (
    studentId: string,
    question: QuestionKey,
    part: PartKey,
    value: number
  ) => {
    if (!studentId) {
      console.error("Missing studentId in handleScoreChange");
      return;
    }

    // If configuration is not complete, don't allow score entry
    if (needsConfiguration || !maxMarksConfig.isConfigured) {
      setError("Please configure maximum marks before entering scores");
      setShowConfigDialog(true);
      return;
    }

    try {
      const numValue = Number(value);

      // Check if entered value exceeds max marks for this part
      const maxForPart = maxMarksConfig[question][part];
      if (numValue > maxForPart) {
        setError(`Maximum mark for ${question}${part} is ${maxForPart}`);
        return;
      }

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
            maxMarksConfig: maxMarksConfig, // Always include configuration
          };
        } else if (
          !newScores[studentId].maxMarksConfig ||
          newScores[studentId].maxMarksConfig.componentName !== componentName
        ) {
          // Ensure maxMarksConfig is included and marked with correct component
          newScores[studentId].maxMarksConfig = {
            ...maxMarksConfig,
            componentName,
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

        // Always ensure maxMarksConfig is stored with component name
        newScores[studentId].maxMarksConfig = {
          ...maxMarksConfig,
          componentName,
        };

        onScoresChange(newScores);
        return newScores;
      });

      setError(null);
    } catch (err) {
      console.error("Error updating score:", err);
      setError("Failed to update score");
    }
  };

  // Render the configuration dialog
  const renderConfigDialog = () => {
    return (
      <Dialog
        open={showConfigDialog}
        onClose={() => (needsConfiguration ? null : setShowConfigDialog(false))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Configure Maximum Marks for {componentName}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" color="primary" sx={{ mb: 2 }}>
            Set the maximum marks for each question part. Total must equal 50
            marks.
          </Typography>

          {configError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {configError}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Current Total: {calculateTotalMaxMarks()}/50
            </Typography>
            <Box
              sx={{
                height: 10,
                bgcolor: "grey.200",
                borderRadius: 5,
                mt: 1,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${(calculateTotalMaxMarks() / 50) * 100}%`,
                  height: "100%",
                  bgcolor:
                    calculateTotalMaxMarks() === 50
                      ? "success.main"
                      : "warning.main",
                  transition: "width 0.3s ease-in-out",
                }}
              />
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.100" }}>
                  <TableCell>Question</TableCell>
                  <TableCell align="center">Part A</TableCell>
                  <TableCell align="center">Part B</TableCell>
                  <TableCell align="center">Part C</TableCell>
                  <TableCell align="center">Part D</TableCell>
                  <TableCell align="center">Question Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questionKeys.map((question) => (
                  <TableRow key={question}>
                    <TableCell>{question}</TableCell>
                    {partKeys.map((part) => (
                      <TableCell key={`${question}-${part}`} align="center">
                        <TextField
                          type="number"
                          value={maxMarksConfig[question][part]}
                          onChange={(e) =>
                            handleMaxMarksChange(
                              question,
                              part,
                              Number(e.target.value)
                            )
                          }
                          inputProps={{
                            min: 0,
                            max: 50,
                            style: { textAlign: "center" },
                          }}
                          size="small"
                          sx={{ width: 70 }}
                        />
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      <Chip
                        label={maxMarksConfig[question].total}
                        color={
                          maxMarksConfig[question].total > 0
                            ? "primary"
                            : "default"
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: "grey.100" }}>
                  <TableCell colSpan={5} align="right">
                    <Typography variant="subtitle2">
                      Total Maximum Marks:
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={calculateTotalMaxMarks()}
                      color={
                        calculateTotalMaxMarks() === 50 ? "success" : "warning"
                      }
                      sx={{ fontWeight: "bold" }}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="body2" color="text.secondary">
            Note: The combined total of all question parts must equal exactly 50
            marks. You cannot enter student scores until this configuration is
            complete.
          </Typography>
        </DialogContent>
        <DialogActions>
          {!needsConfiguration && (
            <Button onClick={() => setShowConfigDialog(false)}>Cancel</Button>
          )}
          <Button
            onClick={handleSaveConfiguration}
            variant="contained"
            color="primary"
            disabled={calculateTotalMaxMarks() !== 50}
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      {renderConfigDialog()}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">{componentName} Score Entry</Typography>
          {maxMarksConfig.isConfigured && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleOpenConfigDialog}
              sx={{ ml: 2 }}
            >
              Edit Max Marks
            </Button>
          )}
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

      {needsConfiguration && !maxMarksConfig.isConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please configure maximum marks before entering scores.
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
                Out_of_{outputMaxMarks} (pass {passingMarks})
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
                  {questionKeys.map((questionNo, questionIndex) => {
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
                      maxMarksConfig: maxMarksConfig,
                    };

                    const scaledScore = studentScore.outOf20 as number;
                    const isPassing = scaledScore >= passingMarks;

                    // Get max marks for current question
                    const questionMaxMarks = maxMarksConfig[questionNo];

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
                            <TableCell rowSpan={5}>{student.program}</TableCell>
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

                        {/* Render each part (a, b, c, d) with max marks info */}
                        {partKeys.map((part) => {
                          const maxMarkForPart = questionMaxMarks[part];
                          const isDisabled =
                            !maxMarksConfig.isConfigured ||
                            maxMarkForPart === 0;

                          return (
                            <TableCell
                              align="center"
                              key={`${questionNo}-${part}`}
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
                                  max: maxMarkForPart,
                                  style: { textAlign: "center" },
                                }}
                                size="small"
                                sx={{ width: 60 }}
                                disabled={isDisabled}
                                placeholder={
                                  maxMarkForPart > 0 ? `${maxMarkForPart}` : "-"
                                }
                              />
                              {maxMarksConfig.isConfigured && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  max: {maxMarkForPart}
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell align="center">
                          {(studentScore[questionNo] as QuestionPartScores)
                            ?.total || 0}
                          {maxMarksConfig.isConfigured && (
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              /{questionMaxMarks.total}
                            </Typography>
                          )}
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
                  })}
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
