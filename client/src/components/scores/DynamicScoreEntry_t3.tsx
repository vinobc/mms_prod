import React, { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Alert,
  Tabs,
  Tab,
  Chip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Course, Student } from "../../types";
import { scoreService } from "../../services/scoreService";
import { systemSettingService } from "../../services/systemSettingService";
import { studentService } from "../../services/studentService";
import CAScoreEntryComponent from "./CAScoreEntryComponent";
import CAConfigComponent from "./CAConfigComponent"; // Import CAConfigComponent
import LabScoreEntryComponent from "./LabScoreEntryComponent";
import AssignmentScoreEntryComponent from "./AssignmentScoreEntryComponent";
import TotalScoreComponent from "./TotalScoreComponent";
import {
  getCourseTotalPassingMarks,
  getComponentScale,
  convertLabScore,
} from "../../utils/scoreUtils";
import { useAuth } from "../../context/AuthContext";
import { useRef } from "react";
import format from "date-fns/format";

// Academic year options
const academicYearOptions = [
  "2023-24",
  "2024-25",
  "2025-26",
  "2026-27",
  "2027-28",
];

// Helper: converts a number to words (digit-by-digit)
const numberToWords = (num: number): string => {
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

interface DynamicScoreEntryProps {
  course: Course;
  students: Student[];
  onSaveComplete?: () => void;
}

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
  testDate?: string; // Add testDate field
  [key: string]: QuestionPartScores | number | string | undefined; // Add string type for testDate
}

interface DetailedScore {
  [studentId: string]: StudentDetailedScore;
}

interface LabSession {
  date: string;
  maxMarks: number;
  obtainedMarks: number;
  index?: number; // Added index to track session order
}

interface LabScore {
  componentName: string;
  sessions: LabSession[];
  maxMarks: number;
  totalObtained: number;
}

interface AssignmentScore {
  componentName: string;
  maxMarks: number;
  obtainedMarks: number;
}

// Define question keys as a type
type QuestionKey = "I" | "II" | "III" | "IV" | "V";
const questionKeys: QuestionKey[] = ["I", "II", "III", "IV", "V"];

// Date format for consistency
const DATE_FORMAT = "dd/MM/yyyy";

