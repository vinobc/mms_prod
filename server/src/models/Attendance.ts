
// server/src/models/Attendance.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAttendanceRecord {
  date: Date;
  startTime?: string; // New field for start time (e.g., "09:00")
  endTime?: string; // New field for end time (e.g., "09:50")
  status: "present" | "absent";
  component?: "theory" | "lab"; // For integrated courses
  remarks?: string;
}

export interface IAttendance extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  academicYear: string;
  records: IAttendanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceRecordSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: false,
    match: [
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Start time must be in HH:MM format",
    ],
  },
  endTime: {
    type: String,
    required: false,
    match: [
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "End time must be in HH:MM format",
    ],
  },
  status: {
    type: String,
    required: true,
    enum: ["present", "absent"],
  },
  component: {
    type: String,
    enum: ["theory", "lab"],
    required: false,
  },
  remarks: {
    type: String,
    required: false,
  },
});

const AttendanceSchema: Schema = new Schema(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    records: [AttendanceRecordSchema],
  },
  {
    timestamps: true,
  }
);

// Create compound indexes for faster queries
AttendanceSchema.index(
  { courseId: 1, studentId: 1, academicYear: 1 },
  { unique: true }
);
AttendanceSchema.index({ courseId: 1 });
AttendanceSchema.index({ studentId: 1 });

export default mongoose.model<IAttendance>("Attendance", AttendanceSchema);
