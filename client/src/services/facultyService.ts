import api from "./api";
import { Course } from "../types";

export interface FacultyData {
  _id: string;
  name: string;
  email: string;
  department: string;
  isAdmin: boolean;
  courseIds: string[];
}

export const facultyService = {
  // Get courses assigned to the logged-in faculty
  getAssignedCourses: async (): Promise<Course[]> => {
    try {
      const response = await api.get("/api/faculty/courses");
      return response.data;
    } catch (error) {
      console.error("Error fetching assigned courses:", error);
      throw error;
    }
  },

  // Admin: Get all faculties
  getAllFaculties: async (): Promise<FacultyData[]> => {
    try {
      const response = await api.get("/api/auth/faculties");
      return response.data;
    } catch (error) {
      console.error("Error fetching faculties:", error);
      throw error;
    }
  },

  // Admin: Assign courses to faculty
  assignCourses: async (
    facultyId: string,
    courseIds: string[]
  ): Promise<{ message: string; faculty: FacultyData }> => {
    try {
      const response = await api.post("/api/auth/assign-courses", {
        facultyId,
        courseIds,
      });
      return response.data;
    } catch (error) {
      console.error("Error assigning courses:", error);
      throw error;
    }
  },
};
