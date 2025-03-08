/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Student, CourseType } from "../../types";
import { getComponentScale } from "../../utils/scoreUtils";

interface AssignmentScoreEntryComponentProps {
  students: Student[];
  componentName: string; // Should be "ASSIGNMENT"
  courseType: CourseType; // Add course type
  onScoresChange: (scores: any) => void;
  initialScores?: any;
}

// Convert number to words function
const numberToWords = (num: number): string => {
  // Convert the number to a string to handle each digit
  const numStr = num.toString();
  const digits = numStr.split("");

  // Map each digit to its word representation
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

  // Join with spaces
  return words.join(" ");
};

const AssignmentScoreEntryComponent: React.FC<
  AssignmentScoreEntryComponentProps
> = ({
  students,
  componentName,
  courseType,
  onScoresChange,
  initialScores = {},
}) => {
  // State for student scores
  const [scores, setScores] = useState<{ [studentId: string]: number }>({});
  const [error, setError] = useState<string | null>(null);

  // Get scale configuration based on course type
  const scaleConfig = getComponentScale(courseType, componentName);
  const maxMarks = scaleConfig.maxMarks;
  const passingMarks = scaleConfig.passingMarks;

  // Initialize scores from initial data if provided
  useEffect(() => {
    if (initialScores && Object.keys(initialScores).length > 0) {
      try {
        const initialStudentScores: { [studentId: string]: number } = {};
        Object.keys(initialScores).forEach((studentId) => {
          initialStudentScores[studentId] =
            initialScores[studentId].obtainedMarks || 0;
        });
        setScores(initialStudentScores);
      } catch (err) {
        console.error("Error parsing initial scores:", err);
        setError("Error loading initial scores");
      }
    }
  }, [initialScores]);

  // Handle score change for a student
  const handleScoreChange = (studentId: string, value: number) => {
    try {
      // Validate value is within range
      const validValue = Math.max(0, Math.min(maxMarks, value));

      // Update scores state
      setScores((prev) => ({
        ...prev,
        [studentId]: validValue,
      }));

      // Update parent component
      const updatedScores: any = {};
      students.forEach((student) => {
        const id = student._id;
        const obtainedMarks = id === studentId ? validValue : scores[id] || 0;

        updatedScores[id] = {
          componentName: componentName,
          maxMarks: maxMarks,
          obtainedMarks: obtainedMarks,
        };
      });

      onScoresChange(updatedScores);
    } catch (err) {
      console.error("Error updating score:", err);
      setError("Failed to update score");
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Typography variant="h6">Assignment/Internal Assessment</Typography>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Description */}
      {/* <Typography variant="body2" sx={{ mb: 2, ml: 4 }}>
        - Faculty enters the internal score under Out_of_{maxMarks} for each
        student
      </Typography> */}

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
              <TableCell align="center">
                Out_of_{maxMarks} (pass {passingMarks})
              </TableCell>
              <TableCell>Marks in Words</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, index) => {
              const score = scores[student._id] || 0;
              const isPassing = score >= passingMarks;

              return (
                <TableRow key={student._id} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{student.academicYear}</TableCell>
                  <TableCell>{student.program}</TableCell>
                  <TableCell>{student.registrationNumber}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.semester}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={score}
                      onChange={(e) =>
                        handleScoreChange(student._id, Number(e.target.value))
                      }
                      inputProps={{
                        min: 0,
                        max: maxMarks,
                        style: { textAlign: "center" },
                      }}
                      size="small"
                      sx={{
                        width: 70,
                        "& input": {
                          color: isPassing ? "success.main" : "error.main",
                          fontWeight: "bold",
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>{numberToWords(score)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AssignmentScoreEntryComponent;
