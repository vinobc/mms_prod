import { Request, Response } from "express";
import Score, { IScore } from "../models/Score";
import Course from "../models/Course";
import Student from "../models/Student";
import mongoose from "mongoose";
import {
  ScoreInput,
  ExtendedScoreInput,
  ProcessedQuestion,
  QuestionInput,
  LabSessionInput,
} from "../types";

export default {
  // GET scores by course
  getScoresByCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const courseId = req.params.courseId;
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ message: "Invalid course ID format" });
        return;
      }
      const scores = await Score.find({ courseId })
        .populate("studentId", "registrationNumber name program")
        .populate("courseId", "code name type evaluationScheme")
        .sort({ "studentId.registrationNumber": 1 });
      res.json(scores);
    } catch (error) {
      console.error("Error fetching scores by course:", error);
      res.status(500).json({ message: "Error fetching scores", error });
    }
  },

  // GET scores by student
  getScoresByStudent: async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId = req.params.studentId;
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ message: "Invalid student ID format" });
        return;
      }
      const scores = await Score.find({ studentId })
        .populate("studentId", "registrationNumber name program")
        .populate("courseId", "code name type evaluationScheme");
      res.json(scores);
    } catch (error) {
      console.error("Error fetching scores by student:", error);
      res.status(500).json({ message: "Error fetching scores", error });
    }
  },

  // POST: Create or update scores for multiple students in a course
  updateCourseScores: async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId, scores } = req.body;
      console.log(`Updating scores for course ${courseId}:`, scores);

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ message: "Invalid course ID format" });
        return;
      }
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      const updatedScores = await Promise.all(
        scores.map(async (scoreData: ExtendedScoreInput) => {
          if (!mongoose.Types.ObjectId.isValid(scoreData.studentId)) {
            throw new Error(
              `Invalid student ID format: ${scoreData.studentId}`
            );
          }
          const student = await Student.findById(scoreData.studentId);
          if (!student) {
            throw new Error(`Student not found: ${scoreData.studentId}`);
          }
          if (!student.courseIds.includes(courseId)) {
            throw new Error(
              `Student ${scoreData.studentId} is not enrolled in this course`
            );
          }

          const filter = {
            studentId: scoreData.studentId,
            courseId: courseId,
            academicYear: scoreData.academicYear,
          };

          const processedScores = scoreData.scores
            ? scoreData.scores.map((score: any) => ({
                componentName: score.componentName,
                maxMarks: Number(score.maxMarks),
                obtainedMarks: Number(score.obtainedMarks) || 0,
              }))
            : [];

          // Process detailed questions and their parts
          const processedQuestions: ProcessedQuestion[] = [];
          if (scoreData.questions && scoreData.questions.length > 0) {
            scoreData.questions.forEach((question: QuestionInput) => {
              const processedQuestion: ProcessedQuestion = {
                questionNumber: Number(question.questionNumber),
                parts: question.parts.map((part) => ({
                  partName: part.partName,
                  maxMarks: Number(part.maxMarks),
                  obtainedMarks: Number(part.obtainedMarks) || 0,
                })),
              };

              // Add metadata if available
              if (question.meta) {
                processedQuestion.meta = {
                  component: question.meta.component,
                  type: question.meta.type,
                  date: question.meta.date,
                };
              }

              processedQuestions.push(processedQuestion);
            });
          }

          // Process lab sessions if provided
          const processedLabSessions: any[] = [];
          if (scoreData.lab_sessions && scoreData.lab_sessions.length > 0) {
            scoreData.lab_sessions.forEach(
              (session: LabSessionInput, index: number) => {
                processedLabSessions.push({
                  date: session.date || new Date().toISOString().split("T")[0],
                  maxMarks: Number(session.maxMarks) || 10,
                  obtainedMarks: Number(session.obtainedMarks) || 0,
                  index: index,
                });
              }
            );
          } else if (!processedLabSessions.length) {
            // Try to extract lab sessions from questions with "lab_session" type
            const labSessionQuestions = processedQuestions.filter(
              (q) => q.meta && q.meta.type === "lab_session"
            );

            if (labSessionQuestions.length > 0) {
              labSessionQuestions.forEach((q, index) => {
                // Extract the main score from the first part
                const obtainedMarks =
                  q.parts && q.parts.length > 0 ? q.parts[0].obtainedMarks : 0;

                processedLabSessions.push({
                  date: q.meta?.date || new Date().toISOString().split("T")[0],
                  maxMarks:
                    q.parts && q.parts.length > 0 ? q.parts[0].maxMarks : 10,
                  obtainedMarks: obtainedMarks,
                  index: index,
                });
              });
            }
          }

          // Calculate total marks from all components
          let totalMarks = 0;
          if (processedScores.length > 0) {
            totalMarks += processedScores.reduce(
              (sum: number, score: any) =>
                sum + (Number(score.obtainedMarks) || 0),
              0
            );
          }

          // Add marks from detailed questions only if not already counted in scores
          const questionComponentsTracked = new Set(
            processedScores.map((s: any) => s.componentName)
          );

          if (processedQuestions.length > 0) {
            const questionsByComponent: { [key: string]: number } = {};

            processedQuestions.forEach((q) => {
              // Skip lab session questions as they're handled separately
              if (q.meta && q.meta.type === "lab_session") return;

              const component = q.meta?.component || "Unknown";
              if (!questionsByComponent[component]) {
                questionsByComponent[component] = 0;
              }

              q.parts.forEach((part) => {
                questionsByComponent[component] += part.obtainedMarks;
              });
            });

            // Only add totals for components not already in processedScores
            Object.entries(questionsByComponent).forEach(
              ([component, marks]) => {
                if (!questionComponentsTracked.has(component)) {
                  totalMarks += marks;
                }
              }
            );
          }

          // Add marks from lab sessions if LAB component isn't already counted
          if (
            processedLabSessions.length > 0 &&
            !questionComponentsTracked.has("LAB")
          ) {
            const labTotal = processedLabSessions.reduce(
              (sum: number, session: any) =>
                sum + (Number(session.obtainedMarks) || 0),
              0
            );

            // For lab-only courses, we want the average, not the sum
            const labComponent = processedScores.find(
              (s: any) => s.componentName === "LAB"
            );

            // If lab component is already accounted for, don't add to total
            if (!labComponent) {
              totalMarks += labTotal;
            }
          }

          const updateData: {
            academicYear: string;
            totalMarks: number;
            scores?: any[];
            questions?: ProcessedQuestion[];
            lab_sessions?: any[];
          } = {
            academicYear: scoreData.academicYear,
            totalMarks,
          };

          if (processedScores.length > 0) {
            updateData.scores = processedScores;
          }
          if (processedQuestions.length > 0) {
            updateData.questions = processedQuestions;
          }
          if (processedLabSessions.length > 0) {
            updateData.lab_sessions = processedLabSessions;
          }

          return await Score.findOneAndUpdate(
            filter,
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
          ).populate("studentId", "registrationNumber name program");
        })
      );

      res.json(updatedScores);
    } catch (error: any) {
      console.error("Error updating scores:", error);
      res
        .status(400)
        .json({ message: "Error updating scores", error: error.message });
    }
  },

  // GET: Retrieve course summary
  getCourseSummary: async (req: Request, res: Response): Promise<void> => {
    try {
      const courseId = req.params.courseId;
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ message: "Invalid course ID format" });
        return;
      }
      const scores = await Score.find({ courseId })
        .populate("studentId", "registrationNumber name program")
        .populate("courseId", "code name type evaluationScheme");

      if (!scores || scores.length === 0) {
        res.json({
          totalStudents: 0,
          overallStats: { highest: 0, lowest: 0, average: 0 },
          componentStats: {},
          questionStats: {},
        });
        return;
      }

      const totalMarks = scores.map((s) => s.totalMarks);
      const summary = {
        totalStudents: scores.length,
        overallStats: {
          highest: Math.max(...totalMarks),
          lowest: Math.min(...totalMarks),
          average:
            totalMarks.reduce((acc, val) => acc + val, 0) / scores.length,
        },
        componentStats: {} as any,
        questionStats: {} as any,
      };

      if (scores.length > 0 && scores[0].scores.length > 0) {
        const componentScores: { [key: string]: number[] } = {};
        scores.forEach((scoreDoc) => {
          scoreDoc.scores.forEach((component) => {
            if (!componentScores[component.componentName]) {
              componentScores[component.componentName] = [];
            }
            componentScores[component.componentName].push(
              component.obtainedMarks
            );
          });
        });
        Object.entries(componentScores).forEach(([componentName, marks]) => {
          summary.componentStats[componentName] = {
            highest: Math.max(...marks),
            lowest: Math.min(...marks),
            average: marks.reduce((acc, val) => acc + val, 0) / marks.length,
          };
        });
      }

      if (
        scores.length > 0 &&
        scores.some((s: any) => s.questions && s.questions.length > 0)
      ) {
        const questionPartStats: { [key: string]: number[] } = {};
        scores.forEach((scoreDoc: any) => {
          if (scoreDoc.questions && scoreDoc.questions.length > 0) {
            scoreDoc.questions.forEach((question: any) => {
              question.parts.forEach((part: any) => {
                const key = `Q${question.questionNumber}${part.partName}`;
                if (!questionPartStats[key]) {
                  questionPartStats[key] = [];
                }
                questionPartStats[key].push(part.obtainedMarks);
              });
            });
          }
        });
        Object.entries(questionPartStats).forEach(([key, marks]) => {
          summary.questionStats[key] = {
            highest: Math.max(...marks),
            lowest: Math.min(...marks),
            average: marks.reduce((acc, val) => acc + val, 0) / marks.length,
            count: marks.length,
          };
        });
      }

      res.json(summary);
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: "Error generating summary", error });
    }
  },
};
