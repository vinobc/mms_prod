/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prefer-const */

/* eslint-disable @typescript-eslint/no-explicit-any */
// components/scores/DynamicScoreEntry.tsx
import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { Course, Student } from "../../types";
import { scoreService } from "../../services/scoreService";
import CAScoreEntryComponent from "./CAScoreEntryComponent";
import LabScoreEntryComponent from "./LabScoreEntryComponent";
import AssignmentScoreEntryComponent from "./AssignmentScoreEntryComponent";
import TotalScoreComponent from "./TotalScoreComponent";
import {
  getCourseTotalPassingMarks,
  getComponentScale,
} from "../../utils/scoreUtils";

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
  [key: string]: QuestionPartScores | number; // Add string index signature
}

interface DetailedScore {
  [studentId: string]: StudentDetailedScore;
}

interface LabSession {
  date: string;
  maxMarks: number;
  obtainedMarks: number;
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

const DynamicScoreEntry: React.FC<DynamicScoreEntryProps> = ({
  course,
  students,
  onSaveComplete,
}) => {
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

  useEffect(() => {
    if (!course) return;
    const components = Object.keys(course.evaluationScheme);
    if (components.length > 0 && !activeComponent) {
      setActiveComponent(components[0]);
    }
    loadExistingScores();
  }, [course, students]);

  const loadExistingScores = async () => {
    if (!course || students.length === 0) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const existingScores = await scoreService.getScoresByCourse(course._id);
      console.log("Loaded scores from server:", existingScores);

      const updatedCAScores: { [component: string]: DetailedScore } = {};
      const updatedLabScores: { [studentId: string]: LabScore } = {};
      const updatedAssignmentScores: { [studentId: string]: AssignmentScore } =
        {};

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
              if (component.componentName.startsWith("CA")) {
                if (!updatedCAScores[component.componentName]) {
                  updatedCAScores[component.componentName] = {};
                }

                // Initialize student CA score structure
                const studentCAScore: StudentDetailedScore = {
                  I: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  II: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  III: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  IV: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  V: { a: 0, b: 0, c: 0, d: 0, total: 0 },
                  outOf50: component.obtainedMarks || 0,
                  outOf20: 0,
                };

                // Apply conversion factor to calculate outOf20 score
                const courseType = course.type;
                const conversionFactor =
                  getComponentScale(courseType, component.componentName)
                    .conversionFactor || 0.4;
                studentCAScore.outOf20 = Math.round(
                  studentCAScore.outOf50 * conversionFactor
                );

                updatedCAScores[component.componentName][studentId] =
                  studentCAScore;
              } else if (component.componentName === "LAB") {
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
            });
          }

