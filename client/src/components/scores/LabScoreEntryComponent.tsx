// components/scores/LabScoreEntryComponent.tsx
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
  Button,
  Alert,
  IconButton,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Student, CourseType } from "../../types";
import { getComponentScale, convertLabScore } from "../../utils/scoreUtils";
import { numberToWords } from "../../utils/formatUtils";

interface LabSession {
  date: string;
  maxMarks: number;
  obtainedMarks: number;
  index?: number; // Explicitly include index to ensure persistence
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
  courseType,
  onScoresChange,
  initialScores = {},
}) => {
  const [error, setError] = useState<string | null>(null);
  const [dates, setDates] = useState<string[]>([
    new Date().toISOString().split("T")[0],
    new Date().toISOString().split("T")[0],
  ]);

  // Store scores as a dictionary of studentId -> sessions array
  const [studentScores, setStudentScores] = useState<{
    [studentId: string]: LabSession[];
  }>({});

  // Get scale configuration based on course type
  const scaleConfig = getComponentScale(courseType, "LAB");
  const maxMarks = scaleConfig.maxMarks;
  const passingMarks = scaleConfig.passingMarks;

  // Initialize from props
  useEffect(() => {
    // Initialize dates from initialScores if available
    let defaultDates = [...dates];

    if (Object.keys(initialScores).length > 0) {
      const firstStudentId = Object.keys(initialScores)[0];
      const firstStudent = initialScores[firstStudentId];

      if (firstStudent?.sessions && firstStudent.sessions.length > 0) {
        // Sort sessions by index if available to maintain order
        const sortedSessions = [...firstStudent.sessions].sort((a, b) =>
          a.index !== undefined && b.index !== undefined ? a.index - b.index : 0
        );

        defaultDates = sortedSessions.map(
          (s) => s.date || new Date().toISOString().split("T")[0]
        );
        setDates(defaultDates);
      }
    }

    // Initialize student scores from initialScores
    const initialStudentScores: { [studentId: string]: LabSession[] } = {};

    students.forEach((student) => {
      const studentId = student._id;
      const initialScore = initialScores[studentId];

      if (initialScore?.sessions && initialScore.sessions.length > 0) {
        // Sort sessions by index to maintain order
        const sortedSessions = [...initialScore.sessions].sort((a, b) =>
          a.index !== undefined && b.index !== undefined ? a.index - b.index : 0
        );

        initialStudentScores[studentId] = sortedSessions;
      } else {
        // Create default empty scores for each date
        initialStudentScores[studentId] = defaultDates.map((date, idx) => ({
          date,
          maxMarks: 10,
          obtainedMarks: 0,
          index: idx,
        }));
      }
    });

    setStudentScores(initialStudentScores);

    // Initial update to parent after setting up state
    setTimeout(() => {
      updateParent(initialStudentScores, defaultDates);
    }, 100);
  }, [initialScores]);

  // Calculate total for a student based on course type
  const calculateTotal = (sessions: LabSession[]): number => {
    if (!sessions || sessions.length === 0) return 0;

    let sum = 0;
    let count = 0;

    for (const session of sessions) {
      if (session.obtainedMarks !== undefined) {
        sum += session.obtainedMarks;
        count++;
      }
    }

    if (count === 0) return 0;

    // Calculate average and scale to max marks based on course type
    const average = sum / count;
    return convertLabScore(average, courseType);
  };

  // Handle date change
  const handleDateChange = (index: number, newDate: string) => {
    const newDates = [...dates];
    newDates[index] = newDate;
    setDates(newDates);

    // Update all student sessions with the new date
    const updatedScores = { ...studentScores };
    Object.keys(updatedScores).forEach((studentId) => {
      if (updatedScores[studentId][index]) {
        updatedScores[studentId][index] = {
          ...updatedScores[studentId][index],
          date: newDate,
        };
      }
    });

    setStudentScores(updatedScores);
    updateParent(updatedScores, newDates);
  };

  // Add a new session
  const handleAddSession = () => {
    // Add a new date
    const newDate = new Date().toISOString().split("T")[0];
    const newDates = [...dates, newDate];
    setDates(newDates);

    // Add an empty score for this date for all students
    const updatedScores = { ...studentScores };
    const newIndex = dates.length;

    Object.keys(updatedScores).forEach((studentId) => {
      if (!updatedScores[studentId]) {
        updatedScores[studentId] = [];
      }

      updatedScores[studentId].push({
        date: newDate,
        maxMarks: 10,
        obtainedMarks: 0,
        index: newIndex,
      });
    });

    setStudentScores(updatedScores);
    updateParent(updatedScores, newDates);
  };

  // Remove a session
  const handleRemoveSession = (index: number) => {
    if (dates.length <= 2) {
      setError("You must have at least two lab sessions");
      return;
    }

    // Remove the date
    const newDates = dates.filter((_, i) => i !== index);
    setDates(newDates);

    // Remove the session from all students
    const updatedScores = { ...studentScores };

    Object.keys(updatedScores).forEach((studentId) => {
      updatedScores[studentId] = updatedScores[studentId]
        .filter((_, i) => i !== index)
        // Update indices after removal
        .map((session, newIdx) => ({
          ...session,
          index: newIdx,
        }));
    });

    setStudentScores(updatedScores);
    updateParent(updatedScores, newDates);
  };

  // Handle score change
  const handleScoreChange = (
    studentId: string,
    sessionIndex: number,
    value: string
  ) => {
    try {
      // Convert to number
      let numValue = parseInt(value);
      if (isNaN(numValue)) numValue = 0;

      // Ensure value is between 0 and 10
      numValue = Math.max(0, Math.min(10, numValue));

      // Update the specific student's score
      const updatedScores = { ...studentScores };

      if (!updatedScores[studentId]) {
        // Initialize if missing
        updatedScores[studentId] = dates.map((date, idx) => ({
          date,
          maxMarks: 10,
          obtainedMarks: 0,
          index: idx,
        }));
      }

      if (!updatedScores[studentId][sessionIndex]) {
        // Initialize if missing
        updatedScores[studentId][sessionIndex] = {
          date: dates[sessionIndex],
          maxMarks: 10,
          obtainedMarks: 0,
          index: sessionIndex,
        };
      }

      updatedScores[studentId][sessionIndex] = {
        ...updatedScores[studentId][sessionIndex],
        obtainedMarks: numValue,
      };

      setStudentScores(updatedScores);
      updateParent(updatedScores, dates);
    } catch (err) {
      console.error("Error updating score:", err);
    }
  };

  // Convert to parent format and update
  const updateParent = (
    currentScores: { [studentId: string]: LabSession[] } = studentScores,
    currentDates: string[] = dates
  ) => {
    const formattedScores: { [studentId: string]: LabScore } = {};

    students.forEach((student) => {
      const studentId = student._id;
      const sessions = currentScores[studentId] || [];

      // Ensure all dates have a session
      const completeSessionsArray = currentDates.map((date, idx) => {
        const existingSession =
          sessions.find((s) => s.index === idx) ||
          sessions.find((s) => s.date === date);

        if (existingSession) {
          return {
            ...existingSession,
            index: idx, // Update index to match position
          };
        }

        return {
          date,
          maxMarks: 10,
          obtainedMarks: 0,
          index: idx,
        };
      });

      // Calculate total
      const total = calculateTotal(completeSessionsArray);

      // Create the score object
      formattedScores[studentId] = {
        componentName: "LAB",
        sessions: completeSessionsArray,
        maxMarks: maxMarks,
        totalObtained: total,
      };
    });

    // Update parent
    onScoresChange(formattedScores);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">LAB</Typography>
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

              {dates.map((date, index) => (
                <TableCell key={`date-${index}`} align="center">
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TextField
                      type="date"
                      value={date}
                      onChange={(e) => handleDateChange(index, e.target.value)}
                      size="small"
                      InputProps={{ sx: { fontSize: "0.875rem" } }}
                    />
                    {dates.length > 2 && (
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

                  {dates.map((date, sessionIndex) => {
                    const session =
                      sessions.find((s) => s.index === sessionIndex) ||
                      sessions.find((s) => s.date === date);
                    const value = session?.obtainedMarks || 0;

                    return (
                      <TableCell key={`score-${sessionIndex}`} align="center">
                        <TextField
                          type="number"
                          value={value}
                          onChange={(e) =>
                            handleScoreChange(
                              student._id,
                              sessionIndex,
                              e.target.value
                            )
                          }
                          inputProps={{
                            min: 0,
                            max: 10,
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
                <TableCell colSpan={8 + dates.length} align="center">
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

export default LabScoreEntryComponent;
