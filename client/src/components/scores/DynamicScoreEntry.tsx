import React, { useState, useEffect, useCallback, useRef } from "react";
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
const partKeys = ["a", "b", "c", "d"];

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
    if (
      activeComponent &&
      activeComponent !== "TOTAL" &&
      !components.includes(activeComponent)
    ) {
      console.log(
        `Component ${activeComponent} not available for this course. Resetting to default.`
      );
      // Reset to the first available component or TOTAL
      setActiveComponent(components.length > 0 ? components[0] : "TOTAL");
    }
    // If no active component is set, set it to the first available one
    else if (!activeComponent && components.length > 0) {
      setActiveComponent(components[0]);
    }
    loadExistingScores();
  }, [course, activeComponent]);

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

        // Create a validated copy of caScores
        const validatedCAScores = { ...caScores };
        Object.keys(validatedCAScores).forEach((component) => {
          Object.keys(validatedCAScores[component]).forEach((studentId) => {
            // Apply validation to ensure outOf50 is capped at 50
            const studentScore = validatedCAScores[component][studentId];
            studentScore.outOf50 = Math.min(studentScore.outOf50, 50);

            // Recalculate outOf20
            try {
              const conversionFactor =
                getComponentScale(course.type, component).conversionFactor ||
                0.4;
              studentScore.outOf20 = Math.round(
                studentScore.outOf50 * conversionFactor
              );
            } catch (err) {
              console.warn(
                `Error calculating conversion for ${component}:`,
                err
              );
              studentScore.outOf20 = Math.round(studentScore.outOf50 * 0.4);
            }
          });
        });

        // Use the validated score data
        const scoresToSubmit = prepareScoresForSubmission(validatedCAScores);

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
              updatedCAScores[component][student._id] = JSON.parse(
                JSON.stringify({
                  I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  outOf50: 0,
                  outOf20: 0,
                  testDate: format(new Date(), DATE_FORMAT),
                })
              );
            }
          });
        }
      });

      console.log(
        "Processing existing scores: ",
        JSON.stringify(
          existingScores.map((s) => ({
            studentId:
              typeof s.studentId === "string" ? s.studentId : s.studentId?._id,
            components: s.scores?.map((c) => c.componentName),
          }))
        )
      );

      existingScores.forEach((scoreEntry: any) => {
        try {
          const studentId =
            typeof scoreEntry.studentId === "string"
              ? scoreEntry.studentId
              : scoreEntry.studentId?._id;

          if (!studentId) {
            console.warn("Score entry missing studentId:", scoreEntry);
            return;
          }

          console.log(
            `Processing score for student ${studentId}, components:`,
            scoreEntry.scores?.map(
              (s: any) => `${s.componentName}:${s.obtainedMarks}`
            )
          );

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
            console.log(
              `Processing ${
                scoreEntry.questions?.length || 0
              } questions for student ${studentId}`
            );

            (scoreEntry.questions || []).forEach((question: any) => {
              // Skip questions that are lab sessions
              if (question.meta && question.meta.type === "lab_session") {
                console.log("Skipping lab session question:", question);
                return;
              }

              console.log(
                "Processing question:",
                JSON.stringify({
                  num: question.questionNumber,
                  component: question.meta?.component,
                  parts: question.parts?.length || 0,
                })
              );

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
              ([component, questions]) => {
                if (!updatedCAScores[component]) {
                  updatedCAScores[component] = {};
                }

                if (!updatedCAScores[component][studentId]) {
                  updatedCAScores[component][studentId] = {
                    I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                    outOf50: 0,
                    outOf20: 0,
                    testDate: testDatesByComponent[component] || "", // Use stored date if available
                  };
                } else if (testDatesByComponent[component]) {
                  // If we have a date from the question metadata, update it in the score
                  updatedCAScores[component][studentId].testDate =
                    testDatesByComponent[component];
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
                    updatedCAScores[component][studentId]
                  ) {
                    updatedCAScores[component][studentId].testDate =
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
                    const partName = String(part.partName).toLowerCase();
                    if (["a", "b", "c", "d"].includes(partName)) {
                      const typedQuestionKey = questionKey as QuestionKey;
                      const studentScores =
                        updatedCAScores[component][studentId];
                      const questionScores = studentScores[
                        typedQuestionKey
                      ] as QuestionPartScores;

                      // Add a validation for part weights
                      const componentConfig =
                        course?.componentConfigs?.[component];
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

                      // Only set values for parts with weights > 0
                      const partKey = `${typedQuestionKey}${partName}` as any;
                      const partWeight = partWeights[partKey] || 0;
                      const partValue = Number(part.obtainedMarks) || 0;

                      if (partWeight > 0) {
                        (questionScores as any)[partName] = partValue;
                      } else {
                        // Force zero for zero-weighted parts
                        (questionScores as any)[partName] = 0;
                      }

                      console.log(
                        `Setting ${component}.${questionKey}.${partName} = ${
                          (questionScores as any)[partName]
                        } for student ${studentId}`
                      );
                    }
                  });

                  // Recalculate total for this question
                  const typedQuestionKey = questionKey as QuestionKey;
                  const studentScores = updatedCAScores[component][studentId];
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
                const studentScores = updatedCAScores[component][studentId];
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

                // Cap at 50 and update
                studentScores.outOf50 = Math.min(calculatedTotal, 50);
                console.log(
                  `Setting ${component}.outOf50 = ${studentScores.outOf50} for student ${studentId}`
                );

                // Apply conversion factor
                try {
                  const conversionFactor =
                    getComponentScale(course.type, component)
                      .conversionFactor || 0.4;
                  studentScores.outOf20 = Math.round(
                    studentScores.outOf50 * conversionFactor
                  );
                  console.log(
                    `Setting ${component}.outOf20 = ${studentScores.outOf20} for student ${studentId}`
                  );
                } catch (err) {
                  console.warn(
                    `Error calculating conversion for ${component}:`,
                    err
                  );
                  studentScores.outOf20 = Math.round(
                    studentScores.outOf50 * 0.4
                  ); // Default to 0.4
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

              console.log(
                "Lab sessions from server:",
                JSON.stringify(sortedSessions)
              );

              // Save dates to localStorage
              if (sortedSessions.length >= 2 && course && course._id) {
                const sessionDates = sortedSessions.map(
                  (session) => session.date || ""
                );
                const localStorageKey = `lab_dates_${course._id}`;
                localStorage.setItem(
                  localStorageKey,
                  JSON.stringify(sessionDates)
                );
                console.log(
                  `Saved lab dates to localStorage for course ${course._id}:`,
                  sessionDates
                );
              }

              updatedLabScores[studentId].sessions = sortedSessions.map(
                (session, position) => ({
                  date: session.date || new Date().toISOString().split("T")[0],
                  maxMarks: session.maxMarks || 10,
                  obtainedMarks: session.obtainedMarks || 0,
                  // Preserve index if available, otherwise use position
                  index: session.index !== undefined ? session.index : position,
                })
              );

              // Log the processed sessions for verification
              console.log(
                "Processed sessions:",
                JSON.stringify(updatedLabScores[studentId].sessions)
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

              // Save dates to localStorage
              if (scoreEntry.lab_sessions.length >= 2 && course && course._id) {
                const sessionDates = scoreEntry.lab_sessions.map(
                  (session: any) => session.date || ""
                );
                const localStorageKey = `lab_dates_${course._id}`;
                localStorage.setItem(
                  localStorageKey,
                  JSON.stringify(sessionDates)
                );
                console.log(
                  `Saved lab dates to localStorage for course ${course._id}:`,
                  sessionDates
                );
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

              // Save dates to localStorage
              if (labSessionQuestions.length >= 2 && course && course._id) {
                const sessionDates = labSessionQuestions.map(
                  (q: any) => q.meta?.date || ""
                );
                const localStorageKey = `lab_dates_${course._id}`;
                localStorage.setItem(
                  localStorageKey,
                  JSON.stringify(sessionDates)
                );
                console.log(
                  `Saved lab dates from questions to localStorage for course ${course._id}:`,
                  sessionDates
                );
              }

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

      // Save lab scores to localStorage
      if (course && course._id && Object.keys(updatedLabScores).length > 0) {
        try {
          const scoresStorageKey = `lab_scores_${course._id}`;
          localStorage.setItem(
            scoresStorageKey,
            JSON.stringify(updatedLabScores)
          );
          console.log(
            `Saved lab scores to localStorage for course ${course._id}`
          );
        } catch (err) {
          console.error("Error saving lab scores to localStorage:", err);
        }
      }

      // Set state with our processed data
      // Force UI update with new data - logging to verify the data is correct
      console.log(
        "Final CA Scores structure:",
        JSON.stringify(
          Object.keys(updatedCAScores).map((comp) => ({
            component: comp,
            studentCount: Object.keys(updatedCAScores[comp]).length,
            example:
              Object.keys(updatedCAScores[comp]).length > 0
                ? updatedCAScores[comp][Object.keys(updatedCAScores[comp])[0]]
                : "No data",
          }))
        )
      );

      setCAScores(updatedCAScores);

      // Only set lab scores if LAB is supported by this course
      if (isSupportedComponent("LAB")) {
        setLabScores(updatedLabScores);
      } else {
        // Clear any existing lab scores to avoid conflicts
        setLabScores({});
      }

      setAssignmentScores(updatedAssignmentScores);

      // If the active component is a CA component, force re-render by temporarily clearing it
      if (activeComponent.startsWith("CA")) {
        setTimeout(() => {
          console.log(`Force re-render for component ${activeComponent}`);
          // This small timeout forces React to re-render the component with fresh data
        }, 100);
      }

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
    const supportedComponents = Object.keys(course?.evaluationScheme || {});
    const isValid =
      supportedComponents.includes(newValue) || newValue === "TOTAL";

    if (!isValid) {
      console.warn(`Attempted to select invalid component: ${newValue}`);
      return; // Don't set invalid components
    }
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
    setCAScores((prev) => {
      // Create a completely new object reference to prevent cross-contamination
      const newScores = { ...prev };

      // Set only the specific component's scores, leaving others untouched
      newScores[component] = JSON.parse(JSON.stringify(scores)); // Deep copy to break references

      console.log(
        `Updated ONLY ${component} scores, total components: ${
          Object.keys(newScores).length
        }`
      );

      return newScores;
    });
  };

  const handleLabScoreChange = (scores: { [studentId: string]: LabScore }) => {
    // Only update lab scores if LAB is supported by this course
    if (isSupportedComponent("LAB")) {
      setLabScores((prev) => {
        // Only update if there are actual changes
        if (JSON.stringify(prev) === JSON.stringify(scores)) {
          return prev; // Return previous state if no changes
        }

        // Save updated scores to localStorage
        if (course && course._id) {
          try {
            const scoresStorageKey = `lab_scores_${course._id}`;
            localStorage.setItem(scoresStorageKey, JSON.stringify(scores));
            console.log(
              `Updated lab scores in localStorage for course ${course._id}`
            );
          } catch (err) {
            console.error("Error updating lab scores in localStorage:", err);
          }
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

  const prepareScoresForSubmission = () => {
    const formattedScores: any[] = [];

    // Get supported components
    const supportedComponents = course
      ? Object.keys(course.evaluationScheme || {})
      : [];

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
            const testDate = studentScore.testDate || "";
            console.log(`Using test date for ${componentName}: ${testDate}`);

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
            // const testDate = studentScore.testDate || "";
            // Add the main component score with testDate
            const validatedOutOf50 = Math.min(studentScore.outOf50 || 0, 50);

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

                if (aWeight > 0) {
                  parts.push({
                    partName: "a",
                    maxMarks: aWeight,
                    obtainedMarks: questionScores.a || 0,
                  });
                }

                if (bWeight > 0) {
                  parts.push({
                    partName: "b",
                    maxMarks: bWeight,
                    obtainedMarks: questionScores.b || 0,
                  });
                }

                if (cWeight > 0) {
                  parts.push({
                    partName: "c",
                    maxMarks: cWeight,
                    obtainedMarks: questionScores.c || 0,
                  });
                }

                if (dWeight > 0) {
                  parts.push({
                    partName: "d",
                    maxMarks: dWeight,
                    obtainedMarks: questionScores.d || 0,
                  });
                }

                if (parts.length > 0) {
                  questions.push({
                    questionNumber: actualQuestionNumber,
                    meta: {
                      component: componentName,
                      date: testDate,
                    },
                    parts,
                  });
                }
              }
            });

            // Add all questions to the aggregated list
            aggregatedQuestions = aggregatedQuestions.concat(questions);

            studentScores.push({
              componentName,
              maxMarks: 50,
              obtainedMarks: validatedOutOf50,
              testDate: testDate,
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
            // Log to verify correct dates are being sent
            console.log("Lab sessions being submitted:", sortedSessions);

            // Include date explicitly in each session
            labSessions = sortedSessions.map((session, position) => ({
              date: session.date, // Ensure date is explicitly included
              maxMarks: session.maxMarks || 10,
              obtainedMarks: session.obtainedMarks || 0,
              index: session.index !== undefined ? session.index : position,
            }));
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

    // Log scores before submission to check for correct lab dates
    formattedScores.forEach((data) => {
      if (data.scores) {
        data.scores.forEach((score: any) => {
          console.log(
            `Saving ${score.componentName} with date: ${
              score.testDate || "NO DATE"
            }`
          );
        });
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

      // Validate all scores before saving
      const validatedCAScores = validateAllScores();

      // Use validated scores when preparing data for submission
      const scoresToSubmit = prepareScoresForSubmission(validatedCAScores);
      scoresToSubmit.forEach((data) => {
        if (data.scores) {
          data.scores.forEach((score) => {
            console.log(
              `Saving ${score.componentName} with date: ${
                score.testDate || "NO DATE"
              }`
            );
          });
        }
      });

      await scoreService.updateCourseScores(course._id, scoresToSubmit);
      setSuccess("All scores saved successfully!");
      setLastSaved(new Date());

      // Update state with validated scores
      setCAScores(validatedCAScores);

      // Force reload scores after saving to ensure UI is updated with latest data
      await loadExistingScores();

      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      console.error("Error saving scores:", error);
      // Error handling...
    } finally {
      setSaving(false);
    }
  };

  const validateAllScores = () => {
    const validatedCAScores = { ...caScores };

    // Validate CA scores
    Object.keys(validatedCAScores).forEach((component) => {
      Object.keys(validatedCAScores[component]).forEach((studentId) => {
        // Apply strict validation for total scores
        const studentScore = validatedCAScores[component][studentId];

        // Cap at 50
        studentScore.outOf50 = Math.min(studentScore.outOf50 || 0, 50);

        // Recalculate outOf20
        try {
          const conversionFactor =
            getComponentScale(course.type, component).conversionFactor || 0.4;
          studentScore.outOf20 = Math.round(
            studentScore.outOf50 * conversionFactor
          );
        } catch (err) {
          console.warn(`Error calculating conversion:`, err);
          studentScore.outOf20 = Math.round(studentScore.outOf50 * 0.4);
        }

        // Check for zero-weighted parts
        const componentConfig = course?.componentConfigs?.[component];
        if (componentConfig?.partWeights) {
          const partWeights = componentConfig.partWeights;

          // For each question
          questionKeys.forEach((questionKey) => {
            const questionScores = studentScore[questionKey];

            // For each part (a, b, c, d)
            partKeys.forEach((partKey) => {
              const weightKey = `${questionKey}${partKey}` as any;
              const partWeight = partWeights[weightKey] || 0;

              // Zero out parts with zero weight
              if (partWeight <= 0) {
                (questionScores as any)[partKey] = 0;
              }
            });
          });
        }
      });
    });

    return validatedCAScores;
  };

  // ======================================
  // CSV Export Functionality – Export details based on active component
  // ======================================

  const handleExportCSV = () => {
    // CSV export logic - omitted for brevity
  };

  // UPDATED: Modified renderComponent to use the state and handlers from the top level
  const renderComponent = () => {
    const supportedComponents = Object.keys(course?.evaluationScheme || {});
    const isSupported =
      supportedComponents.includes(activeComponent) ||
      activeComponent === "TOTAL";

    if (!isSupported) {
      return (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Component {activeComponent} is not configured for this course type (
          {course?.type}). Please select another component.
        </Alert>
      );
    }
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
          key={`score-entry-${activeComponent}-${course._id}`}
          students={students}
          componentName={activeComponent}
          courseType={course.type}
          courseConfig={course.componentConfigs?.[activeComponent]} // Pass course-specific config
          onScoresChange={(scores) => {
            console.log(`Updating scores for ${activeComponent} only`);
            handleCAScoreChange(activeComponent, scores);
          }}
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
          courseId={course._id} // Pass courseId for localStorage access
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
