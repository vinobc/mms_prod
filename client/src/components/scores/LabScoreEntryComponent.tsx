import React, { useState, useEffect, useCallback, memo, useRef } from "react";
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
  Button,
  Alert,
  IconButton,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Student, CourseType } from "../../types";
import { getComponentScale, convertLabScore } from "../../utils/scoreUtils";
import { debounce } from "lodash";

// Helper function to format number to words
const numberToWords = (num: number) => {
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

interface LabSession {
  date: string;
  maxMarks: number;
  obtainedMarks: number;
  index: number; // Explicitly include index for proper tracking
}

interface LabScore {
  componentName: string;
  sessions: LabSession[];
  maxMarks: number;
  totalObtained: number;
}

interface LabScoreEntryComponentProps {
  students: Student[];
  componentName: string;
  courseType: CourseType;
  onScoresChange: (scores: { [studentId: string]: LabScore }) => void;
  initialScores?: { [studentId: string]: LabScore };
  courseId: string; // Added to access localStorage data
}

const LabScoreEntryComponent: React.FC<LabScoreEntryComponentProps> = ({
  students,
  componentName,
  courseType,
  onScoresChange,
  initialScores = {},
  courseId,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs for tracking state
  const initialUpdateDone = useRef(false);
  const mountCount = useRef(0);

  // Get scale configuration based on course type
  const scaleConfig = getComponentScale(courseType, componentName);
  const maxMarks = scaleConfig.maxMarks;
  const passingMarks = scaleConfig.passingMarks;

  // Get saved dates from localStorage based on courseId
  const getSavedDatesFromStorage = useCallback(() => {
    try {
      const localStorageKey = `lab_dates_${courseId}`;
      const savedDatesJson = localStorage.getItem(localStorageKey);

      if (savedDatesJson) {
        const parsedDates = JSON.parse(savedDatesJson);
        if (Array.isArray(parsedDates) && parsedDates.length >= 2) {
          console.log(
            `Loaded lab dates from localStorage for course ${courseId}:`,
            parsedDates
          );
          return parsedDates;
        }
      }
    } catch (err) {
      console.error("Error loading dates from localStorage:", err);
    }

    return null;
  }, [courseId]);

  // Get saved scores from localStorage
  const getSavedScoresFromStorage = useCallback(() => {
    try {
      const scoresStorageKey = `lab_scores_${courseId}`;
      const savedScoresJson = localStorage.getItem(scoresStorageKey);

      if (savedScoresJson) {
        const parsedScores = JSON.parse(savedScoresJson);
        if (parsedScores && typeof parsedScores === "object") {
          console.log(
            `Loaded lab scores from localStorage for course ${courseId}`
          );
          return parsedScores;
        }
      }
    } catch (err) {
      console.error("Error loading scores from localStorage:", err);
    }

    return null;
  }, [courseId]);

  // Initialize with dates from localStorage or fallback
  const [sessionDates, setSessionDates] = useState<string[]>(() => {
    // Try to get dates from localStorage first
    const storedDates = getSavedDatesFromStorage();
    if (storedDates) {
      return storedDates;
    }

    // Default fallback dates if nothing in localStorage
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return [
      today.toISOString().split("T")[0],
      yesterday.toISOString().split("T")[0],
    ];
  });

  // Store student scores with proper indexing
  const [studentScores, setStudentScores] = useState<{
    [studentId: string]: LabSession[];
  }>({});

  // Save dates to localStorage whenever they change
  useEffect(() => {
    if (sessionDates.length >= 2 && courseId) {
      try {
        const localStorageKey = `lab_dates_${courseId}`;
        localStorage.setItem(localStorageKey, JSON.stringify(sessionDates));
        console.log(
          `Updated lab dates in localStorage for course ${courseId}:`,
          sessionDates
        );
      } catch (err) {
        console.error("Error saving dates to localStorage:", err);
      }
    }
  }, [sessionDates, courseId]);

  // Create a debounced version of the score change handler
  const debouncedUpdateParent = useCallback(
    debounce((currentScores = studentScores, currentDates = sessionDates) => {
      try {
        const formattedScores = formatScoresForParent(
          currentScores,
          currentDates
        );
        console.log("Updating parent with lab scores:", formattedScores);
        onScoresChange(formattedScores);
      } catch (err) {
        console.error("Error updating parent component:", err);
      }
    }, 500),
    [studentScores, sessionDates, onScoresChange]
  );

  // Calculate total score for a student based on course type
  const calculateTotal = useCallback(
    (sessions: LabSession[]): number => {
      if (!sessions || sessions.length === 0) return 0;

      // Calculate average of all session scores
      let sum = 0;
      let count = 0;

      for (const session of sessions) {
        if (session.obtainedMarks !== undefined) {
          sum += Number(session.obtainedMarks);
          count++;
        }
      }

      if (count === 0) return 0;

      const average = sum / count;

      // Convert based on course type
      return convertLabScore(average, courseType);
    },
    [courseType]
  );

  // Format scores for parent component
  const formatScoresForParent = useCallback(
    (
      currentScores: { [studentId: string]: LabSession[] },
      currentDates: string[]
    ) => {
      const formattedScores: { [studentId: string]: LabScore } = {};

      students.forEach((student) => {
        const studentId = student._id;
        const sessions = currentScores[studentId] || [];

        // Ensure all sessions are properly indexed
        const completeSessionsArray = currentDates.map((date, idx) => {
          // Try to find existing session by index
          const existingSession = sessions.find((s) => s.index === idx);

          if (existingSession) {
            return {
              ...existingSession,
              date: date, // Update date to match current position
            };
          }

          // Create new session
          return {
            date,
            maxMarks: 10,
            obtainedMarks: 0,
            index: idx,
          };
        });

        // Calculate total score based on course type
        const total = calculateTotal(completeSessionsArray);

        // Format for parent component
        formattedScores[studentId] = {
          componentName: "LAB",
          sessions: completeSessionsArray,
          maxMarks,
          totalObtained: total,
        };
      });

      return formattedScores;
    },
    [students, calculateTotal, maxMarks]
  );

  // Extract dates from initialScores if needed
  const extractDatesFromInitialScores = useCallback(() => {
    console.log("Extracting dates from initial scores:", initialScores);

    // Default in case extraction fails
    let extractedDates = [
      new Date().toISOString().split("T")[0],
      new Date(Date.now() - 86400000).toISOString().split("T")[0],
    ];

    // If we have initial scores, extract the dates from them
    if (Object.keys(initialScores).length > 0) {
      // Find an entry with sessions to extract dates
      for (const studentId of Object.keys(initialScores)) {
        const studentData = initialScores[studentId];

        if (studentData?.sessions && studentData.sessions.length > 0) {
          // Log sessions for debugging
          console.log(
            `Initial sessions for student ${studentId}:`,
            studentData.sessions
          );

          // Sort sessions by index to maintain order
          const sortedSessions = [...studentData.sessions].sort((a, b) =>
            a.index !== undefined && b.index !== undefined
              ? a.index - b.index
              : 0
          );

          // Extract dates
          if (sortedSessions.length >= 2) {
            extractedDates = sortedSessions.map(
              (session) =>
                session.date || new Date().toISOString().split("T")[0]
            );

            console.log("Extracted dates from sessions:", extractedDates);

            // Save to localStorage immediately
            if (courseId) {
              const localStorageKey = `lab_dates_${courseId}`;
              localStorage.setItem(
                localStorageKey,
                JSON.stringify(extractedDates)
              );
              console.log(
                `Saved extracted dates to localStorage for course ${courseId}:`,
                extractedDates
              );
            }

            break; // Found dates, no need to keep looking
          }
        }
      }
    }

    return extractedDates;
  }, [initialScores, courseId]);

  // Initialize from props
  useEffect(() => {
    // Track mount count to handle strict mode double mounting
    mountCount.current += 1;
    console.log(`LabScoreEntry mount #${mountCount.current}`);

    // Skip if already initialized
    if (isInitialized) {
      console.log("Already initialized, skipping initialization");
      return;
    }

    try {
      console.log("Initializing lab component with scores:", initialScores);

      // Determine which dates to use
      let defaultDates: string[];

      // First try localStorage
      const storedDates = getSavedDatesFromStorage();
      if (storedDates) {
        defaultDates = storedDates;
        console.log(
          "Using localStorage dates for initialization:",
          defaultDates
        );
      }
      // Then try initialScores
      else if (Object.keys(initialScores).length > 0) {
        defaultDates = extractDatesFromInitialScores();
        console.log("Using extracted dates for initialization:", defaultDates);
      }
      // Finally use default dates
      else {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        defaultDates = [
          today.toISOString().split("T")[0],
          yesterday.toISOString().split("T")[0],
        ];
        console.log("Using default dates for initialization:", defaultDates);
      }

      let initialStudentScores: { [studentId: string]: LabSession[] } = {};

      // First try to get scores from localStorage
      const storedScores = getSavedScoresFromStorage();

      if (storedScores) {
        // Use localStorage scores (convert from LabScore format to LabSession[])
        console.log("Using scores from localStorage");

        initialStudentScores = {};

        // Process each student's stored score
        Object.keys(storedScores).forEach((studentId) => {
          const labScore = storedScores[studentId];
          if (labScore && Array.isArray(labScore.sessions)) {
            initialStudentScores[studentId] = [...labScore.sessions];
          }
        });

        // Ensure all students have scores (add any missing students)
        students.forEach((student) => {
          if (!initialStudentScores[student._id]) {
            // Create default sessions for each date for this student
            initialStudentScores[student._id] = defaultDates.map(
              (date, idx) => ({
                date,
                maxMarks: 10,
                obtainedMarks: 0,
                index: idx,
              })
            );
          }
        });
      }
      // If no localStorage scores, try initialScores
      else if (Object.keys(initialScores).length > 0) {
        console.log("Using scores from initialScores prop");

        initialStudentScores = {};

        // Process all students' scores from initialScores
        for (const student of students) {
          const studentId = student._id;
          const initialData = initialScores[studentId];

          if (initialData?.sessions && initialData.sessions.length > 0) {
            console.log(
              `Initial sessions for student ${studentId}:`,
              initialData.sessions
            );

            // Make a deep copy of the sessions with proper indexing
            const processedSessions = initialData.sessions.map(
              (session, idx) => ({
                date: session.date || defaultDates[idx % defaultDates.length],
                maxMarks: session.maxMarks || 10,
                obtainedMarks: session.obtainedMarks || 0,
                index: session.index !== undefined ? session.index : idx,
              })
            );

            // Sort by index to ensure proper order
            processedSessions.sort((a, b) => a.index - b.index);
            initialStudentScores[studentId] = processedSessions;
          } else {
            // Create default sessions for each date
            initialStudentScores[studentId] = defaultDates.map((date, idx) => ({
              date,
              maxMarks: 10,
              obtainedMarks: 0,
              index: idx,
            }));
          }
        }
      }
      // Last resort - create empty scores for all students
      else {
        console.log("Creating default scores for all students");

        initialStudentScores = {};

        students.forEach((student) => {
          initialStudentScores[student._id] = defaultDates.map((date, idx) => ({
            date,
            maxMarks: 10,
            obtainedMarks: 0,
            index: idx,
          }));
        });
      }

      // Update states
      setSessionDates(defaultDates);
      setStudentScores(initialStudentScores);
      setIsInitialized(true);

      console.log("Lab component initialized with dates:", defaultDates);
      console.log("Initial student scores:", initialStudentScores);

      // Immediately update the parent once initialization is complete
      if (!initialUpdateDone.current) {
        initialUpdateDone.current = true;
        const formattedScores = formatScoresForParent(
          initialStudentScores,
          defaultDates
        );
        console.log("Sending initial update to parent:", formattedScores);
        onScoresChange(formattedScores);
      }
    } catch (err) {
      console.error("Error initializing lab component:", err);
      setError("Failed to initialize lab scores");
    }
  }, [
    initialScores,
    students,
    extractDatesFromInitialScores,
    isInitialized,
    formatScoresForParent,
    onScoresChange,
    getSavedDatesFromStorage,
    getSavedScoresFromStorage,
  ]);

  // Update parent component with current scores
  useEffect(() => {
    if (isInitialized && initialUpdateDone.current) {
      debouncedUpdateParent();
    }

    return () => {
      debouncedUpdateParent.cancel();
    };
  }, [studentScores, sessionDates, debouncedUpdateParent, isInitialized]);

  // Save scores to localStorage whenever they change
  useEffect(() => {
    if (
      isInitialized &&
      studentScores &&
      Object.keys(studentScores).length > 0
    ) {
      try {
        // Format scores for localStorage
        const formattedScores = formatScoresForParent(
          studentScores,
          sessionDates
        );

        // Save to localStorage
        const scoresStorageKey = `lab_scores_${courseId}`;
        localStorage.setItem(scoresStorageKey, JSON.stringify(formattedScores));
        console.log(
          `Updated lab scores in localStorage for course ${courseId}`
        );
      } catch (err) {
        console.error("Error saving scores to localStorage:", err);
      }
    }
  }, [
    studentScores,
    sessionDates,
    isInitialized,
    courseId,
    formatScoresForParent,
  ]);

  // Handle date change
  const handleDateChange = useCallback((index: number, newDate: string) => {
    if (!newDate) return; // Skip empty dates

    setSessionDates((prevDates) => {
      const newDates = [...prevDates];
      newDates[index] = newDate;
      return newDates;
    });

    setStudentScores((prevScores) => {
      const updatedScores = { ...prevScores };

      Object.keys(updatedScores).forEach((studentId) => {
        // Create a copy of the student's sessions
        updatedScores[studentId] = [...updatedScores[studentId]];

        // Find the session with this index
        const sessionIdx = updatedScores[studentId].findIndex(
          (s) => s.index === index
        );

        if (sessionIdx >= 0) {
          // Update existing session
          updatedScores[studentId][sessionIdx] = {
            ...updatedScores[studentId][sessionIdx],
            date: newDate,
          };
        } else {
          // Create new session if not found
          updatedScores[studentId].push({
            date: newDate,
            maxMarks: 10,
            obtainedMarks: 0,
            index: index,
          });

          // Sort by index
          updatedScores[studentId].sort((a, b) => a.index - b.index);
        }
      });

      return updatedScores;
    });
  }, []);

  // Add a new session
  const handleAddSession = useCallback(() => {
    setSessionDates((prevDates) => {
      const newDate = new Date().toISOString().split("T")[0];
      const newDates = [...prevDates, newDate];
      const newIndex = prevDates.length; // Use length as the new index

      setStudentScores((prevScores) => {
        const updatedScores = { ...prevScores };

        Object.keys(updatedScores).forEach((studentId) => {
          // Add new session for each student
          updatedScores[studentId] = [
            ...updatedScores[studentId],
            {
              date: newDate,
              maxMarks: 10,
              obtainedMarks: 0,
              index: newIndex,
            },
          ];
        });

        return updatedScores;
      });

      return newDates;
    });
  }, []);

  // Remove a session
  const handleRemoveSession = useCallback((indexToRemove: number) => {
    setSessionDates((prevDates) => {
      if (prevDates.length <= 2) {
        setError("You must have at least two lab sessions");
        return prevDates;
      }

      const newDates = prevDates.filter((_, i) => i !== indexToRemove);

      setStudentScores((prevScores) => {
        const updatedScores = { ...prevScores };

        Object.keys(updatedScores).forEach((studentId) => {
          // Remove session with specified index
          updatedScores[studentId] = updatedScores[studentId]
            .filter((session) => session.index !== indexToRemove)
            // Update indices of remaining sessions
            .map((session) => {
              if (session.index > indexToRemove) {
                return { ...session, index: session.index - 1 };
              }
              return session;
            });
        });

        return updatedScores;
      });

      return newDates;
    });
  }, []);

  // Handle score change
  const handleScoreChange = useCallback(
    (studentId: string, sessionIndex: number, value: string) => {
      try {
        // Convert to number and validate
        let numValue = parseFloat(value);
        if (isNaN(numValue)) numValue = 0;
        numValue = Math.max(0, Math.min(10, numValue));

        setStudentScores((prevScores) => {
          // Create a new reference
          const updatedScores = { ...prevScores };

          if (!updatedScores[studentId]) {
            // Initialize if missing
            updatedScores[studentId] = sessionDates.map((date, idx) => ({
              date,
              maxMarks: 10,
              obtainedMarks: 0,
              index: idx,
            }));
          } else {
            // Create a new array
            updatedScores[studentId] = [...updatedScores[studentId]];
          }

          // Find session with matching index
          const sessionIdx = updatedScores[studentId].findIndex(
            (s) => s.index === sessionIndex
          );

          if (sessionIdx >= 0) {
            // Update existing session
            updatedScores[studentId][sessionIdx] = {
              ...updatedScores[studentId][sessionIdx],
              obtainedMarks: numValue,
            };
          } else {
            // Add new session
            updatedScores[studentId].push({
              date:
                sessionDates[sessionIndex] ||
                new Date().toISOString().split("T")[0],
              maxMarks: 10,
              obtainedMarks: numValue,
              index: sessionIndex,
            });

            // Sort by index
            updatedScores[studentId].sort((a, b) => a.index - b.index);
          }

          return updatedScores;
        });
      } catch (err) {
        console.error("Error updating score:", err);
      }
    },
    [sessionDates]
  );

  return (
    <Box sx={{ width: "100%" }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">LAB</Typography>
          <Typography variant="caption" color="text.secondary">
            {courseType.toLowerCase().includes("lab-only")
              ? "Lab-only course: scores scaled to 100"
              : "Integrated course: scores scaled to 30"}
          </Typography>
        </Grid>
        <Grid
          item
          xs={12}
          sm={6}
          sx={{ display: "flex", justifyContent: "flex-end" }}
        >
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddSession}
            size="small"
          >
            Add Lab Session
          </Button>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>SNo.</TableCell>
              <TableCell>Academic_Year</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Enrollment No.</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Semester</TableCell>

              {sessionDates.map((date, index) => (
                <TableCell key={`date-${index}`} align="center">
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TextField
                      type="date"
                      value={date}
                      onChange={(e) => handleDateChange(index, e.target.value)}
                      size="small"
                      InputProps={{ sx: { fontSize: "0.875rem" } }}
                    />
                    {sessionDates.length > 2 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveSession(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              ))}

              <TableCell align="center">
                Out_of_{maxMarks} (pass {passingMarks})
              </TableCell>
              <TableCell>Marks in Words</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, studentIndex) => {
              const sessions = studentScores[student._id] || [];
              const total = calculateTotal(sessions);
              const isPassing = total >= passingMarks;

              return (
                <TableRow key={student._id} hover>
                  <TableCell>{studentIndex + 1}</TableCell>
                  <TableCell>{student.academicYear}</TableCell>
                  <TableCell>{student.program}</TableCell>
                  <TableCell>{student.registrationNumber}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.semester}</TableCell>

                  {sessionDates.map((date, displayIndex) => {
                    // Find session with matching index
                    const session = sessions.find(
                      (s) => s.index === displayIndex
                    );
                    const value = session?.obtainedMarks || 0;

                    return (
                      <TableCell key={`score-${displayIndex}`} align="center">
                        <TextField
                          type="number"
                          value={value}
                          onChange={(e) =>
                            handleScoreChange(
                              student._id,
                              displayIndex,
                              e.target.value
                            )
                          }
                          inputProps={{
                            min: 0,
                            max: 10,
                            step: 0.5,
                            style: { textAlign: "center" },
                          }}
                          size="small"
                          sx={{ width: 60 }}
                        />
                      </TableCell>
                    );
                  })}

                  <TableCell align="center">
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color={isPassing ? "success.main" : "error.main"}
                    >
                      {total}
                    </Typography>
                  </TableCell>

                  <TableCell>{numberToWords(total)}</TableCell>
                </TableRow>
              );
            })}

            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={8 + sessionDates.length} align="center">
                  No students enrolled in this course
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default memo(LabScoreEntryComponent);
