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

// Define component configuration interface
export interface IComponentConfig {
  partWeights: {
    // Weights for each question part (should sum to 50)
    Ia: number;
    Ib: number;
    Ic: number;
    Id: number;
    IIa: number;
    IIb: number;
    IIc: number;
    IId: number;
    IIIa: number;
    IIIb: number;
    IIIc: number;
    IIId: number;
    IVa: number;
    IVb: number;
    IVc: number;
    IVd: number;
    Va: number;
    Vb: number;
    Vc: number;
    Vd: number;
  };
  isConfigured: boolean; // Flag to check if faculty has configured this component
}

export interface ICourse extends Document {
  code: string;
  name: string;
  type: CourseType;
  slot: SlotType[] | SlotType; // Updated to accept array or single value
  venue: string;
  // academicYear: string;
  evaluationScheme: IEvaluationScheme;
  // New field for component-specific configurations
  componentConfigs: {
    [key: string]: IComponentConfig; // Key is component name (CA1, CA2, CA3)
  };
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
        validator: function (v: any) {
          // For single value or array, each value must be in the enum
          const slots = Array.isArray(v) ? v : [v];
          const validSlots = [
            "A1",
            "B1",
            "C1",
            "A2",
            "B2",
            "C2",
            "A1+TA1",
            "B1+TB1",
            "C1+TC1",
            "A2+TA2",
            "B2+TB2",
            "C2+TC2",
            "D1",
            "E1",
            "F1",
            "G1",
            "D2",
            "E2",
            "F2",
            "G2",
            "L1+L2",
            "L3+L4",
            "L5+L6",
            "L7+L8",
            "L9+L10",
            "L11+L12",
            "L13+L14",
            "L15+L16",
            "L17+L18",
            "L19+L20",
            "L21+L22",
            "L23+L24",
            "L25+L26",
            "L27+L28",
            "L29+L30",
            "L31+L32",
            "L33+L34",
            "L35+L36",
            "L37+L38",
            "L39+L40",
          ];
          return slots.every((slot: string) => validSlots.includes(slot));
        },
        message: (props: ValidatorProps) =>
          `${props.value} is not a valid slot!`,
      },
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    evaluationScheme: {
      type: Map,
      of: Number,
      required: true,
    },
    // New field for component-specific configurations
    componentConfigs: {
      type: Map,
      of: {
        partWeights: {
          // Default all parts to 2.5 marks each (50 marks total / 20 parts)
          Ia: { type: Number, default: 2.5 },
          Ib: { type: Number, default: 2.5 },
          Ic: { type: Number, default: 2.5 },
          Id: { type: Number, default: 2.5 },
          IIa: { type: Number, default: 2.5 },
          IIb: { type: Number, default: 2.5 },
          IIc: { type: Number, default: 2.5 },
          IId: { type: Number, default: 2.5 },
          IIIa: { type: Number, default: 2.5 },
          IIIb: { type: Number, default: 2.5 },
          IIIc: { type: Number, default: 2.5 },
          IIId: { type: Number, default: 2.5 },
          IVa: { type: Number, default: 2.5 },
          IVb: { type: Number, default: 2.5 },
          IVc: { type: Number, default: 2.5 },
          IVd: { type: Number, default: 2.5 },
          Va: { type: Number, default: 2.5 },
          Vb: { type: Number, default: 2.5 },
          Vc: { type: Number, default: 2.5 },
          Vd: { type: Number, default: 2.5 },
        },
        isConfigured: { type: Boolean, default: false },
      },
      default: () => new Map(),
    },
  },
  {
    timestamps: true,
  }
);
export default mongoose.model<ICourse>("Course", CourseSchema);