const DynamicScoreEntry: React.FC<DynamicScoreEntryProps> = ({
  course,
  students,
  onSaveComplete,
}) => {
  const { user } = useAuth();
  const [activeComponent, setActiveComponent] = useState<string>("");
  const [caScores, setCAScores] = useState<{
    [component: string]: DetailedScore;
  }>({});
  const [labScores, setLabScores] = useState<{ [studentId: string]: LabScore }>(
    {}
  );
  const [assignmentScores, setAssignmentScores] = useState<{
    [studentId: string]: AssignmentScore;
  }>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsConfiguration, setNeedsConfiguration] = useState<string | null>(
    null
  );

  // NEW: State for tracking reconfiguration - moved to top level
  const [isReconfiguring, setIsReconfiguring] = useState<boolean>(false);

  // Academic Year state
  const [academicYear, setAcademicYear] = useState(academicYearOptions[0]);

  // Auto-save state
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Score entry control state
  const [scoreEntryEnabled, setScoreEntryEnabled] = useState<boolean>(true);
  const [scoreEntryMessage, setScoreEntryMessage] = useState<string>("");

  const previousLabScoresRef = useRef<string>("");

  // Helper function to check if a component is supported by the course
  const isSupportedComponent = (componentName: string): boolean => {
    if (!course || !course.evaluationScheme) return false;
    return Object.keys(course.evaluationScheme).includes(componentName);
  };

  useEffect(() => {
    if (!course) return;
    const components = Object.keys(course.evaluationScheme);
    if (components.length > 0 && !activeComponent) {
      setActiveComponent(components[0]);
    }
    loadExistingScores();
  }, [course, students]);

  // Get academic year from students
  useEffect(() => {
    if (students && students.length > 0 && students[0].academicYear) {
      setAcademicYear(students[0].academicYear);
    }
  }, [students]);

  // Check if score entry is enabled
  useEffect(() => {
    const checkScoreEntryStatus = async () => {
      try {
        const status = await systemSettingService.isScoreEntryEnabled();
        setScoreEntryEnabled(status.enabled);
        setScoreEntryMessage(status.message);
      } catch (error) {
        console.error("Failed to check score entry status:", error);
        // Default to enabled if there's an error checking
        setScoreEntryEnabled(true);
      }
    };

    checkScoreEntryStatus();
  }, []);

  // NEW: Handle reconfiguration with confirmation
  const handleReconfigure = () => {
    if (
      window.confirm(
        "Reconfiguring will reset all existing scores to zero. Are you sure you want to continue?"
      )
    ) {
      setIsReconfiguring(true);
    }
  };

  // NEW: Handle config saved event and reset scores if needed
  const handleConfigSaved = () => {
    // Reset reconfiguring state
    setIsReconfiguring(false);

    // If we were reconfiguring, we need to clear existing scores
    if (isReconfiguring && activeComponent.startsWith("CA")) {
      // Reset scores for this component
      const emptyScores: DetailedScore = {};

      // Keep same students but with zeroed scores
      (students || []).forEach((student) => {
        if (student && student._id) {
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

      // Update the scores state
      handleCAScoreChange(activeComponent, emptyScores);
    }

    // Reload the course to get fresh configuration
    if (onSaveComplete) onSaveComplete();
  };

  const handleAcademicYearChange = (event: any) => {
    if (!user?.isAdmin) return; // Only proceed if user is admin
    setAcademicYear(event.target.value);
  };

  // Create the auto-save function with debounce
  const autoSave = useCallback(
    debounce(async () => {
      if (!course || students.length === 0 || saving || !scoreEntryEnabled)
        return;

      try {
        setAutoSaving(true);
        const scoresToSubmit = prepareScoresForSubmission();

        // Only save if there are scores to submit
        if (scoresToSubmit.length > 0) {
          const result = await scoreService.updateCourseScores(
            course._id,
            scoresToSubmit
          );
          setLastSaved(new Date());

          // Check if we need to reload data after save
          if (result && result.length > 0) {
            // If saving was successful but we have components with empty scores,
            // trigger a reload to ensure data is synchronized
            const activeComponentData = caScores[activeComponent];
            const hasData =
              activeComponentData &&
              Object.keys(activeComponentData).length > 0;

            if (!hasData && activeComponent.startsWith("CA")) {
              console.log("Auto-reloading after empty component save");
              await loadExistingScores();
            }
          }
          // Don't show success message to avoid disrupting the user
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
        // If auto-save fails due to disabled score entry, update the state
        if ((error as any).response?.data?.status === "DISABLED") {
          setScoreEntryEnabled(false);
          setScoreEntryMessage(
            (error as any).response?.data?.message ||
              "Score entry has been disabled"
          );
        }
        // Don't show error to avoid disrupting the user unless it's critical
      } finally {
        setAutoSaving(false);
      }
    }, 3000),
    [
      course,
      students,
      caScores,
      labScores,
      assignmentScores,
      saving,
      scoreEntryEnabled,
      academicYear, // Add academicYear to dependencies
    ]
  );

  useEffect(() => {
    if (activeComponent !== "TOTAL" && !loading) {
      // Don't auto-save on Total view or during loading
      if (activeComponent === "LAB") {
        // For LAB component, only trigger auto-save when there's a significant change
        // This helps avoid continuous re-renders from minor updates
        const currentScoresKey = JSON.stringify(Object.keys(labScores));
        if (previousLabScoresRef.current !== currentScoresKey) {
          previousLabScoresRef.current = currentScoresKey;
          autoSave();
        }
      } else {
        // For other components, use the regular auto-save
        autoSave();
      }
    }

    // Cancel pending auto-saves when unmounting
    return () => {
      autoSave.cancel();
    };
  }, [
    caScores,
    labScores,
    assignmentScores,
    activeComponent,
    loading,
    autoSave,
    academicYear, // Add academicYear to dependencies
  ]);

  const loadExistingScores = async () => {
    if (!course || students.length === 0) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const existingScores = await scoreService.getScoresByCourse(course._id);
      console.log("Loaded scores from server:", existingScores);

      // Initialize score objects for all components and students
      const updatedCAScores: { [component: string]: DetailedScore } = {};
      const updatedLabScores: { [studentId: string]: LabScore } = {};
      const updatedAssignmentScores: { [studentId: string]: AssignmentScore } =
        {};

      // If we have scores, set academicYear from the first score entry
      if (existingScores.length > 0 && existingScores[0].academicYear) {
        setAcademicYear(existingScores[0].academicYear);
      }

      // Get a list of supported components for this course
      const supportedComponents = Object.keys(course.evaluationScheme || {});

      // Pre-initialize CA components for all students to avoid missing data
      supportedComponents.forEach((component) => {
        if (component.startsWith("CA")) {
          updatedCAScores[component] = {};

          students.forEach((student) => {
            if (student._id) {
              updatedCAScores[component][student._id] = {
                I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                outOf50: 0,
                outOf20: 0,
                testDate: "",
              };
            }
          });
        }
      });

      existingScores.forEach((scoreEntry: any) => {
        try {
          const studentId =
            typeof scoreEntry.studentId === "string"
              ? scoreEntry.studentId
              : scoreEntry.studentId._id;

          if (!studentId) {
            console.warn("Score entry missing studentId:", scoreEntry);
            return;
          }

          // Process the scores array for basic component data
          if (scoreEntry.scores && Array.isArray(scoreEntry.scores)) {
            scoreEntry.scores.forEach((component: any) => {
              // Only process components that are supported by this course type
              if (supportedComponents.includes(component.componentName)) {
                if (component.componentName.startsWith("CA")) {
                  if (!updatedCAScores[component.componentName]) {
                    updatedCAScores[component.componentName] = {};
                  }

                  // Extract testDate from component (if available)
                  const testDate = component.testDate || "";
                  console.log(
                    `Loading test date for ${component.componentName}:`,
                    testDate
                  );

                  // Initialize student CA score structure
                  const studentCAScore: StudentDetailedScore = {
                    I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    outOf50: component.obtainedMarks || 0,
                    outOf20: 0,
                    testDate: testDate, // Store testDate in score data
                  };

                  // Apply conversion factor to calculate outOf20 score
                  try {
                    const courseType = course.type;
                    const conversionFactor =
                      getComponentScale(courseType, component.componentName)
                        .conversionFactor || 0.4;
                    studentCAScore.outOf20 = Math.round(
                      studentCAScore.outOf50 * conversionFactor
                    );
                  } catch (err) {
                    console.warn(
                      `Error calculating conversion for ${component.componentName}:`,
                      err
                    );
                    studentCAScore.outOf20 = Math.round(
                      studentCAScore.outOf50 * 0.4
                    ); // Default to 0.4
                  }

                  updatedCAScores[component.componentName][studentId] =
                    studentCAScore;
                } else if (
                  component.componentName === "LAB" &&
                  isSupportedComponent("LAB")
                ) {
                  // Create default lab structure (will be updated with sessions if available)
                  updatedLabScores[studentId] = {
                    componentName: "LAB",
                    sessions: [],
                    maxMarks: component.maxMarks || 30,
                    totalObtained: component.obtainedMarks || 0,
                  };
                } else if (component.componentName === "ASSIGNMENT") {
                  updatedAssignmentScores[studentId] = {
                    componentName: "ASSIGNMENT",
                    maxMarks: component.maxMarks || 10,
                    obtainedMarks: component.obtainedMarks || 0,
                  };
                }
              } else {
                console.warn(
                  `Skipping unsupported component ${component.componentName} for course type ${course.type}`
                );
              }
            });
          }

          // Process detailed question data if available
          if (
            scoreEntry.questions &&
            Array.isArray(scoreEntry.questions) &&
            scoreEntry.questions.length > 0
          ) {
            // Process questions and lab sessions...
            // Find all CA components in the scores array
            const caComponents: string[] = [];
            // Create a map to store test dates by component
            const testDatesByComponent: { [component: string]: string } = {};

            if (scoreEntry.scores && Array.isArray(scoreEntry.scores)) {
              scoreEntry.scores.forEach((score: any) => {
                if (
                  score.componentName?.startsWith("CA") &&
                  supportedComponents.includes(score.componentName)
                ) {
                  caComponents.push(score.componentName);
                  // Store the test date if available
                  if (score.testDate) {
                    testDatesByComponent[score.componentName] = score.testDate;
                  }
                }
              });
            }

            // Group questions by component - examine meta.component and questionNumber
            const questionsByComponent: { [key: string]: any[] } = {};

            // Initialize groups for each CA component
            caComponents.forEach((comp) => {
              questionsByComponent[comp] = [];
            });

            // If no CA components found, create a default CA1
            if (
              caComponents.length === 0 &&
              Object.keys(questionsByComponent).length === 0 &&
              supportedComponents.includes("CA1")
            ) {
              questionsByComponent["CA1"] = [];
            }

            // Process each question - extract testDate from meta when available
            scoreEntry.questions.forEach((question: any) => {
              // Skip questions that are lab sessions
              if (question.meta && question.meta.type === "lab_session") {
                return;
              }

              // Try to find which component this question belongs to
              let targetComponent: string | null = null;

              // First check meta.component if available
              if (
                question.meta &&
                question.meta.component &&
                supportedComponents.includes(question.meta.component)
              ) {
                targetComponent = question.meta.component;

                // If question has a meta.date, and the component exists in our updated scores,
                // save the date in testDatesByComponent
                if (question.meta.date && targetComponent) {
                  testDatesByComponent[targetComponent] = question.meta.date;
                }
              }
              // Otherwise, guess based on question number
              else {
                const qNum = question.questionNumber || 0;

                // Determine which CA component based on question number range
                // Assuming:
                // - CA1: questions 1-5
                // - CA2: questions 6-10
                // - CA3: questions 11-15
                if (
                  qNum >= 1 &&
                  qNum <= 5 &&
                  supportedComponents.includes("CA1")
                ) {
                  targetComponent = caComponents[0] || "CA1";
                } else if (
                  qNum >= 6 &&
                  qNum <= 10 &&
                  supportedComponents.includes("CA2")
                ) {
                  targetComponent = caComponents[1] || "CA2";
                } else if (
                  qNum >= 11 &&
                  qNum <= 15 &&
                  supportedComponents.includes("CA3")
                ) {
                  targetComponent = caComponents[2] || "CA3";
                } else if (caComponents.length > 0) {
                  // Default to first component
                  targetComponent = caComponents[0];
                }
              }

              // Map the question to its component
              if (targetComponent && !questionsByComponent[targetComponent]) {
                questionsByComponent[targetComponent] = [];
              }

              if (targetComponent) {
                questionsByComponent[targetComponent].push(question);
              }
            });

            // Now process each component's questions to extract detailed scores
            Object.entries(questionsByComponent).forEach(
              ([componentName, questions]) => {
                if (!updatedCAScores[componentName]) {
                  updatedCAScores[componentName] = {};
                }

                if (!updatedCAScores[componentName][studentId]) {
                  updatedCAScores[componentName][studentId] = {
                    I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    outOf50: 0,
                    outOf20: 0,
                    testDate: testDatesByComponent[componentName] || "", // Use stored date if available
                  };
                } else if (testDatesByComponent[componentName]) {
                  // If we have a date from the question metadata, update it in the score
                  updatedCAScores[componentName][studentId].testDate =
                    testDatesByComponent[componentName];
                }

                // Extract question details
                questions.forEach((q: any) => {
                  if (!q.parts || !Array.isArray(q.parts)) {
                    console.warn("Question missing parts array:", q);
                    return;
                  }

                  // If this question has a date and the component doesn't already have one,
                  // store it for this component and student
                  if (
                    q.meta &&
                    q.meta.date &&
                    updatedCAScores[componentName][studentId]
                  ) {
                    updatedCAScores[componentName][studentId].testDate =
                      q.meta.date;
                  }

                  // Map question number to a letter (I-V)
                  // For each CA component, we map question numbers as follows:
                  // Within CA1: Q1->I, Q2->II, Q3->III, Q4->IV, Q5->V
                  // Within CA2: Q6->I, Q7->II, Q8->III, Q9->IV, Q10->V
                  // Within CA3: Q11->I, Q12->II, Q13->III, Q14->IV, Q15->V
                  const questionNum = Number(q.questionNumber) || 0;

                  // Get position within this component (1-5)
                  const posWithinComponent = ((questionNum - 1) % 5) + 1;

                  // Map to Roman numeral
                  const romanNumerals = ["I", "II", "III", "IV", "V"];
                  const questionKey =
                    romanNumerals[posWithinComponent - 1] || "I";

                  // Extract part values (a, b, c, d)
                  q.parts.forEach((part: any) => {
                    const partKey = String(part.partName).toLowerCase();
                    if (["a", "b", "c", "d"].includes(partKey)) {
                      const typedQuestionKey = questionKey as QuestionKey;
                      const studentScores =
                        updatedCAScores[componentName][studentId];
                      const questionScores = studentScores[
                        typedQuestionKey
                      ] as QuestionPartScores;

                      // Type-safe way to set the part score
                      (questionScores as any)[partKey] =
                        Number(part.obtainedMarks) || 0;
                    }
                  });

                  // Recalculate total for this question
                  const typedQuestionKey = questionKey as QuestionKey;
                  const studentScores =
                    updatedCAScores[componentName][studentId];
                  const questionScores = studentScores[
                    typedQuestionKey
                  ] as QuestionPartScores;
                  questionScores.total =
                    questionScores.a +
                    questionScores.b +
                    questionScores.c +
                    questionScores.d;
                });

                // Calculate overall outOf50 score as sum of all question totals
                const studentScores = updatedCAScores[componentName][studentId];
                const totalI =
                  (studentScores.I as QuestionPartScores).total || 0;
                const totalII =
                  (studentScores.II as QuestionPartScores).total || 0;
                const totalIII =
                  (studentScores.III as QuestionPartScores).total || 0;
                const totalIV =
                  (studentScores.IV as QuestionPartScores).total || 0;
                const totalV =
                  (studentScores.V as QuestionPartScores).total || 0;

                const calculatedTotal =
                  totalI + totalII + totalIII + totalIV + totalV;

                // Only update if we have detailed scores
                if (calculatedTotal > 0) {
                  studentScores.outOf50 = calculatedTotal;

                  // Apply conversion factor
                  try {
                    const conversionFactor =
                      getComponentScale(course.type, componentName)
                        .conversionFactor || 0.4;
                    studentScores.outOf20 = Math.round(
                      calculatedTotal * conversionFactor
                    );
                  } catch (err) {
                    console.warn(
                      `Error calculating conversion for ${componentName}:`,
                      err
                    );
                    studentScores.outOf20 = Math.round(calculatedTotal * 0.4); // Default to 0.4
                  }
                }
              }
            );
          }

          // Process lab sessions if available - only if LAB is supported
          if (
            isSupportedComponent("LAB") &&
            scoreEntry.lab_sessions &&
            Array.isArray(scoreEntry.lab_sessions) &&
            scoreEntry.lab_sessions.length > 0
          ) {
            // Process lab sessions...
            // If student has a LAB component, update with sessions
            if (updatedLabScores[studentId]) {
              // Sort sessions by index to ensure proper ordering
              const sortedSessions = [...scoreEntry.lab_sessions].sort(
                (a, b) => {
                  // Use index if available, otherwise fall back to position in array
                  const aIndex = a.index !== undefined ? a.index : 0;
                  const bIndex = b.index !== undefined ? b.index : 0;
                  return aIndex - bIndex;
                }
              );

              updatedLabScores[studentId].sessions = sortedSessions.map(
                (session, position) => ({
                  date: session.date || new Date().toISOString().split("T")[0],
                  maxMarks: session.maxMarks || 10,
                  obtainedMarks: session.obtainedMarks || 0,
                  // Preserve index if available, otherwise use position
                  index: session.index !== undefined ? session.index : position,
                })
              );
            } else if (isSupportedComponent("LAB")) {
              // Create a new lab component if none exists (only if LAB is supported)
              updatedLabScores[studentId] = {
                componentName: "LAB",
                sessions: scoreEntry.lab_sessions.map(
                  (session: any, position: number) => ({
                    date:
                      session.date || new Date().toISOString().split("T")[0],
                    maxMarks: session.maxMarks || 10,
                    obtainedMarks: session.obtainedMarks || 0,
                    // Preserve index if available
                    index:
                      session.index !== undefined ? session.index : position,
                  })
                ),
                maxMarks: 30, // Default max marks
                totalObtained: 0, // Will calculate below
              };

              // Try to get correct scale from course type
              try {
                updatedLabScores[studentId].maxMarks = getComponentScale(
                  course.type,
                  "LAB"
                ).maxMarks;
              } catch (err) {
                console.warn("Error getting LAB scale:", err);
                // Keep default of 30
              }
            }

            // Calculate total obtained score from sessions with the correct scale
            if (updatedLabScores[studentId]?.sessions?.length > 0) {
              const sessions = updatedLabScores[studentId].sessions;
              // Calculate average session score
              const sum = sessions.reduce(
                (total, session) => total + (session.obtainedMarks || 0),
                0
              );
              const average = sum / sessions.length;

              // Apply correct scaling based on course type
              try {
                const scaledScore = convertLabScore(average, course.type);
                updatedLabScores[studentId].totalObtained = scaledScore;
              } catch (err) {
                console.warn("Error calculating LAB score:", err);
                // Just use average without scaling as fallback
                updatedLabScores[studentId].totalObtained = average;
              }
            }
          }
          // Check for lab sessions in questions (only if LAB is supported)
          else if (
            isSupportedComponent("LAB") &&
            scoreEntry.questions &&
            Array.isArray(scoreEntry.questions)
          ) {
            const labSessionQuestions = scoreEntry.questions.filter(
              (q: any) => q.meta && q.meta.type === "lab_session"
            );

            if (labSessionQuestions.length > 0 && updatedLabScores[studentId]) {
              // Extract sessions from questions, preserving any indices if available
              updatedLabScores[studentId].sessions = labSessionQuestions.map(
                (q: any, position: number) => {
                  const obtainedMarks =
                    q.parts && q.parts.length > 0
                      ? Number(q.parts[0].obtainedMarks) || 0
                      : 0;

                  return {
                    date:
                      q.meta?.date || new Date().toISOString().split("T")[0],
                    maxMarks: 10,
                    obtainedMarks: obtainedMarks,
                    // Use index from meta if available, otherwise use position
                    index:
                      q.meta?.index !== undefined ? q.meta.index : position,
                  };
                }
              );

              // Recalculate total with proper scaling
              const sessions = updatedLabScores[studentId].sessions;
              if (sessions.length > 0) {
                const sum = sessions.reduce(
                  (total, session) => total + (session.obtainedMarks || 0),
                  0
                );
                const average = sum / sessions.length;

                try {
                  const scaledScore = convertLabScore(average, course.type);
                  updatedLabScores[studentId].totalObtained = scaledScore;
                } catch (err) {
                  console.warn("Error calculating LAB score:", err);
                  updatedLabScores[studentId].totalObtained = average;
                }
              }
            }
            // If we have a LAB component but no sessions details, create default sessions (only if LAB is supported)
            else if (
              isSupportedComponent("LAB") &&
              updatedLabScores[studentId]
            ) {
              const labTotalScore =
                updatedLabScores[studentId].totalObtained || 0;

              // Create two default sessions
              updatedLabScores[studentId].sessions = [
                {
                  date: new Date().toISOString().split("T")[0],
                  maxMarks: 10,
                  obtainedMarks: Math.ceil(labTotalScore / 2),
                  index: 0,
                },
                {
                  date: new Date().toISOString().split("T")[0],
                  maxMarks: 10,
                  obtainedMarks: Math.floor(labTotalScore / 2),
                  index: 1,
                },
              ];
            }
          }
        } catch (err) {
          console.error("Error processing score entry:", err, scoreEntry);
        }
      });

      // Set state with our processed data
      setCAScores(updatedCAScores);

      // Only set lab scores if LAB is supported by this course
      if (isSupportedComponent("LAB")) {
        setLabScores(updatedLabScores);
      } else {
        // Clear any existing lab scores to avoid conflicts
        setLabScores({});
      }

      setAssignmentScores(updatedAssignmentScores);

      console.log("Processed CA scores:", updatedCAScores);
      console.log("Processed Lab scores:", updatedLabScores);
      console.log("Processed Assignment scores:", updatedAssignmentScores);
    } catch (error) {
      console.error("Error loading existing scores:", error);
      setError("Failed to load existing scores");
    } finally {
      setLoading(false);
    }
  };

  const handleComponentChange = (
    _event: React.SyntheticEvent,
    newValue: string
  ) => {
    setActiveComponent(newValue);

    // When changing components, force reload if the current view is empty
    // This helps recover from empty score states
    if (
      newValue.startsWith("CA") &&
      (!caScores[newValue] || Object.keys(caScores[newValue]).length === 0)
    ) {
      console.log(`Empty score data detected for ${newValue}, reloading...`);
      loadExistingScores();
    }
  };

  const handleCAScoreChange = (component: string, scores: DetailedScore) => {
    setCAScores((prev) => ({
      ...prev,
      [component]: scores,
    }));
  };

  const handleLabScoreChange = (scores: { [studentId: string]: LabScore }) => {
    // Only update lab scores if LAB is supported by this course
    if (isSupportedComponent("LAB")) {
      setLabScores((prev) => {
        // Only update if there are actual changes
        if (JSON.stringify(prev) === JSON.stringify(scores)) {
          return prev; // Return previous state if no changes
        }
        return scores;
      });
    }
  };

  const handleAssignmentScoreChange = (scores: {
    [studentId: string]: AssignmentScore;
  }) => {
    setAssignmentScores(scores);
  };

  // UPDATED: Prepare scores for submission with proper test date and part weights
  const prepareScoresForSubmission = () => {
    const formattedScores: any[] = [];

    // Get supported components
    const supportedComponents = course
      ? Object.keys(course.evaluationScheme || {})
      : [];

    // Filter LAB component for UG course type to prevent saving invalid component data
    if (course && course.type.toUpperCase() === "UG") {
      const labIndex = supportedComponents.findIndex(
        (comp) => comp.toUpperCase() === "LAB"
      );
      if (labIndex >= 0) {
        console.warn("Removing LAB component from UG course before submission");
        supportedComponents.splice(labIndex, 1);
      }
    }

    students.forEach((student) => {
      try {
        let studentScores: any[] = [];
        let aggregatedQuestions: any[] = [];
        let labSessions: any[] = [];

        // Process CA scores (CA1, CA2, CA3) - Now with testDate and partWeights
        Object.keys(caScores).forEach((componentName) => {
          // Only process components that are supported by this course
          if (
            supportedComponents.includes(componentName) &&
            caScores[componentName] &&
            caScores[componentName][student._id]
          ) {
            const studentScore = caScores[componentName][student._id];
            const questions: any[] = [];

            // Get component configuration for part weights
            const componentConfig = course?.componentConfigs?.[componentName];
            const partWeights = componentConfig?.partWeights || {
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

            // Extract testDate from student score data
            const testDate = studentScore.testDate || "";
            console.log(`Saving test date for ${componentName}:`, testDate);

            // Process each question (I, II, III, IV, V) and its parts (a,b,c,d)
            questionKeys.forEach((questionNum, idx) => {
              const questionScores = studentScore[
                questionNum
              ] as QuestionPartScores;

              if (questionScores) {
                // Adjust question number based on component
                // CA1: 1-5, CA2: 6-10, CA3: 11-15
                let actualQuestionNumber = idx + 1;

                if (componentName === "CA2") {
                  actualQuestionNumber += 5;
                } else if (componentName === "CA3") {
                  actualQuestionNumber += 10;
                }

                // Add parts with their configured weights
                const parts = [];

                // Get the weight for each part
                const aWeight = partWeights[`${questionNum}a`] || 2.5;
                const bWeight = partWeights[`${questionNum}b`] || 2.5;
                const cWeight = partWeights[`${questionNum}c`] || 2.5;
                const dWeight = partWeights[`${questionNum}d`] || 2.5;

                parts.push({
                  partName: "a",
                  maxMarks: aWeight,
                  obtainedMarks: questionScores.a || 0,
                });
                parts.push({
                  partName: "b",
                  maxMarks: bWeight,
                  obtainedMarks: questionScores.b || 0,
                });
                parts.push({
                  partName: "c",
                  maxMarks: cWeight,
                  obtainedMarks: questionScores.c || 0,
                });
                parts.push({
                  partName: "d",
                  maxMarks: dWeight,
                  obtainedMarks: questionScores.d || 0,
                });

                questions.push({
                  questionNumber: actualQuestionNumber,
                  meta: {
                    component: componentName,
                    date: testDate, // Include test date in meta
                  },
                  parts,
                });
              }
            });

            // Add all questions to the aggregated list
            aggregatedQuestions = aggregatedQuestions.concat(questions);

            // Add the main component score
            studentScores.push({
              componentName,
              maxMarks: 50,
              obtainedMarks: studentScore.outOf50 || 0,
              testDate: testDate, // Add testDate to the component score
            });
          }
        });

        // Process LAB scores - ONLY if LAB is supported by this course
        if (supportedComponents.includes("LAB") && labScores[student._id]) {
          const labScore = labScores[student._id];

          // Add the main LAB component score with correct maxMarks
          try {
            const scaleConfig = getComponentScale(course.type, "LAB");
            const labMaxMarks = scaleConfig.maxMarks;

            studentScores.push({
              componentName: "LAB",
              maxMarks: labMaxMarks,
              obtainedMarks: labScore.totalObtained || 0,
            });
          } catch (err) {
            console.warn("Error getting LAB scale config:", err);
            // Use default value if error
            studentScores.push({
              componentName: "LAB",
              maxMarks: 30, // Default max marks
              obtainedMarks: labScore.totalObtained || 0,
            });
          }

          // Process lab sessions for storage with preserved indices
          if (labScore.sessions && labScore.sessions.length > 0) {
            // Sort sessions by index for consistent ordering
            const sortedSessions = [...labScore.sessions].sort((a, b) => {
              // Use index if available, otherwise fall back to comparison of dates
              const aIndex = a.index !== undefined ? a.index : 999;
              const bIndex = b.index !== undefined ? b.index : 999;
              return aIndex - bIndex;
            });

            // Add to lab_sessions array WITH INDICES preserved
            labSessions = sortedSessions.map((session, position) => ({
              date: session.date || new Date().toISOString().split("T")[0],
              maxMarks: session.maxMarks || 10,
              obtainedMarks: session.obtainedMarks || 0,
              // Preserve the original index if available
              index: session.index !== undefined ? session.index : position,
            }));

            // Also represent lab sessions as questions for backward compatibility
            sortedSessions.forEach((session, index) => {
              aggregatedQuestions.push({
                questionNumber: 20 + index, // Use high numbers to avoid conflicts
                meta: {
                  type: "lab_session",
                  date: session.date,
                  index: session.index, // Include index in meta for recovery
                },
                parts: [
                  {
                    partName: "score",
                    maxMarks: session.maxMarks || 10,
                    obtainedMarks: session.obtainedMarks || 0,
                  },
                ],
              });
            });
          }
        }

        // Process ASSIGNMENT scores - only if ASSIGNMENT is supported
        if (
          supportedComponents.includes("ASSIGNMENT") &&
          assignmentScores[student._id]
        ) {
          const assignmentScore = assignmentScores[student._id];
          studentScores.push({
            componentName: "ASSIGNMENT",
            maxMarks: assignmentScore.maxMarks,
            obtainedMarks: assignmentScore.obtainedMarks || 0,
          });
        }

        // Only add student data if there are scores to submit
        if (studentScores.length > 0) {
          const studentData: any = {
            studentId: student._id,
            academicYear: academicYear, // Use global academicYear
            scores: studentScores,
            questions: aggregatedQuestions,
          };

          // If lab sessions exist, add them explicitly with their indices
          if (labSessions.length > 0) {
            studentData.lab_sessions = labSessions;
          }

          formattedScores.push(studentData);
        }
      } catch (err) {
        console.error(
          `Error formatting scores for student ${student._id}:`,
          err
        );
      }
    });

    console.log("Prepared scores for submission:", formattedScores);
    return formattedScores;
  };

  const handleSaveAllScores = async () => {
    if (!course) return;

    // Check if score entry is disabled
    if (!scoreEntryEnabled) {
      setError("Score entry has been disabled by administrator");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const scoresToSubmit = prepareScoresForSubmission();
      await scoreService.updateCourseScores(course._id, scoresToSubmit);
      setSuccess("All scores saved successfully!");
      setLastSaved(new Date());

      // Force reload scores after saving to ensure UI is updated with latest data
      await loadExistingScores();

      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      console.error("Error saving scores:", error);
      // Special handling for disabled status
      if (error.response?.data?.status === "DISABLED") {
        setError(
          error.response.data.message || "Score entry is currently disabled"
        );
        setScoreEntryEnabled(false);
      } else {
        setError(error.response?.data?.message || "Failed to save scores");
      }
    } finally {
      setSaving(false);
    }
  };

  // ======================================
  // CSV Export Functionality – Export details based on active component
  // ======================================

  const handleExportCSV = () => {
    // --- CA Export ---
    if (activeComponent.startsWith("CA")) {
      // Get the correct maximum marks based on course type and component
      try {
        const scaleConfig = getComponentScale(course.type, activeComponent);
        const maxMarks = scaleConfig.maxMarks;

        // Remove Academic Year and Test Date from individual row headers
        const headers = [
          "SNo",
          "Enrollment No",
          "Name",
          "Program",
          "Semester",
          // Academic Year and Test Date removed as they're in the header
        ];

        const getTestDateForCA = (): string => {
          if (!activeComponent.startsWith("CA") || !caScores[activeComponent]) {
            return new Date().toLocaleDateString();
          }

          // Count occurrences of each date
          const dateCounts: { [key: string]: number } = {};
          let mostCommonDate = "";
          let highestCount = 0;

          // Loop through all students' data for this component
          Object.values(caScores[activeComponent]).forEach((studentScore) => {
            const date = studentScore.testDate || "";
            if (date) {
              dateCounts[date] = (dateCounts[date] || 0) + 1;

              if (dateCounts[date] > highestCount) {
                highestCount = dateCounts[date];
                mostCommonDate = date;
              }
            }
          });

          return mostCommonDate || new Date().toLocaleDateString();
        };

        // For each question (Q1 to Q5), add columns for a, b, c, d, and total
        for (let q = 1; q <= 5; q++) {
          headers.push(
            `Q${q}_a`,
            `Q${q}_b`,
            `Q${q}_c`,
            `Q${q}_d`,
            `Q${q}_total`
          );
        }

        // Use dynamic maximum marks value based on course type
        headers.push(
          `Overall Score (OutOf${maxMarks})`,
          "Overall Score (OutOf50)",
          "Marks in Words"
        );

        const csvRows: (string | number)[][] = [];

        // Prepend course info at the top including academic year and test date
        csvRows.push([
          `Course Code: ${course.code}`,
          `Course Name: ${course.name}`,
          `Course Type: ${course.type}`,
          `Academic Year: ${academicYear}`,
          `Test Date: ${getTestDateForCA()}`,
        ]);

        csvRows.push([]);
        csvRows.push(headers);

        students.forEach((student, index) => {
          const row: (string | number)[] = [];
          row.push(
            index + 1,
            student.registrationNumber,
            student.name,
            student.program,
            student.semester
            // Academic Year and Test Date removed as they're in the header
          );

          const caData = caScores[activeComponent]?.[student._id];
          if (caData) {
            // Remove test date from individual rows
            const order = ["I", "II", "III", "IV", "V"] as const;
            order.forEach((qKey) => {
              const qData = caData[qKey] as QuestionPartScores;
              row.push(
                qData?.a ?? 0,
                qData?.b ?? 0,
                qData?.c ?? 0,
                qData?.d ?? 0,
                qData?.total ?? 0
              );
            });

            // Use outOf20 field but display it with the correct maxMarks label
            const scaledScore = caData.outOf20 ?? 0;
            row.push(
              scaledScore,
              caData.outOf50 ?? 0,
              numberToWords(scaledScore as number)
            );
          } else {
            // No empty test date cell needed
            for (let i = 0; i < 25; i++) {
              // Adjusted count for removed columns
              row.push(0);
            }
          }
          csvRows.push(row);
        });

        const csvString = csvRows.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `${activeComponent}_${course.code}_Scores.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Error exporting CA scores:", err);
        setError("Failed to export CA scores");
      }
    }

    // --- LAB Export ---
    else if (activeComponent === "LAB" && isSupportedComponent("LAB")) {
      try {
        // Get all lab sessions from all students and sort them by index
        const allSessions: LabSession[] = [];

        students.forEach((student) => {
          const labData = labScores[student._id];
          if (labData?.sessions?.length > 0) {
            labData.sessions.forEach((session) => {
              if (session.date && session.index !== undefined) {
                allSessions.push(session);
              }
            });
          }
        });

        // Sort sessions by index and get unique dates
        const sortedSessions = [...allSessions].sort((a, b) => {
          const aIndex = a.index !== undefined ? a.index : 999;
          const bIndex = b.index !== undefined ? b.index : 999;
          return aIndex - bIndex;
        });

        // Get unique session indices while preserving order
        const uniqueSessionIndices: number[] = [];
        const sessionDatesByIndex: { [key: number]: string } = {};

        sortedSessions.forEach((session) => {
          if (
            session.index !== undefined &&
            !uniqueSessionIndices.includes(session.index)
          ) {
            uniqueSessionIndices.push(session.index);
            sessionDatesByIndex[session.index] = session.date;
          }
        });

        // Sort unique indices numerically
        uniqueSessionIndices.sort((a, b) => a - b);

        // Get LAB scale configuration
        let maxMarks = 30; // Default value

        try {
          const scaleConfig = getComponentScale(course.type, "LAB");
          maxMarks = scaleConfig.maxMarks;
        } catch (err) {
          console.warn("Error getting LAB scale config:", err);
          // Use default value
        }

        // Basic student info columns
        const headers = ["SNo", "Enrollment No", "Name", "Program", "Semester"];

        // Add lab session headers with dates
        uniqueSessionIndices.forEach((index) => {
          const date = sessionDatesByIndex[index] || "Unknown Date";
          headers.push(`Lab Session ${index + 1} (${date})`);
        });

        // Add summary columns
        headers.push(
          "Overall Lab Score (Obtained)",
          `Overall Lab Score (Max: ${maxMarks})`,
          "Marks in Words"
        );

        const csvRows: (string | number)[][] = [];

        // Include global academicYear in the header
        csvRows.push([
          `Course Code: ${course.code}`,
          `Course Name: ${course.name}`,
          `Course Type: ${course.type}`,
          `Academic Year: ${academicYear}`,
        ]);

        csvRows.push([]);
        csvRows.push(headers);

        // Construct each row
        students.forEach((student, index) => {
          const row: (string | number)[] = [];
          row.push(
            index + 1,
            student.registrationNumber,
            student.name,
            student.program,
            student.semester
          );

          const labData = labScores[student._id];

          if (labData && labData.sessions && labData.sessions.length > 0) {
            // Create a map of session scores by index
            const scoresByIndex: { [key: number]: number } = {};
            labData.sessions.forEach((session) => {
              if (session.index !== undefined) {
                scoresByIndex[session.index] = session.obtainedMarks || 0;
              }
            });

            // Add scores for each lab session in order
            uniqueSessionIndices.forEach((index) => {
              row.push(scoresByIndex[index] || 0);
            });

            // Add summary data
            row.push(
              labData.totalObtained || 0,
              labData.maxMarks || maxMarks,
              numberToWords(labData.totalObtained || 0)
            );
          } else {
            // Empty scores for all sessions
            uniqueSessionIndices.forEach(() => {
              row.push(0);
            });
            row.push(0, maxMarks, "ZERO");
          }
          csvRows.push(row);
        });

        const csvString = csvRows.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `LAB_${course.code}_Scores.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Error exporting LAB scores:", err);
        setError("Failed to export LAB scores");
      }
    }

    // --- ASSIGNMENT Export ---
    else if (activeComponent === "ASSIGNMENT") {
      try {
        // Get ASSIGNMENT scale configuration
        let maxMarks = 20; // Default value

        try {
          const scaleConfig = getComponentScale(course.type, "ASSIGNMENT");
          maxMarks = scaleConfig.maxMarks;
        } catch (err) {
          console.warn("Error getting ASSIGNMENT scale config:", err);
          // Use default value
        }

        // Remove Academic Year as it's in the header
        const headers = [
          "SNo",
          "Enrollment No",
          "Name",
          "Program",
          "Semester",
          // Academic Year removed as it's in the header
          "Assignment Obtained",
          `Assignment Max Marks (${maxMarks})`,
          "Marks in Words",
        ];

        const csvRows: (string | number)[][] = [];

        // Include global academicYear in the header
        csvRows.push([
          `Course Code: ${course.code}`,
          `Course Name: ${course.name}`,
          `Course Type: ${course.type}`,
          `Academic Year: ${academicYear}`,
        ]);

        csvRows.push([]);
        csvRows.push(headers);

        students.forEach((student, index) => {
          const row: (string | number)[] = [];
          row.push(
            index + 1,
            student.registrationNumber,
            student.name,
            student.program,
            student.semester
            // Academic Year removed as it's in the header
          );

          const assignData = assignmentScores[student._id];
          if (assignData) {
            row.push(
              assignData.obtainedMarks || 0,
              assignData.maxMarks || maxMarks,
              numberToWords(assignData.obtainedMarks || 0)
            );
          } else {
            row.push(0, maxMarks, "ZERO");
          }
          csvRows.push(row);
        });

        const csvString = csvRows.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `ASSIGNMENT_${course.code}_Scores.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Error exporting ASSIGNMENT scores:", err);
        setError("Failed to export ASSIGNMENT scores");
      }
    }

    // --- TOTAL Export ---
    else if (activeComponent === "TOTAL") {
      (async () => {
        try {
          setLoading(true);

          // Fetch raw scores from the server
          const rawScores = await scoreService.getScoresByCourse(course._id);

          // Create a robust function to escape CSV fields
          const escapeCSV = (field: string | number) => {
            // If field contains commas, quotes, or newlines, wrap in quotes and escape existing quotes
            const str = String(field);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };

          // Set up headers with careful string formatting
          const csvRows = [];

          // Add metadata row with global academicYear
          csvRows.push(
            `${escapeCSV("Course Code")}: ${escapeCSV(course.code)},${escapeCSV(
              "Course Name"
            )}: ${escapeCSV(course.name)},${escapeCSV(
              "Course Type"
            )}: ${escapeCSV(course.type)},${escapeCSV(
              "Academic Year"
            )}: ${escapeCSV(academicYear)}`
          );

          csvRows.push("");

          // Define column headers - remove Academic Year
          const headers = [];
          headers.push(escapeCSV("SNo."));
          // Academic Year removed as it's in the header
          headers.push(escapeCSV("Program"));
          headers.push(escapeCSV("Enrollment No."));
          headers.push(escapeCSV("Name"));
          headers.push(escapeCSV("Semester"));

          // Get component headers properly formatted - only include components that exist for this course
          const components = Object.keys(course.evaluationScheme);
          components.forEach((comp) => {
            try {
              const scale = getComponentScale(course.type, comp);
              headers.push(
                escapeCSV(
                  `${comp} (Out of ${scale.maxMarks}, Pass ${scale.passingMarks})`
                )
              );
            } catch (err) {
              console.warn(`Error getting scale for ${comp}:`, err);
              // Use default values
              headers.push(escapeCSV(`${comp}`));
            }
          });

          headers.push(escapeCSV("TOTAL"));
          headers.push(escapeCSV("Status"));

          // Add headers row
          csvRows.push(headers.join(","));

          // Helper functions for score processing
          const getComponentScore = (
            studentId: string,
            componentName: string
          ) => {
            const studentScore = rawScores.find(
              (score: { studentId: { _id: any } }) => {
                const scoreStudentId =
                  typeof score.studentId === "string"
                    ? score.studentId
                    : score.studentId._id;
                return scoreStudentId === studentId;
              }
            );

            if (!studentScore || !studentScore.scores) return 0;

            const compScore = studentScore.scores.find(
              (score: { componentName: string }) =>
                score.componentName === componentName
            );

            return compScore ? Number(compScore.obtainedMarks) : 0;
          };

          const scaleComponentScore = (
            rawScore: number,
            componentName: string
          ) => {
            try {
              const scale = getComponentScale(course.type, componentName);
              return Math.round(rawScore * (scale.conversionFactor || 1));
            } catch (err) {
              console.warn(`Error scaling ${componentName}:`, err);
              // Default to no scaling if there's an error
              return rawScore;
            }
          };

          // Process each student
          const passingThreshold = getCourseTotalPassingMarks(course.type);

          // Determine if this course type has LAB constraint
          let hasLabConstraint = false;
          try {
            const labConstraintTypes = [
              "ug-integrated",
              "pg-integrated",
              "ug-lab-only",
              "pg-lab-only",
            ];
            const courseTypeLower = course.type.toLowerCase();
            hasLabConstraint = labConstraintTypes.includes(courseTypeLower);
          } catch (err) {
            console.warn("Error checking lab constraint:", err);
          }

          students.forEach((student, index) => {
            const rowData = [];

            // Add basic student info - remove Academic Year
            rowData.push(escapeCSV(index + 1));
            // Academic Year removed as it's in the header
            rowData.push(escapeCSV(student.program));
            rowData.push(escapeCSV(student.registrationNumber));
            rowData.push(escapeCSV(student.name));
            rowData.push(escapeCSV(student.semester));

            // Process scores
            let totalScore = 0;
            components.forEach((componentName) => {
              const rawScore = getComponentScore(student._id, componentName);

              // Only scale the component score if it's supported by this course type
              let scaledScore = 0;
              try {
                scaledScore = scaleComponentScore(rawScore, componentName);
                totalScore += scaledScore;
              } catch (err) {
                console.warn(`Error processing ${componentName}:`, err);
              }

              rowData.push(escapeCSV(scaledScore));
            });

            // Add total score
            rowData.push(escapeCSV(totalScore));

            // Calculate pass/fail status
            let status = "FAIL";

            if (hasLabConstraint && components.includes("LAB")) {
              // Check lab component if applicable
              try {
                const labRaw = getComponentScore(student._id, "LAB");
                const labScale = getComponentScale(course.type, "LAB");
                const labScaled = scaleComponentScore(labRaw, "LAB");

                if (
                  labScaled >= labScale.maxMarks * 0.5 &&
                  totalScore >= passingThreshold
                ) {
                  status = "PASS";
                }
              } catch (err) {
                console.warn("Error checking LAB passing:", err);
                // Fall back to just total score check
                if (totalScore >= passingThreshold) {
                  status = "PASS";
                }
              }
            } else if (totalScore >= passingThreshold) {
              status = "PASS";
            }

            rowData.push(escapeCSV(status));
            csvRows.push(rowData.join(","));
          });

          // Use 'text/csv' MIME type for better Excel compatibility
          const blob = new Blob([csvRows.join("\r\n")], {
            type: "text/csv;charset=utf-8;",
          });

          // Create a download link and trigger it
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${course.code}_TOTAL_scores.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setLoading(false);
          setSuccess("CSV exported successfully");
        } catch (err) {
          console.error("Error exporting TOTAL CSV:", err);
          setError("Failed to export TOTAL CSV");
          setLoading(false);
        }
      })();
    }
  };

  // UPDATED: Modified renderComponent to use the state and handlers from the top level
  const renderComponent = () => {
    if (activeComponent === "TOTAL") {
      return (
        <TotalScoreComponent
          course={course}
          students={students}
          passingThreshold={getCourseTotalPassingMarks(course.type)}
        />
      );
    } else if (activeComponent.startsWith("CA")) {
      // Check if component needs configuration first
      const componentConfig = course?.componentConfigs?.[activeComponent];

      // If component isn't configured yet or we're reconfiguring, show configuration screen
      if (
        !componentConfig ||
        !componentConfig.isConfigured ||
        isReconfiguring
      ) {
        return (
          <CAConfigComponent
            course={course}
            componentName={activeComponent}
            onConfigSaved={handleConfigSaved}
          />
        );
      }

      // If configured, continue to score entry with course-specific config
      return (
        <CAScoreEntryComponent
          students={students}
          componentName={activeComponent}
          courseType={course.type}
          courseConfig={course.componentConfigs?.[activeComponent]} // Pass course-specific config
          onScoresChange={(scores) =>
            handleCAScoreChange(activeComponent, scores)
          }
          initialScores={caScores[activeComponent]}
          onReconfigure={handleReconfigure} // Pass the reconfigure handler
        />
      );
    } else if (activeComponent === "LAB" && isSupportedComponent("LAB")) {
      return (
        <LabScoreEntryComponent
          students={students}
          componentName="LAB"
          courseType={course.type}
          onScoresChange={handleLabScoreChange}
          initialScores={labScores}
          key="lab-score-component"
        />
      );
    } else if (activeComponent === "ASSIGNMENT") {
      return (
        <AssignmentScoreEntryComponent
          students={students}
          componentName="ASSIGNMENT"
          courseType={course.type}
          onScoresChange={handleAssignmentScoreChange}
          initialScores={assignmentScores}
        />
      );
    } else if (activeComponent === "LAB" && !isSupportedComponent("LAB")) {
      return (
        <Alert severity="warning" sx={{ mt: 2 }}>
          LAB component is not supported for this course type ({course.type}).
          Please use a different component.
        </Alert>
      );
    }
    return null;
  };

  return (
    <Box>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5">
                {course?.code} - {course?.name}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Type: {course?.type} | Slot:{" "}
                {Array.isArray(course?.slot)
                  ? course?.slot.join(", ")
                  : course?.slot}{" "}
                | Venue: {course?.venue || "N/A"}
              </Typography>

              {/* Auto-save status indicator */}
              {activeComponent !== "TOTAL" && (
                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  {autoSaving ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "text.secondary",
                      }}
                    >
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      <Typography variant="caption">Auto-saving...</Typography>
                    </Box>
                  ) : lastSaved ? (
                    <Typography
                      variant="caption"
                      sx={{ color: "success.main" }}
                    >
                      Last auto-saved: {lastSaved.toLocaleTimeString()}
                    </Typography>
                  ) : null}
                </Box>
              )}
            </Grid>
            <Grid
              item
              xs={12}
              md={6}
              sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveAllScores}
                disabled={
                  saving ||
                  students.length === 0 ||
                  activeComponent === "TOTAL" ||
                  !scoreEntryEnabled
                }
                size="large"
              >
                {saving ? <CircularProgress size={24} /> : "SAVE ALL SCORES"}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleExportCSV}
                disabled={
                  students.length === 0 ||
                  (!scoreEntryEnabled && !user?.isAdmin) // Disable for faculty but not for admins
                }
                size="large"
              >
                EXPORT CSV
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ mb: 3 }}>
            <FormControl sx={{ width: 200, mb: 2 }}>
              <InputLabel id="academic-year-label">Academic Year</InputLabel>
              <Select
                labelId="academic-year-label"
                value={academicYear}
                onChange={handleAcademicYearChange}
                label="Academic Year"
                disabled={!user?.isAdmin} // Only admin can change the academic year
              >
                {academicYearOptions.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              sx={{ ml: 2, color: "text.secondary" }}
            >
              {user?.isAdmin
                ? "All scores will be saved with this academic year"
                : ""}
            </Typography>
          </Box>

          {/* Score entry disabled warning */}
          {!scoreEntryEnabled && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {scoreEntryMessage ||
                "Score entry has been disabled by administrator. You can view scores but cannot save changes."}
            </Alert>
          )}

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
          {students.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography>No students enrolled in this course</Typography>
            </Paper>
          ) : (
            <>
              <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                <Tabs
                  value={activeComponent}
                  onChange={handleComponentChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {Object.keys(course?.evaluationScheme || {}).map(
                    (component) => (
                      <Tab
                        key={component}
                        value={component}
                        label={component}
                        icon={
                          <Chip
                            size="small"
                            label={`${Math.round(
                              course.evaluationScheme[component] * 100
                            )}%`}
                            color="primary"
                          />
                        }
                        iconPosition="end"
                      />
                    )
                  )}
                  <Tab
                    value="TOTAL"
                    label="TOTAL"
                    icon={<Chip size="small" label="100%" color="success" />}
                    iconPosition="end"
                  />
                </Tabs>
              </Box>
              {activeComponent && renderComponent()}
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default DynamicScoreEntry;
