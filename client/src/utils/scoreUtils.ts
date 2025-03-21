import { CourseType } from "../types";

interface ComponentScaleConfig {
  maxMarks: number; // Maximum marks for this component
  passingMarks: number; // Passing threshold
  conversionFactor?: number; // For CA components: how to convert from the 50-point scale
  partWeights?: {
    // NEW: Support for individual part weights
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
}

interface CourseScaleConfig {
  [key: string]: ComponentScaleConfig | number;
  totalPassing: number;
}

// Default part weights (equal distribution of 50 marks across 20 parts = 2.5 each)
const DEFAULT_PART_WEIGHTS = {
  Ia: 2.5,
  Ib: 2.5,
  Ic: 2.5,
  Id: 2.5,
  IIa: 2.5,
  IIb: 2.5,
  IIc: 2.5,
  IId: 2.5,
  IIIa: 2.5,
  IIIb: 2.5,
  IIIc: 2.5,
  IIId: 2.5,
  IVa: 2.5,
  IVb: 2.5,
  IVc: 2.5,
  IVd: 2.5,
  Va: 2.5,
  Vb: 2.5,
  Vc: 2.5,
  Vd: 2.5,
};

// Configuration for each course type
export const COURSE_SCALES: Record<CourseType, CourseScaleConfig> = {
  PG: {
    CA1: {
      maxMarks: 40,
      passingMarks: 16,
      conversionFactor: 0.8,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    CA2: {
      maxMarks: 40,
      passingMarks: 16,
      conversionFactor: 0.8,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    ASSIGNMENT: { maxMarks: 20, passingMarks: 8 },
    totalPassing: 40,
  },
  "PG-Integrated": {
    CA1: {
      maxMarks: 30,
      passingMarks: 12,
      conversionFactor: 0.6,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    CA2: {
      maxMarks: 30,
      passingMarks: 12,
      conversionFactor: 0.6,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    LAB: { maxMarks: 30, passingMarks: 15 },
    ASSIGNMENT: { maxMarks: 10, passingMarks: 4 },
    totalPassing: 43,
  },
  UG: {
    CA1: {
      maxMarks: 25,
      passingMarks: 10,
      conversionFactor: 0.5,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    CA2: {
      maxMarks: 25,
      passingMarks: 10,
      conversionFactor: 0.5,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    CA3: {
      maxMarks: 25,
      passingMarks: 10,
      conversionFactor: 0.5,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    ASSIGNMENT: { maxMarks: 25, passingMarks: 10 },
    totalPassing: 40,
  },
  "UG-Integrated": {
    CA1: {
      maxMarks: 20,
      passingMarks: 8,
      conversionFactor: 0.4,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    CA2: {
      maxMarks: 20,
      passingMarks: 8,
      conversionFactor: 0.4,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    CA3: {
      maxMarks: 20,
      passingMarks: 8,
      conversionFactor: 0.4,
      partWeights: DEFAULT_PART_WEIGHTS,
    },
    LAB: { maxMarks: 30, passingMarks: 15 },
    ASSIGNMENT: { maxMarks: 10, passingMarks: 4 },
    totalPassing: 43,
  },
  "UG-Lab-Only": {
    LAB: { maxMarks: 100, passingMarks: 50 },
    totalPassing: 50,
  },
  "PG-Lab-Only": {
    LAB: { maxMarks: 100, passingMarks: 50 },
    totalPassing: 50,
  },
};

/**
 * Check if a component is supported by the given course type
 */
export function isComponentSupported(
  courseType: CourseType,
  componentName: string
): boolean {
  const courseScale = COURSE_SCALES[courseType];
  if (!courseScale) {
    return false;
  }

  return Object.keys(courseScale)
    .filter((key) => key !== "totalPassing")
    .includes(componentName);
}

/**
 * Get the scale configuration for a component based on course type
 * Now supports course-specific configuration with part weights
 */
export function getComponentScale(
  courseType: CourseType,
  componentName: string,
  courseConfig?: any // NEW: Add course-specific config parameter
): ComponentScaleConfig {
  // Normalize component name and course type to handle case differences
  const normalizedComponentName = componentName.toUpperCase();
  const normalizedCourseType = courseType.toUpperCase();

  // If this is a LAB component for a UG course (not integrated), provide safe defaults
  // instead of throwing an error that could break the application
  if (normalizedComponentName === "LAB" && normalizedCourseType === "UG") {
    console.warn(
      `LAB component requested for UG course type - providing safe defaults`
    );
    return { maxMarks: 0, passingMarks: 0 };
  }

  const courseScale = COURSE_SCALES[courseType];
  if (!courseScale) {
    console.error(`Unknown course type: ${courseType}`);
    return { maxMarks: 100, passingMarks: 40 };
  }

  // Check if component exists for this course type
  const supportedComponents = Object.keys(courseScale).filter(
    (key) => key !== "totalPassing"
  );

  if (!supportedComponents.includes(componentName)) {
    console.error(
      `Component ${componentName} not configured for course type ${courseType}`
    );
    return { maxMarks: 0, passingMarks: 0 };
  }

  const config = courseScale[componentName];
  if (!config || typeof config === "number") {
    console.error(
      `Unknown component ${componentName} for course type ${courseType}`
    );
    return { maxMarks: 100, passingMarks: 40 };
  }

  // NEW: If course-specific part weights are provided, use them
  if (
    courseConfig &&
    courseConfig.partWeights &&
    componentName.startsWith("CA")
  ) {
    return {
      ...config,
      partWeights: courseConfig.partWeights,
    };
  }

  return config;
}

/**
 * Get the passing threshold for a course
 */
export function getCourseTotalPassingMarks(courseType: CourseType): number {
  if (!COURSE_SCALES[courseType]) {
    console.error(`Unknown course type: ${courseType}`);
    return 40;
  }

  return COURSE_SCALES[courseType].totalPassing as number;
}

/**
 * Convert a 50-point CA score to the appropriate scale based on course type
 */
export function convertCAScore(
  score: number,
  courseType: CourseType,
  componentName: string
): number {
  try {
    const config = getComponentScale(courseType, componentName);
    if (config.conversionFactor === undefined) {
      return score; // No conversion needed
    }

    return Math.round(score * config.conversionFactor);
  } catch (err) {
    console.warn(`Error converting ${componentName} score:`, err);
    // Default to no conversion if there's an error
    return score;
  }
}

/**
 * Converts the average lab session score to the appropriate scale based on course type
 *
 * @param {number} averageScore - The average score from all lab sessions (typically out of 10)
 * @param {string} courseType - The type of course
 * @returns {number} - The properly scaled lab score
 */
export const convertLabScore = (
  averageScore: number,
  courseType: string
): number => {
  // Default to 0 if no score
  if (!averageScore || isNaN(averageScore)) return 0;

  try {
    // Normalize courseType for case-insensitive comparison
    const courseTypeLower = courseType.toLowerCase();

    // For lab-only courses, scale to 100
    if (
      courseTypeLower === "ug-lab-only" ||
      courseTypeLower === "pg-lab-only"
    ) {
      // Scale from out of 10 to out of 100
      return Math.round(averageScore * 10);
    }
    // For integrated courses, scale to 30
    else if (
      courseTypeLower === "ug-integrated" ||
      courseTypeLower === "pg-integrated"
    ) {
      // Scale from out of 10 to out of 30
      return Math.round(averageScore * 3);
    }
    // For regular courses with no LAB component
    else {
      // Just return the average, since LAB shouldn't be used
      console.warn(`LAB component not supported for course type ${courseType}`);
      return averageScore;
    }
  } catch (err) {
    console.warn(`Error converting lab score for ${courseType}:`, err);
    // Default to just returning the score
    return averageScore;
  }
};

/**
 * Get max marks for a specific question part based on component configuration
 */
export function getPartMaxMarks(
  courseType: CourseType,
  componentName: string,
  question: string,
  part: string,
  courseConfig?: any
): number {
  try {
    // Get component configuration (default or course-specific)
    const config = getComponentScale(courseType, componentName, courseConfig);

    // If no part weights available, return default
    if (!config.partWeights) return 2.5; // Default value (50/20)

    // Create the part key (e.g., "Ia", "IIb")
    const partKey = `${question}${part}` as keyof typeof config.partWeights;

    // Return the specific part weight
    return config.partWeights[partKey] || 2.5;
  } catch (err) {
    console.warn(`Error getting part max marks:`, err);
    // Default value if error occurs
    return 2.5;
  }
}