          // Process detailed question data if available
          if (
            scoreEntry.questions &&
            Array.isArray(scoreEntry.questions) &&
            scoreEntry.questions.length > 0
          ) {
            // Find all CA components in the scores array
            const caComponents: string[] = [];
            if (scoreEntry.scores && Array.isArray(scoreEntry.scores)) {
              scoreEntry.scores.forEach((score: any) => {
                if (score.componentName?.startsWith("CA")) {
                  caComponents.push(score.componentName);
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
              Object.keys(questionsByComponent).length === 0
            ) {
              questionsByComponent["CA1"] = [];
            }

            // Process each question
            scoreEntry.questions.forEach((question: any) => {
              // Skip questions that are lab sessions
              if (question.meta && question.meta.type === "lab_session") {
                return;
              }

              // Try to find which component this question belongs to
              let targetComponent: string | null = null;

              // First check meta.component if available
              if (question.meta && question.meta.component) {
                targetComponent = question.meta.component;
              }
              // Otherwise, guess based on question number
              else {
                const qNum = question.questionNumber || 0;

                // Determine which CA component based on question number range
                // Assuming:
                // - CA1: questions 1-5
                // - CA2: questions 6-10
                // - CA3: questions 11-15
                if (qNum >= 1 && qNum <= 5) {
                  targetComponent = caComponents[0] || "CA1";
                } else if (qNum >= 6 && qNum <= 10) {
                  targetComponent = caComponents[1] || "CA2";
                } else if (qNum >= 11 && qNum <= 15) {
                  targetComponent = caComponents[2] || "CA3";
                } else {
                  // Default to first component
                  targetComponent = caComponents[0] || "CA1";
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
                  };
                }

                // Extract question details
                questions.forEach((q: any) => {
                  if (!q.parts || !Array.isArray(q.parts)) {
                    console.warn("Question missing parts array:", q);
                    return;
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
                  const conversionFactor =
                    getComponentScale(course.type, componentName)
                      .conversionFactor || 0.4;
                  studentScores.outOf20 = Math.round(
                    calculatedTotal * conversionFactor
                  );
                }
              }
            );
          }

          // Process lab sessions if available
          if (
            scoreEntry.lab_sessions &&
            Array.isArray(scoreEntry.lab_sessions) &&
            scoreEntry.lab_sessions.length > 0
          ) {
            // If student has a LAB component, update with sessions
            if (updatedLabScores[studentId]) {
              updatedLabScores[studentId].sessions =
                scoreEntry.lab_sessions.map((session: any) => ({
                  date: session.date || new Date().toISOString().split("T")[0],
                  maxMarks: session.maxMarks || 10,
                  obtainedMarks: session.obtainedMarks || 0,
                }));
            } else {
              // Create a new lab component if none exists
              updatedLabScores[studentId] = {
                componentName: "LAB",
                sessions: scoreEntry.lab_sessions.map((session: any) => ({
                  date: session.date || new Date().toISOString().split("T")[0],
                  maxMarks: session.maxMarks || 10,
                  obtainedMarks: session.obtainedMarks || 0,
                })),
                maxMarks: 30, // Default max marks
                totalObtained: 0, // Will calculate below
              };
            }

            // Calculate total obtained score from sessions
            if (updatedLabScores[studentId].sessions.length > 0) {
              const totalObtained =
                scoreEntry.scores.find((s: any) => s.componentName === "LAB")
                  ?.obtainedMarks || 0;
              updatedLabScores[studentId].totalObtained = totalObtained;
            }
          }
          // Check for lab sessions in questions
          else if (
            scoreEntry.questions &&
            Array.isArray(scoreEntry.questions)
          ) {
            const labSessionQuestions = scoreEntry.questions.filter(
              (q: any) => q.meta && q.meta.type === "lab_session"
            );

            if (labSessionQuestions.length > 0 && updatedLabScores[studentId]) {
              updatedLabScores[studentId].sessions = labSessionQuestions.map(
                (q: any) => {
                  const obtainedMarks =
                    q.parts && q.parts.length > 0
                      ? Number(q.parts[0].obtainedMarks) || 0
                      : 0;

                  return {
                    date:
                      q.meta?.date || new Date().toISOString().split("T")[0],
                    maxMarks: 10,
                    obtainedMarks: obtainedMarks,
                  };
                }
              );
            }
            // If we have a LAB component but no sessions details, create default sessions
            else if (updatedLabScores[studentId]) {
              const labTotalScore =
                updatedLabScores[studentId].totalObtained || 0;

              // Create two default sessions
              updatedLabScores[studentId].sessions = [
                {
                  date: new Date().toISOString().split("T")[0],
                  maxMarks: 10,
                  obtainedMarks: Math.ceil(labTotalScore / 2),
                },
                {
                  date: new Date().toISOString().split("T")[0],
                  maxMarks: 10,
                  obtainedMarks: Math.floor(labTotalScore / 2),
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
      setLabScores(updatedLabScores);
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
  };

  const handleCAScoreChange = (component: string, scores: DetailedScore) => {
    setCAScores((prev) => ({
      ...prev,
      [component]: scores,
    }));
  };

  const handleLabScoreChange = (scores: { [studentId: string]: LabScore }) => {
    setLabScores(scores);
  };

  const handleAssignmentScoreChange = (scores: {
    [studentId: string]: AssignmentScore;
  }) => {
    setAssignmentScores(scores);
  };

  const prepareScoresForSubmission = () => {
    const formattedScores: any[] = [];

    students.forEach((student) => {
      try {
        let studentScores: any[] = [];
        let aggregatedQuestions: any[] = [];
        let labSessions: any[] = [];

        // Process CA scores (CA1, CA2, CA3)
        Object.keys(caScores).forEach((componentName) => {
          if (caScores[componentName] && caScores[componentName][student._id]) {
            const studentScore = caScores[componentName][student._id];
            const questions: any[] = [];

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

                questions.push({
                  questionNumber: actualQuestionNumber,
                  meta: { component: componentName },
                  parts: [
                    {
                      partName: "a",
                      maxMarks: 5,
                      obtainedMarks: questionScores.a || 0,
                    },
                    {
                      partName: "b",
                      maxMarks: 5,
                      obtainedMarks: questionScores.b || 0,
                    },
                    {
                      partName: "c",
                      maxMarks: 5,
                      obtainedMarks: questionScores.c || 0,
                    },
                    {
                      partName: "d",
                      maxMarks: 5,
                      obtainedMarks: questionScores.d || 0,
                    },
                  ],
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
            });
          }
        });

        // Process LAB scores
        if (labScores[student._id]) {
          const labScore = labScores[student._id];

          // Add the main LAB component score
          studentScores.push({
            componentName: "LAB",
            maxMarks: labScore.maxMarks,
            obtainedMarks: labScore.totalObtained || 0,
          });

          // Process lab sessions for storage
          if (labScore.sessions && labScore.sessions.length > 0) {
            // Add to lab_sessions array
            labSessions = labScore.sessions.map((session, index) => ({
              date: session.date,
              maxMarks: session.maxMarks || 10,
              obtainedMarks: session.obtainedMarks || 0,
              index: index,
            }));

            // Also represent lab sessions as questions for backward compatibility
            labScore.sessions.forEach((session, index) => {
              aggregatedQuestions.push({
                questionNumber: 20 + index, // Use high numbers to avoid conflicts
                meta: {
                  type: "lab_session",
                  date: session.date,
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

        // Process ASSIGNMENT scores
        if (assignmentScores[student._id]) {
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
            academicYear: student.academicYear,
            scores: studentScores,
            questions: aggregatedQuestions,
          };

          // If lab sessions exist, add them explicitly
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
    try {
      setSaving(true);
      setError(null);
      const scoresToSubmit = prepareScoresForSubmission();
      await scoreService.updateCourseScores(course._id, scoresToSubmit);
      setSuccess("All scores saved successfully!");
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: any) {
      console.error("Error saving scores:", error);
      setError(error.response?.data?.message || "Failed to save scores");
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
      const scaleConfig = getComponentScale(course.type, activeComponent);
      const maxMarks = scaleConfig.maxMarks;

      const headers = [
        "SNo",
        "Enrollment No",
        "Name",
        "Program",
        "Semester",
        "Academic Year",
      ];
      // For each question (Q1 to Q5), add columns for a, b, c, d, and total
      for (let q = 1; q <= 5; q++) {
        headers.push(`Q${q}_a`, `Q${q}_b`, `Q${q}_c`, `Q${q}_d`, `Q${q}_total`);
      }

      // Use dynamic maximum marks value based on course type
      headers.push(
        `Overall Score (OutOf${maxMarks})`,
        "Overall Score (OutOf50)",
        "Marks in Words"
      );

      const csvRows: (string | number)[][] = [];
      // Prepend course info at the top
      csvRows.push([
        `Course Code: ${course.code}`,
        `Course Name: ${course.name}`,
        `Course Type: ${course.type}`,
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
          student.semester,
          student.academicYear
        );
        const caData = caScores[activeComponent]?.[student._id];
        if (caData) {
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
          for (let i = 0; i < 28; i++) {
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
    }
    // --- LAB Export ---
    else if (activeComponent === "LAB") {
      // Determine maximum number of lab sessions among all students
      let maxSessions = 0;
      students.forEach((student) => {
        const labData = labScores[student._id];
        if (
          labData &&
          labData.sessions &&
          labData.sessions.length > maxSessions
        ) {
          maxSessions = labData.sessions.length;
        }
      });

      // Get LAB scale configuration
      const scaleConfig = getComponentScale(course.type, "LAB");
      const maxMarks = scaleConfig.maxMarks;

      // Construct headers: basic student info + dynamic lab session columns (only Date and Obtained)
      const headers = [
        "SNo",
        "Enrollment No",
        "Name",
        "Program",
        "Semester",
        "Academic Year",
      ];
      for (let i = 1; i <= maxSessions; i++) {
        headers.push(`Lab Session ${i} Date`, `Lab Session ${i} Obtained`);
      }
      headers.push(
        "Overall Lab Score (Obtained)",
        `Overall Lab Score (Max: ${maxMarks})`,
        "Marks in Words"
      );

      const csvRows: (string | number)[][] = [];
      csvRows.push([
        `Course Code: ${course.code}`,
        `Course Name: ${course.name}`,
        `Course Type: ${course.type}`,
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
          student.semester,
          student.academicYear
        );
        const labData = labScores[student._id];

        if (labData && labData.sessions && labData.sessions.length > 0) {
          for (let i = 0; i < maxSessions; i++) {
            if (i < labData.sessions.length) {
              const session = labData.sessions[i];
              row.push(session.date, session.obtainedMarks || 0);
            } else {
              row.push("", 0);
            }
          }
          row.push(
            labData.totalObtained || 0,
            labData.maxMarks || maxMarks,
            numberToWords(labData.totalObtained || 0)
          );
        } else {
          for (let i = 0; i < maxSessions; i++) {
            row.push("", 0);
          }
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
    }
    // --- ASSIGNMENT Export ---
    else if (activeComponent === "ASSIGNMENT") {
      // Get ASSIGNMENT scale configuration
      const scaleConfig = getComponentScale(course.type, "ASSIGNMENT");
      const maxMarks = scaleConfig.maxMarks;

      const headers = [
        "SNo",
        "Enrollment No",
        "Name",
        "Program",
        "Semester",
        "Academic Year",
        "Assignment Obtained",
        `Assignment Max Marks (${maxMarks})`,
        "Marks in Words",
      ];
      const csvRows: (string | number)[][] = [];
      csvRows.push([
        `Course Code: ${course.code}`,
        `Course Name: ${course.name}`,
        `Course Type: ${course.type}`,
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
          student.semester,
          student.academicYear
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

          // Add metadata row
          csvRows.push(
            `${escapeCSV("Course Code")}: ${escapeCSV(course.code)},${escapeCSV(
              "Course Name"
            )}: ${escapeCSV(course.name)},${escapeCSV(
              "Course Type"
            )}: ${escapeCSV(course.type)}`
          );
          csvRows.push("");

          // Define column headers
          const headers = [];
          headers.push(escapeCSV("SNo."));
          headers.push(escapeCSV("Academic_Year"));
          headers.push(escapeCSV("Program"));
          headers.push(escapeCSV("Enrollment No."));
          headers.push(escapeCSV("Name"));
          headers.push(escapeCSV("Semester"));

          // Get component headers properly formatted
          const components = Object.keys(course.evaluationScheme);
          components.forEach((comp) => {
            const scale = getComponentScale(course.type, comp);
            headers.push(
              escapeCSV(
                `${comp} (Out of ${scale.maxMarks}, Pass ${scale.passingMarks})`
              )
            );
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
            const scale = getComponentScale(course.type, componentName);
            return Math.round(rawScore * (scale.conversionFactor || 1));
          };

          // Process each student
          const passingThreshold = getCourseTotalPassingMarks(course.type);
          const labConstraintTypes = [
            "ug-integrated",
            "pg-integrated",
            "ug-lab-only",
            "pg-lab-only",
          ];

          students.forEach((student, index) => {
            const rowData = [];

            // Add basic student info
            rowData.push(escapeCSV(index + 1));
            rowData.push(escapeCSV(student.academicYear));
            rowData.push(escapeCSV(student.program));
            rowData.push(escapeCSV(student.registrationNumber));
            rowData.push(escapeCSV(student.name));
            rowData.push(escapeCSV(student.semester));

            // Process scores
            let totalScore = 0;
            components.forEach((componentName) => {
              const rawScore = getComponentScore(student._id, componentName);
              const scaledScore = scaleComponentScore(rawScore, componentName);
              rowData.push(escapeCSV(scaledScore));
              totalScore += scaledScore;
            });

            // Add total score
            rowData.push(escapeCSV(totalScore));

            // Calculate pass/fail status
            let status = "FAIL";
            const courseTypeLower = course.type.toLowerCase();

            if (labConstraintTypes.includes(courseTypeLower)) {
              // Check lab component if applicable
              const labIndex = components.indexOf("LAB");
              if (labIndex !== -1) {
                const labRaw = getComponentScore(student._id, "LAB");
                const labScale = getComponentScale(course.type, "LAB");
                const labScaled = scaleComponentScore(labRaw, "LAB");

                if (
                  labScaled >= labScale.maxMarks * 0.5 &&
                  totalScore >= passingThreshold
                ) {
                  status = "PASS";
                }
              } else if (totalScore >= passingThreshold) {
                status = "PASS";
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

  // ======================================

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
      return (
        <CAScoreEntryComponent
          students={students}
          componentName={activeComponent}
          courseType={course.type}
          onScoresChange={(scores) =>
            handleCAScoreChange(activeComponent, scores)
          }
          initialScores={caScores[activeComponent]}
        />
      );
    } else if (activeComponent === "LAB") {
      return (
        <LabScoreEntryComponent
          students={students}
          componentName="LAB"
          courseType={course.type}
          onScoresChange={handleLabScoreChange}
          initialScores={labScores}
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
                Type: {course?.type} | Slot: {course?.slot} | Venue:{" "}
                {course?.venue || "N/A"}
              </Typography>
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
                  saving || students.length === 0 || activeComponent === "TOTAL"
                }
                size="large"
              >
                {saving ? <CircularProgress size={24} /> : "SAVE ALL SCORES"}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleExportCSV}
                disabled={students.length === 0}
                size="large"
              >
                EXPORT CSV
              </Button>
            </Grid>
          </Grid>
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
