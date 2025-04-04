/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "./api";
import { validateScorePayload } from "../utils/scoreValidation"; // Recommend creating this utility

export const scoreService = {
  getScoresByCourse: async (courseId: string) => {
    try {
      const response = await api.get(`/api/scores/course/${courseId}`);
      console.log("Scores for course:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching scores by course:", error);
      throw error;
    }
  },

  getScoresByStudent: async (studentId: string) => {
    try {
      const response = await api.get(`/api/scores/student/${studentId}`);
      console.log("Scores for student:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching scores by student:", error);
      throw error;
    }
  },

  updateCourseScores: async (courseId: string, scores: any[]) => {
    try {
      // Comprehensive payload validation and processing
      const validatedScores = scores.map((studentScore) => {
        // Validate and sanitize student score data
        return {
          ...studentScore,
          scores: (studentScore.scores || []).map((score) => ({
            ...score,
            componentName: score.componentName,
            maxMarks: Number(score.maxMarks) || 0,
            obtainedMarks: Number(score.obtainedMarks) || 0,
            testDate: score.testDate || new Date().toISOString(),
          })),
          questions: (studentScore.questions || []).map((question) => ({
            ...question,
            questionNumber: Number(question.questionNumber) || 0,
            parts: (question.parts || []).map((part) => ({
              ...part,
              maxMarks: Number(part.maxMarks) || 0,
              obtainedMarks: Number(part.obtainedMarks) || 0,
            })),
          })),
          lab_sessions: (studentScore.lab_sessions || []).map((session) => ({
            ...session,
            maxMarks: Number(session.maxMarks) || 10,
            obtainedMarks: Number(session.obtainedMarks) || 0,
            date: session.date || new Date().toISOString().split("T")[0],
          })),
        };
      });

      // Log payload for debugging
      console.log("Score Update Payload:", {
        courseId,
        studentCount: validatedScores.length,
        componentsPerStudent: validatedScores.map((s) => s.scores.length),
      });

      // Perform API call with validated payload
      const response = await api.post("/api/scores/course", {
        courseId,
        scores: validatedScores,
      });

      console.log("Score Update Response:", {
        updatedStudentCount: response.data.length,
        firstStudentId: response.data[0]?.studentId,
      });

      return response.data;
    } catch (error: any) {
      console.error("Comprehensive Score Update Error:", {
        message: error.message,
        response: error.response?.data,
        payload: {
          courseId,
          studentCount: scores.length,
        },
      });

      // Enhanced error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(
          error.response.data.message ||
            "Failed to update scores. Please try again."
        );
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error(
          "No response received from server. Please check your connection."
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error("Error preparing score update request.");
      }
    }
  },

  getCourseSummary: async (courseId: string) => {
    try {
      const response = await api.get(`/api/scores/course/${courseId}/summary`);
      console.log("Course summary:", response.data);

      // Ensure proper formatting for empty summaries
      if (
        !response.data ||
        !response.data.componentStats ||
        Object.keys(response.data.componentStats).length === 0
      ) {
        return {
          totalStudents: response.data?.totalStudents || 0,
          overallStats: {
            highest: response.data?.overallStats?.highest || 0,
            lowest: response.data?.overallStats?.lowest || 0,
            average: response.data?.overallStats?.average || 0,
          },
          componentStats: {},
        };
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching course summary:", error);
      throw error;
    }
  },
};
