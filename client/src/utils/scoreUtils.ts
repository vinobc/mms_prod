import { CourseType } from "../types";

interface ComponentScaleConfig {
  maxMarks: number; // Maximum marks for this component
  passingMarks: number; // Passing threshold
  conversionFactor?: number; // For CA components: how to convert from the 50-point scale
}

// interface CourseScaleConfig {
//   [key: string]: ComponentScaleConfig;
//   totalPassing: number;
// }
interface CourseScaleConfig {
  [key: string]: ComponentScaleConfig | number;
  totalPassing: number;
}

// Configuration for each course type
export const COURSE_SCALES: Record<CourseType, CourseScaleConfig> = {
  PG: {
    CA1: { maxMarks: 40, passingMarks: 16, conversionFactor: 0.8 }, // 50 -> 40
    CA2: { maxMarks: 40, passingMarks: 16, conversionFactor: 0.8 }, // 50 -> 40
    ASSIGNMENT: { maxMarks: 20, passingMarks: 8 },
    totalPassing: 40,
  },
  "PG-Integrated": {
    CA1: { maxMarks: 30, passingMarks: 12, conversionFactor: 0.6 }, // 50 -> 30
    CA2: { maxMarks: 30, passingMarks: 12, conversionFactor: 0.6 }, // 50 -> 30
    LAB: { maxMarks: 30, passingMarks: 15 },
    ASSIGNMENT: { maxMarks: 10, passingMarks: 4 },
    totalPassing: 43,
  },
  UG: {
    CA1: { maxMarks: 25, passingMarks: 10, conversionFactor: 0.5 }, // 50 -> 25
    CA2: { maxMarks: 25, passingMarks: 10, conversionFactor: 0.5 }, // 50 -> 25
    CA3: { maxMarks: 25, passingMarks: 10, conversionFactor: 0.5 }, // 50 -> 25
    ASSIGNMENT: { maxMarks: 25, passingMarks: 10 },
    totalPassing: 40,
  },
  "UG-Integrated": {
    CA1: { maxMarks: 20, passingMarks: 8, conversionFactor: 0.4 }, // 50 -> 20
    CA2: { maxMarks: 20, passingMarks: 8, conversionFactor: 0.4 }, // 50 -> 20
    CA3: { maxMarks: 20, passingMarks: 8, conversionFactor: 0.4 }, // 50 -> 20
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
 * Get the scale configuration for a component based on course type
 */
// export function getComponentScale(
//   courseType: CourseType,
//   componentName: string
// ): ComponentScaleConfig {
//   if (!COURSE_SCALES[courseType]) {
//     console.error(`Unknown course type: ${courseType}`);
//     return { maxMarks: 100, passingMarks: 40 };
//   }

//   if (!COURSE_SCALES[courseType][componentName]) {
//     console.error(
//       `Unknown component ${componentName} for course type ${courseType}`
//     );
//     return { maxMarks: 100, passingMarks: 40 };
//   }

//   return COURSE_SCALES[courseType][componentName];
// }

export function getComponentScale(
  courseType: CourseType,
  componentName: string
): ComponentScaleConfig {
  const courseScale = COURSE_SCALES[courseType];
  if (!courseScale) {
    console.error(`Unknown course type: ${courseType}`);
    return { maxMarks: 100, passingMarks: 40 };
  }

  const config = courseScale[componentName];
  if (!config || typeof config === "number") {
    console.error(
      `Unknown component ${componentName} for course type ${courseType}`
    );
    return { maxMarks: 100, passingMarks: 40 };
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

  return COURSE_SCALES[courseType].totalPassing;
}

/**
 * Convert a 50-point CA score to the appropriate scale based on course type
 */
export function convertCAScore(
  score: number,
  courseType: CourseType,
  componentName: string
): number {
  const config = getComponentScale(courseType, componentName);
  if (config.conversionFactor === undefined) {
    return score; // No conversion needed
  }

  return Math.round(score * config.conversionFactor);
}

/**
 * Convert a lab session average (0-10) to the appropriate lab scale
 */
export function convertLabScore(
  averageSessionScore: number,
  courseType: CourseType
): number {
  const config = getComponentScale(courseType, "LAB");

  // For lab-only courses, scale from 0-10 to 0-100 directly
  if (courseType === "UG-Lab-Only" || courseType === "PG-Lab-Only") {
    return Math.round((averageSessionScore / 10) * 100);
  }

  // For other courses, use the regular scaling
  return Math.round((averageSessionScore / 10) * config.maxMarks);
}
