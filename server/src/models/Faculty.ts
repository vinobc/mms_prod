import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IFaculty extends Document {
  email: string;
  password: string;
  name: string;
  department: string;
  courseIds: mongoose.Types.ObjectId[];
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const FacultySchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    courseIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
        default: [],
      },
    ],
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
FacultySchema.pre<IFaculty>("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
FacultySchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IFaculty>("Faculty", FacultySchema);
