import mongoose, { Schema, Document } from "mongoose";

// Define CourseType locally to avoid circular dependencies
export type CourseType =
  | "PG"
  | "PG-Integrated"
  | "UG"
  | "UG-Integrated"
  | "UG-Lab-Only"
  | "PG-Lab-Only";

// Define slot types
export type SlotType =
  | "A1"
  | "B1"
  | "C1"
  | "A2"
  | "B2"
  | "C2"
  | "A1+TA1"
  | "B1+TB1"
  | "C1+TC1"
  | "A2+TA2"
  | "B2+TB2"
  | "C2+TC2"
  | "D1"
  | "E1"
  | "F1"
  | "G1"
  | "D2"
  | "E2"
  | "F2"
  | "G2"
  | "L1+L2"
  | "L3+L4"
  | "L5+L6"
  | "L7+L8"
  | "L9+L10"
  | "L11+L12"
  | "L13+L14"
  | "L15+L16"
  | "L17+L18"
  | "L19+L20"
  | "L21+L22"
  | "L23+L24"
  | "L25+L26"
  | "L27+L28"
  | "L29+L30"
  | "L31+L32"
  | "L33+L34"
  | "L35+L36"
  | "L37+L38"
  | "L39+L40";

export interface IEvaluationScheme {
  [key: string]: number;
}

export interface ICourse extends Document {
  code: string;
  name: string;
  type: CourseType;
  slot: SlotType[] | SlotType; // Updated to accept array or single value
  venue: string;
  // academicYear: string;
  evaluationScheme: IEvaluationScheme;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define an interface for the validator props
interface ValidatorProps {
  value: any;
  [key: string]: any;
}

const CourseSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "PG",
        "PG-Integrated",
        "UG",
        "UG-Integrated",
        "UG-Lab-Only",
        "PG-Lab-Only",
      ],
    },
    slot: {
      type: [String], // Changed from String to [String] to accept an array
      required: true,
      validate: {
        validator: function(v: any) {
          // For single value or array, each value must be in the enum
          const slots = Array.isArray(v) ? v : [v];
          const validSlots = [
            "A1", "B1", "C1", "A2", "B2", "C2",
            "A1+TA1", "B1+TB1", "C1+TC1", "A2+TA2", "B2+TB2", "C2+TC2",
            "D1", "E1", "F1", "G1", "D2", "E2", "F2", "G2",
            "L1+L2", "L3+L4", "L5+L6", "L7+L8", "L9+L10",
            "L11+L12", "L13+L14", "L15+L16", "L17+L18", "L19+L20",
            "L21+L22", "L23+L24", "L25+L26", "L27+L28", "L29+L30",
            "L31+L32", "L33+L34", "L35+L36", "L37+L38", "L39+L40"
          ];
          return slots.every((slot: string) => validSlots.includes(slot));
        },
        message: (props: ValidatorProps) => `${props.value} is not a valid slot!`
      }
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    // academicYear: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    evaluationScheme: {
      type: Map,
      of: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICourse>("Course", CourseSchema);
