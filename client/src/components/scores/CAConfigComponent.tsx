import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";
import { Course } from "../../types";
import { courseService } from "../../services/courseService";

interface CAConfigComponentProps {
  course: Course;
  componentName: string;
  onConfigSaved: () => void;
}

// Define the structure for part weights
interface PartWeights {
  Ia: number;
  Ib: number;
  Ic: number;
  Id: number;
  IIa: number;
  IIb: number;
  IIc: number;
  IId: number;
  IIIa: number;
  IIIb: number;
  IIIc: number;
  IIId: number;
  IVa: number;
  IVb: number;
  IVc: number;
  IVd: number;
  Va: number;
  Vb: number;
  Vc: number;
  Vd: number;
}

const defaultPartWeights: PartWeights = {
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

const CAConfigComponent: React.FC<CAConfigComponentProps> = ({
  course,
  componentName,
  onConfigSaved,
}) => {
  const [partWeights, setPartWeights] =
    useState<PartWeights>(defaultPartWeights);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New state for flash message
  const [flashOpen, setFlashOpen] = useState<boolean>(false);
  const [flashMessage, setFlashMessage] = useState<string>("");
  const [flashSeverity, setFlashSeverity] = useState<
    "error" | "warning" | "info" | "success"
  >("error");

  // Use a ref to track the previous total - prevents infinite loops
  const prevTotalRef = useRef<number | null>(null);

  // Calculate question totals from the parts
  const getQuestionTotal = (question: string) => {
    const parts = ["a", "b", "c", "d"];
    return parts.reduce((sum, part) => {
      const key = `${question}${part}` as keyof PartWeights;
      return sum + partWeights[key];
    }, 0);
  };

  // Function to update all parts of a question to equal distribution
  const distributeQuestionWeight = (question: string, total: number) => {
    const parts = ["a", "b", "c", "d"];
    const valuePerPart = total / 4;

    const updatedWeights = { ...partWeights };
    parts.forEach((part) => {
      const key = `${question}${part}` as keyof PartWeights;
      updatedWeights[key] = valuePerPart;
    });

    setPartWeights(updatedWeights);
  };

  // Function to zero out all parts for a question
  const zeroQuestionWeight = (question: string) => {
    const parts = ["a", "b", "c", "d"];

    const updatedWeights = { ...partWeights };
    parts.forEach((part) => {
      const key = `${question}${part}` as keyof PartWeights;
      updatedWeights[key] = 0;
    });

    setPartWeights(updatedWeights);
  };

  useEffect(() => {
    // Load existing configuration if available
    if (course?.componentConfigs && course.componentConfigs[componentName]) {
      const configData = course.componentConfigs[componentName];
      if (configData.partWeights) {
        setPartWeights(configData.partWeights);
      }
    }
  }, [course, componentName]);

  // Fixed effect to check total whenever partWeights changes
  // Use a ref to prevent infinite loops
  useEffect(() => {
    const total = calculateTotal();
    const prevTotal = prevTotalRef.current;

    // Only show flash message if the total has actually changed
    // This prevents infinite re-renders
    if (prevTotal !== total) {
      if (total > 50) {
        setFlashMessage(
          `Warning: Total exceeds 50 marks (currently ${total.toFixed(1)})`
        );
        setFlashSeverity("error");
        setFlashOpen(true);
      } else if (
        Math.abs(total - 50) <= 0.01 &&
        prevTotal !== null &&
        Math.abs(prevTotal - 50) > 0.01
      ) {
        // Only show success message when total changes to exactly 50
        setFlashMessage("Perfect! Total equals 50 marks.");
        setFlashSeverity("success");
        setFlashOpen(true);
      }

      // Update the ref with current total
      prevTotalRef.current = total;
    }
  }, [partWeights]);

  const handlePartWeightChange = (questionPart: string, value: string) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0) {
      setError("Please enter a valid positive number");
      return;
    }

    setPartWeights((prev) => ({
      ...prev,
      [questionPart]: numValue,
    }));

    setError(null);
  };

  const calculateTotal = () => {
    const total = Object.values(partWeights).reduce(
      (sum, weight) => sum + weight,
      0
    );

    // Don't set error state here to avoid infinite loops
    // Just return the calculated total
    return total;
  };

  // Function to update error state based on total - call this explicitly
  const updateErrorState = (total: number) => {
    if (total > 50) {
      setError(
        `Question part weights must sum to 50 (currently ${total.toFixed(1)})`
      );
    } else if (error && error.includes("must sum to 50")) {
      setError(null);
    }
  };

  // Function to handle closing the flash message
  const handleFlashClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setFlashOpen(false);
  };

  const handleSaveConfig = async () => {
    try {
      const total = calculateTotal();

      // Update error state here explicitly
      updateErrorState(total);

      if (Math.abs(total - 50) > 0.01) {
        // Show flash message for better visibility
        setFlashMessage(
          `Cannot save: Total must equal 50 (currently ${total.toFixed(1)})`
        );
        setFlashSeverity("error");
        setFlashOpen(true);
        return;
      }

      setSaving(true);
      await courseService.updateComponentConfig(course._id, componentName, {
        partWeights: partWeights,
        isConfigured: true,
      });

      setSuccess("Configuration saved successfully");

      // Show success flash message
      setFlashMessage("Configuration saved successfully!");
      setFlashSeverity("success");
      setFlashOpen(true);

      onConfigSaved();
    } catch (err) {
      console.error("Error saving configuration:", err);
      setError("Failed to save configuration");

      // Show error flash message
      setFlashMessage("Failed to save configuration. Please try again.");
      setFlashSeverity("error");
      setFlashOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const total = calculateTotal();
  // Update error state explicitly here
  React.useEffect(() => {
    updateErrorState(total);
  }, [total]);

  const isValid = Math.abs(total - 50) <= 0.01;

  // Define the questions for easier iteration
  const questions = ["I", "II", "III", "IV", "V"];
  const parts = ["a", "b", "c", "d"];

  return (
    <Box sx={{ width: "100%", mb: 4 }}>
      {/* Flash message */}
      <Snackbar
        open={flashOpen}
        autoHideDuration={6000}
        onClose={handleFlashClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleFlashClose}
          severity={flashSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {flashMessage}
        </Alert>
      </Snackbar>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom color="primary">
            Configure {componentName} Question Part Weights
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Before entering student scores, you need to set the maximum marks
            for each question part. The weights must sum to 50 total marks. This
            configuration will be saved for this specific course and component.
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Set a part to 0 marks if students should not answer that part. Parts
            with 0 marks will be disabled in the score entry form.
          </Alert>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{ mb: 2 }}
              onClose={() => setSuccess(null)}
            >
              {success}
            </Alert>
          )}

          <Paper
            elevation={2}
            sx={{ p: 3, mb: 3, bgcolor: "background.default" }}
          >
            <Typography variant="h6" gutterBottom>
              Course: {course.code} - {course.name}
            </Typography>
            <Typography variant="body2">
              Component: {componentName} | Type: {course.type}
            </Typography>
          </Paper>

          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Question</TableCell>
                  <TableCell align="center">Part a</TableCell>
                  <TableCell align="center">Part b</TableCell>
                  <TableCell align="center">Part c</TableCell>
                  <TableCell align="center">Part d</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questions.map((question) => {
                  const questionTotal = getQuestionTotal(question);

                  return (
                    <TableRow key={question}>
                      <TableCell component="th" scope="row">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="subtitle2">
                            Question {question}
                          </Typography>
                          <Chip
                            label={`Total: ${questionTotal.toFixed(1)}`}
                            color={
                              Math.abs(questionTotal - 10) > 0.01
                                ? "warning"
                                : "success"
                            }
                            size="small"
                            sx={{ mr: 1 }}
                          />
                        </Box>
                      </TableCell>

                      {parts.map((part) => {
                        const partKey =
                          `${question}${part}` as keyof PartWeights;
                        const weight = partWeights[partKey];
                        const isZero = weight === 0;

                        return (
                          <TableCell key={`${question}${part}`} align="center">
                            <TextField
                              type="number"
                              value={weight}
                              onChange={(e) =>
                                handlePartWeightChange(
                                  `${question}${part}`,
                                  e.target.value
                                )
                              }
                              inputProps={{
                                min: 0,
                                step: 0.5,
                                style: { textAlign: "center" },
                              }}
                              variant="outlined"
                              size="small"
                              sx={{
                                width: "80px",
                                // Add visual styling for zero-weighted fields
                                "& .MuiInputBase-root": {
                                  backgroundColor: isZero
                                    ? "#f8f8f8"
                                    : "inherit",
                                },
                                "& .MuiInputBase-input": {
                                  color: isZero ? "#888888" : "inherit",
                                },
                              }}
                            />
                          </TableCell>
                        );
                      })}

                      <TableCell align="right">
                        <Typography
                          variant="subtitle2"
                          color={
                            Math.abs(questionTotal - 10) > 0.01
                              ? "warning.main"
                              : "success.main"
                          }
                        >
                          {questionTotal.toFixed(1)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Grid container spacing={1}>
                          <Grid item>
                            <Button
                              size="small"
                              onClick={() =>
                                distributeQuestionWeight(question, 10)
                              }
                              variant="outlined"
                            >
                              Distribute Evenly
                            </Button>
                          </Grid>
                          <Grid item>
                            <Button
                              size="small"
                              onClick={() => zeroQuestionWeight(question)}
                              variant="outlined"
                              color="warning"
                            >
                              Zero All
                            </Button>
                          </Grid>
                        </Grid>
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableRow>
                  <TableCell colSpan={5} align="right">
                    <Typography variant="subtitle1" fontWeight="bold">
                      Grand Total:
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color={
                        total > 50
                          ? "error.main"
                          : isValid
                          ? "success.main"
                          : "warning.main"
                      }
                    >
                      {total.toFixed(1)}/50
                      {total > 50 && (
                        <Tooltip title="Warning: Total exceeds maximum of 50. Scores will be capped at 50.">
                          <IconButton color="error" size="small">
                            <WarningIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={() => setPartWeights(defaultPartWeights)}
                      color="secondary"
                      variant="outlined"
                    >
                      Reset All
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ mb: 2 }} />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1">
              {isValid ? (
                <Typography component="span" color="success.main">
                  ✓ Configuration valid
                </Typography>
              ) : (
                <Typography component="span" color="error.main">
                  Total must equal 50 (currently {total.toFixed(1)})
                </Typography>
              )}
            </Typography>

            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveConfig}
              disabled={!isValid || saving}
              size="large"
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {saving ? "Saving..." : "Save Configuration & Continue"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Note: This configuration applies only to {course.code} and won't
          affect other courses. You can modify these weights later if needed
          before entering scores.
        </Typography>
      </Box>
    </Box>
  );
};

export default CAConfigComponent;
