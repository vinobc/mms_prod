export type CourseType =
  | "PG"
  | "PG-Integrated"
  | "UG"
  | "UG-Integrated"
  | "UG-Lab-Only"
  | "PG-Lab-Only";

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

export interface EvaluationScheme {
  [key: string]: number;
}

export interface Course {
  _id: string;
  code: string;
  name: string;
  type: CourseType;
  slot: SlotType;
  semester: number;
  venue: string;
  // academicYear: string;
  evaluationScheme: EvaluationScheme;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Student {
  _id: string;
  registrationNumber: string;
  name: string;
  program: ProgramType;
  courseIds: string[];
  semester: number;
  academicYear: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Enhanced Score Types for Detailed Assessments
export interface QuestionScore {
  questionNumber: string; // I, II, III, etc. or a, b, c, d
  maxMarks: number;
  obtainedMarks: number;
}

export interface TestComponent {
  componentName: string; // CA1, CA2, etc.
  testDate: string;
  maxMarks: number;
  passingMarks: number;
  questions: QuestionScore[];
  totalObtained: number;
}

export interface LabSession {
  date: string;
  maxMarks: number;
  obtainedMarks: number;
}

export interface LabComponent {
  componentName: string; // LAB
  sessions: LabSession[];
  maxMarks: number;
  passingMarks: number;
  totalObtained: number;
}

export interface AssignmentComponent {
  componentName: string; // ASSIGNMENT
  maxMarks: number;
  passingMarks: number;
  obtainedMarks: number;
}

export interface DetailedScore {
  _id: string;
  studentId: string;
  courseId: string;
  academicYear: string;
  testComponents: TestComponent[];
  labComponents?: LabComponent[];
  assignmentComponents?: AssignmentComponent[];
  totalMarks: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// For backward compatibility
export interface Score {
  _id: string;
  studentId: string;
  courseId: string;
  academicYear: string;
  scores: {
    componentName: string;
    maxMarks: number;
    obtainedMarks: number;
  }[];
  totalMarks: number;
  createdAt?: Date;
  updatedAt?: Date;
}
