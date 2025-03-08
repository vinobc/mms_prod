import mongoose, { Schema, Document } from "mongoose";

// For lab sessions
interface LabSession {
  date: string;
  maxMarks: number;
  obtainedMarks: number;
  index?: number; // Optional index for ordering
}

// For question parts
interface QuestionPart {
  partName: string; // e.g., 'a', 'b', 'c', 'd'
  maxMarks: number;
  obtainedMarks: number;
}

// For question metadata
interface QuestionMeta {
  component?: string;
  type?: string;
  date?: string;
}

// For questions with parts
interface Question {
  questionNumber: number;
  parts: QuestionPart[];
  meta?: QuestionMeta;
}

// Original ScoreComponent (keeping for backward compatibility)
interface ScoreComponent {
  componentName: string;
  maxMarks: number;
  obtainedMarks: number;
}

export interface IScore extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  academicYear: string;
  // Original scores array (keeping for backward compatibility)
  scores: ScoreComponent[];
  // New structure for detailed question-part scores
  questions?: Question[];
  // New structure for lab sessions
  lab_sessions?: LabSession[];
  totalMarks: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for lab sessions
const LabSessionSchema = new Schema({
  date: {
    type: String,
    required: true,
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 0,
  },
  obtainedMarks: {
    type: Number,
    required: true,
    min: 0,
  },
  index: {
    type: Number,
    default: 0,
  },
});

// Schema for question parts
const QuestionPartSchema = new Schema({
  partName: {
    type: String,
    required: true,
    trim: true,
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 0,
  },
  obtainedMarks: {
    type: Number,
    required: true,
    min: 0,
  },
});

// Schema for meta information
const MetaSchema = new Schema(
  {
    component: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    date: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// Schema for questions
const QuestionSchema = new Schema({
  questionNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  parts: [QuestionPartSchema],
  meta: {
    type: MetaSchema,
    required: false,
  },
});

const ScoreSchema: Schema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    // Original scores structure (for backward compatibility)
    scores: [
      {
        componentName: {
          type: String,
          required: true,
          trim: true,
        },
        maxMarks: {
          type: Number,
          required: true,
          min: 0,
        },
        obtainedMarks: {
          type: Number,
          required: true,
          min: 0,
          validate: {
            validator: function (this: any, value: number) {
              const score = this as ScoreComponent;
              return value <= score.maxMarks * 1.05; // Allow slight overage
            },
            message: "Obtained marks significantly exceed maximum marks",
          },
        },
      },
    ],
    // New questions structure
    questions: [QuestionSchema],
    // New lab sessions structure
    lab_sessions: [LabSessionSchema],
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate total marks
ScoreSchema.pre("save", function (this: IScore, next) {
  let total = this.scores.reduce(
    (total, score) => total + score.obtainedMarks,
    0
  );

  // Add totals from detailed questions if available
  if (this.questions && this.questions.length > 0) {
    const questionTotal = this.questions.reduce((qTotal, question) => {
      return (
        qTotal +
        question.parts.reduce((pTotal, part) => pTotal + part.obtainedMarks, 0)
      );
    }, 0);

    // Only add questionTotal if it's not already accounted for in scores
    if (this.scores.length === 0) {
      total = questionTotal;
    }
  }

  // Add totals from lab sessions if available
  if (this.lab_sessions && this.lab_sessions.length > 0) {
    const labTotal = this.lab_sessions.reduce(
      (total, session) => total + session.obtainedMarks,
      0
    );

    // Only add if there's no LAB component in scores already
    if (!this.scores.some((s) => s.componentName === "LAB")) {
      total += labTotal;
    }
  }

  this.totalMarks = total;
  next();
});

// Indexes for faster queries
ScoreSchema.index({ studentId: 1, courseId: 1 });
ScoreSchema.index({ courseId: 1 });
ScoreSchema.index({ academicYear: 1 });

export default mongoose.model<IScore>("Score", ScoreSchema);
