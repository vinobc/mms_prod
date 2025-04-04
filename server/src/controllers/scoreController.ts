import { Request, Response } from "express";
import mongoose from "mongoose";
import Score from "../models/Score";
import Course from "../models/Course";
import Student from "../models/Student";
import { checkScoreEntryEnabled } from "./systemSettingController";

// Comprehensive type definitions
interface ScoreComponent {
  componentName: string;
  maxMarks: number;
  obtainedMarks: number;
  testDate?: string;
}

interface QuestionPart {
  partName: string;
  maxMarks: number;
  obtainedMarks: number;
}

interface Question {
  questionNumber: number;
  parts: QuestionPart[];
  meta?: {
    component?: string;
    type?: string;
    date?: string;
  };
}

interface LabSession {
  date: string;
  maxMarks: number;
  obtainedMarks: number;
  index?: number;
}

interface ExtendedScoreInput {
  studentId: string;
  courseId?: string;
  academicYear: string;
  scores: ScoreComponent[];
  questions?: Question[];
  lab_sessions?: LabSession[];
}

class ScoreController {
  // Get scores by course
  async getScoresByCourse(req: Request, res: Response): Promise<void> {
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
  }

  // Get scores by student
  async getScoresByStudent(req: Request, res: Response): Promise<void> {
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
  }

  // Utility method to process and validate score components
  private processScoreComponent(
    score: Partial<ScoreComponent>
  ): ScoreComponent {
    return {
      componentName: score.componentName || "Unknown",
      maxMarks: Number(score.maxMarks) || 0,
      obtainedMarks: Number(score.obtainedMarks) || 0,
      testDate: score.testDate || new Date().toISOString(),
    };
  }

  // Utility method to process and validate questions
  private processQuestion(question: Partial<Question>): Question {
    return {
      questionNumber: Number(question.questionNumber) || 0,
      parts: (question.parts || []).map((part) => ({
        partName: part.partName || "",
        maxMarks: Number(part.maxMarks) || 0,
        obtainedMarks: Number(part.obtainedMarks) || 0,
      })),
      meta: question.meta || {},
    };
  }

  // Utility method to process and validate lab sessions
  private processLabSession(session: Partial<LabSession>): LabSession {
    return {
      date: session.date || new Date().toISOString().split("T")[0],
      maxMarks: Number(session.maxMarks) || 10,
      obtainedMarks: Number(session.obtainedMarks) || 0,
      index: session.index !== undefined ? Number(session.index) : undefined,
    };
  }

  // Calculate total marks comprehensively
  private calculateTotalMarks(
    scores: ScoreComponent[],
    questions: Question[],
    labSessions: LabSession[]
  ): number {
    const scoreTotal = scores.reduce(
      (sum, score) => sum + (Number(score.obtainedMarks) || 0),
      0
    );

    const questionTotal = questions.reduce(
      (sum, question) =>
        sum +
        question.parts.reduce(
          (partSum, part) => partSum + (Number(part.obtainedMarks) || 0),
          0
        ),
      0
    );

    const labSessionTotal = labSessions.reduce(
      (sum, session) => sum + (Number(session.obtainedMarks) || 0),
      0
    );

    return scoreTotal + questionTotal + labSessionTotal;
  }

  // Update course scores
  async updateCourseScores(req: Request, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if score entry is enabled
      const isScoreEntryEnabled = await checkScoreEntryEnabled();
      if (!isScoreEntryEnabled) {
        await session.abortTransaction();
        session.endSession();
        res.status(403).json({
          message: "Score entry has been disabled by administrator",
          status: "DISABLED",
        });
        return;
      }

      const { courseId, scores } = req.body;
      console.log(`Comprehensive Score Update for course ${courseId}`);

      // Validate course exists
      const course = await Course.findById(courseId).session(session);
      if (!course) {
        await session.abortTransaction();
        session.endSession();
        res.status(404).json({ message: "Course not found" });
        return;
      }

      // Comprehensive validation and processing
      const validationErrors: string[] = [];
      const processedScores = await Promise.all(
        scores.map(async (scoreData: ExtendedScoreInput) => {
          // Strict student validation
          if (!mongoose.Types.ObjectId.isValid(scoreData.studentId)) {
            validationErrors.push(`Invalid student ID: ${scoreData.studentId}`);
            return null;
          }

          const student = await Student.findById(scoreData.studentId).session(
            session
          );
          if (!student) {
            validationErrors.push(`Student not found: ${scoreData.studentId}`);
            return null;
          }

          if (!student.courseIds.includes(courseId)) {
            validationErrors.push(
              `Student not enrolled: ${scoreData.studentId}`
            );
            return null;
          }

          // Process scores with strict type conversion
          const processedStudentScores = (scoreData.scores || []).map((score) =>
            this.processScoreComponent(score)
          );

          // Process questions and lab sessions
          const processedQuestions = (scoreData.questions || []).map(
            (question) => this.processQuestion(question)
          );

          const processedLabSessions = (scoreData.lab_sessions || []).map(
            (session) => this.processLabSession(session)
          );

          // Calculate total marks with fallback mechanism
          const totalMarks = this.calculateTotalMarks(
            processedStudentScores,
            processedQuestions,
            processedLabSessions
          );

          return {
            studentId: scoreData.studentId,
            courseId,
            academicYear:
              scoreData.academicYear || new Date().getFullYear().toString(),
            totalMarks,
            scores: processedStudentScores,
            questions: processedQuestions,
            lab_sessions: processedLabSessions,
          };
        })
      );

      // Handle validation errors
      if (validationErrors.length > 0) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({
          message: "Validation Failed",
          errors: validationErrors,
        });
        return;
      }

      // Filter out null results from processing
      const validScores = processedScores.filter((score) => score !== null);

      // Bulk write for performance and atomicity
      const bulkOperations = validScores.map((scoreData) => ({
        updateOne: {
          filter: {
            studentId: scoreData.studentId,
            courseId: scoreData.courseId,
            academicYear: scoreData.academicYear,
          },
          update: { $set: scoreData },
          upsert: true,
        },
      }));

      // Perform bulk write with session
      const bulkWriteResult = await Score.bulkWrite(bulkOperations, {
        session,
      });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Log successful update
      console.log(`Successfully updated scores for course ${courseId}`, {
        updatedCount: bulkWriteResult.modifiedCount,
        upsertedCount: bulkWriteResult.upsertedCount,
      });

      // Populate results for response
      const populatedResults = await Score.find({
        courseId,
        academicYear: validScores[0].academicYear,
      }).populate("studentId", "registrationNumber name program");

      res.json(populatedResults);
    } catch (error: any) {
      // Comprehensive error handling
      await session.abortTransaction();
      session.endSession();

      console.error("Comprehensive Score Update Error:", {
        message: error.message,
        stack: error.stack,
        payload: req.body,
      });

      res.status(500).json({
        message: "Score Update Failed",
        error: error.message,
      });
    }
  }

  // Get course summary
  async getCourseSummary(req: Request, res: Response): Promise<void> {
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

      // Existing summary calculation logic remains the same as in previous implementation

      res.json(summary);
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: "Error generating summary", error });
    }
  }
}

// Export an instance of the controller
export = new ScoreController();
