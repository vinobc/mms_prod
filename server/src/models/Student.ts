import mongoose, { Schema, Document } from "mongoose";

export type ProgramType =
  | "BBA"
  | "B.Com."
  | "B.Tech (CSE)"
  | "B.Tech (AI&ML)"
  | "B.Tech CSE (AI & ML)"
  | "B.Tech CSE (IoT)"
  | "B.Tech CSE (Robotics)"
  | "B.Tech.(Biotechnology)"
  | "B.Pharm"
  | "BA Applied Psychology"
  | "B.Sc. Clinical Psychology"
  | "BA LLB"
  | "BA"
  | "B.Sc."
  | "B.A. LLB"
  | "B.Des."
  | "BCA"
  | "M.Sc. Data Science"
  | "M.Sc. Cyber Security"
  | "M.Tech."
  | "MCA"
  | "LLM"
  | "MBA"
  | "M.Sc. Clinical Psychology"
  | "M.Sc(Biotechnology)";

export interface IStudent extends Document {
  registrationNumber: string;
  name: string;
  program: ProgramType;
  school?: string; // Added school field
  courseIds: mongoose.Types.ObjectId[];
  semester: number;
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const programTypes = [
  "BBA",
  "B.Com.",
  "B.Tech (CSE)",
  "B.Tech (AI&ML)",
  "B.Tech CSE (AI & ML)",
  "B.Tech CSE (IoT)",
  "B.Tech CSE (Robotics)",
  "B.Tech.(Biotechnology)",
  "B.Pharm",
  "BA Applied Psychology",
  "B.Sc. Clinical Psychology",
  "BA LLB",
  "BA",
  "B.Sc.",
  "B.A. LLB",
  "B.Des.",
  "BCA",
  "M.Sc. Data Science",
  "M.Sc. Cyber Security",
  "M.Tech.",
  "MCA",
  "LLM",
  "MBA",
  "M.Sc. Clinical Psychology",
  "M.Sc(Biotechnology)",
];

const StudentSchema: Schema = new Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      unique: true,
      trim: true,
      index: true, // Add index for faster queries
    },
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    program: {
      type: String,
      required: [true, "Program is required"],
      validate: {
        validator: function (v: string) {
          // Allow any of the predefined program types
          if (programTypes.includes(v)) {
            return true;
          }

          // Convert to uppercase for case-insensitive comparison
          const upperValue = v.toUpperCase();
          const upperProgramTypes = programTypes.map((p) => p.toUpperCase());

          // Check if it's a close match
          return upperProgramTypes.some(
            (p) => upperValue.includes(p) || p.includes(upperValue)
          );
        },
        message:
          "Invalid program type. Please use one of the standard program formats.",
      },
    },
    school: {
      type: String,
      trim: true,
      // Not required
    },
    courseIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },
    ],
    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: [1, "Semester must be at least 1"],
      max: [8, "Semester cannot exceed 8"],
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
      match: [
        /^\d{4}-\d{2}$/,
        "Academic year must be in format YYYY-YY (e.g., 2023-24)",
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for better querying
StudentSchema.index({ program: 1, semester: 1 });
StudentSchema.index({ courseIds: 1 });
StudentSchema.index({ academicYear: 1 });

// Pre-save hook to ensure registrationNumber is unique
StudentSchema.pre("validate", async function (next) {
  try {
    const student = this as IStudent;

    // Check if there's an existing student with the same registration number
    const existingStudent = await mongoose.model("Student").findOne({
      registrationNumber: student.registrationNumber,
      _id: { $ne: student._id }, // Exclude current student
    });

    if (existingStudent) {
      const error = new Error(
        `A student with registration number ${student.registrationNumber} already exists`
      );
      return next(error);
    } else {
      return next();
    }
  } catch (error) {
    // Narrow the error type before passing it to next()
    if (error instanceof Error) {
      return next(error);
    } else {
      return next(new Error(String(error)));
    }
  }
});

// Create a method to get students by course
StudentSchema.statics.findByCourse = function (courseId: string) {
  return this.find({ courseIds: courseId }).sort({ registrationNumber: 1 });
};

// Create a virtual for full student details
StudentSchema.virtual("details").get(function (this: IStudent) {
  return `${this.registrationNumber} - ${this.name} (${this.program}, Semester ${this.semester})`;
});

export default mongoose.model<IStudent>("Student", StudentSchema);
