import React, { useState, useEffect, useCallback, memo } from "react";
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
}

const LabScoreEntryComponent: React.FC<LabScoreEntryComponentProps> = ({
  students,
  componentName,
  courseType,
  onScoresChange,
  initialScores = {},
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get scale configuration based on course type
  const scaleConfig = getComponentScale(courseType, componentName);
  const maxMarks = scaleConfig.maxMarks;
  const passingMarks = scaleConfig.passingMarks;

  // Initialize with default dates
  const [sessionDates, setSessionDates] = useState<string[]>(() => {
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

  // Create a debounced version of the score change handler
  const debouncedUpdateParent = useCallback(
    debounce((currentScores = studentScores, currentDates = sessionDates) => {
      try {
        const formattedScores = formatScoresForParent(
          currentScores,
          currentDates
        );
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

  // Initialize from props
  useEffect(() => {
    if (isInitialized) return;

    try {
      console.log("Initializing lab component with scores:", initialScores);

      let defaultDates = [...sessionDates];
      const initialStudentScores: { [studentId: string]: LabSession[] } = {};

      // If we have initial scores, extract the dates from them
      if (Object.keys(initialScores).length > 0) {
        // Find an entry with sessions to extract dates
        for (const studentId of Object.keys(initialScores)) {
          const studentData = initialScores[studentId];

          if (studentData?.sessions && studentData.sessions.length > 0) {
            // Sort sessions by index to maintain order
            const sortedSessions = [...studentData.sessions].sort((a, b) =>
              a.index !== undefined && b.index !== undefined
                ? a.index - b.index
                : 0
            );

            // Extract dates
            if (sortedSessions.length >= 2) {
              defaultDates = sortedSessions.map(
                (session) =>
                  session.date || new Date().toISOString().split("T")[0]
              );
              break; // Found dates, no need to keep looking
            }
          }
        }

        // Process all students' scores
        for (const student of students) {
          const studentId = student._id;
          const initialData = initialScores[studentId];

          if (initialData?.sessions && initialData.sessions.length > 0) {
            // Make a deep copy of the sessions with proper indexing
            const processedSessions = initialData.sessions.map(
              (session, idx) => ({
                date:
                  session.date ||
                  defaultDates[idx] ||
                  new Date().toISOString().split("T")[0],
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
      } else {
        // No initial scores, create default entries for all students
        for (const student of students) {
          initialStudentScores[student._id] = defaultDates.map((date, idx) => ({
            date,
            maxMarks: 10,
            obtainedMarks: 0,
            index: idx,
          }));
        }
      }

      // Update states
      setSessionDates(defaultDates);
      setStudentScores(initialStudentScores);
      setIsInitialized(true);

      // Update parent with initial data
      const formattedScores = formatScoresForParent(
        initialStudentScores,
        defaultDates
      );
      debouncedUpdateParent.cancel(); // Cancel any pending updates
      onScoresChange(formattedScores);

      console.log("Lab component initialized with dates:", defaultDates);
      console.log("Initial student scores:", initialStudentScores);
    } catch (err) {
      console.error("Error initializing lab component:", err);
      setError("Failed to initialize lab scores");
    }
  }, [
    initialScores,
    students,
    sessionDates,
    isInitialized,
    onScoresChange,
    formatScoresForParent,
    debouncedUpdateParent,
  ]);

  // Update parent component with current scores
  useEffect(() => {
    if (isInitialized) {
      debouncedUpdateParent();
    }

    return () => {
      debouncedUpdateParent.cancel();
    };
  }, [studentScores, sessionDates, debouncedUpdateParent, isInitialized]);

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
