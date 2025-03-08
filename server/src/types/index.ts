import { CourseType, IEvaluationScheme } from "../models/Course";

export type { CourseType, IEvaluationScheme };

// Original QuestionPartInput
export interface QuestionPartInput {
  partName: string;
  maxMarks: number;
  obtainedMarks: number;
}

// Add metadata for the question
export interface QuestionMeta {
  component?: string;
  type?: string;
  date?: string;
}

// Updated QuestionInput with meta property
export interface QuestionInput {
  questionNumber: number;
  parts: QuestionPartInput[];
  meta?: QuestionMeta; // Add this property
}

// Define a lab session type
export interface LabSessionInput {
  date: string;
  maxMarks: number;
  obtainedMarks: number;
  index?: number;
}

// Extended score input to include top-level questions and lab sessions
export interface ExtendedScoreInput {
  studentId: string;
  academicYear: string;
  scores: {
    componentName: string;
    maxMarks: number;
    obtainedMarks: number;
  }[];
  questions?: QuestionInput[];
  lab_sessions?: LabSessionInput[]; // Add this property
}

// Updated ProcessedQuestion with meta property
export interface ProcessedQuestion {
  questionNumber: number;
  parts: {
    partName: string;
    maxMarks: number;
    obtainedMarks: number;
  }[];
  meta?: QuestionMeta; // Add this property
}

// Original ScoreInput
export interface ScoreInput {
  studentId: string;
  academicYear: string;
  scores: {
    componentName: string;
    maxMarks: number;
    obtainedMarks: number;
  }[];
  questions?: QuestionInput[];
}
