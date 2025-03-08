/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "./api";

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
      console.log("Updating scores for course:", courseId);
      console.log("Scores data:", scores);

      // Process scores to ensure zeros are properly handled
      const processedScores = scores.map((studentScore) => ({
        ...studentScore,
        scores: studentScore.scores.map(
          (score: { obtainedMarks: null | undefined }) => ({
            ...score,
            // Ensure obtainedMarks is a number, default to 0 if undefined/null
            obtainedMarks:
              score.obtainedMarks !== undefined && score.obtainedMarks !== null
                ? Number(score.obtainedMarks)
                : 0,
          })
        ),
      }));

      const response = await api.post("/api/scores/course", {
        courseId,
        scores: processedScores,
      });

      console.log("Update scores response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error updating course scores:", error);
      throw error;
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
