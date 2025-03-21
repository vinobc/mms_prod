import api from "./api";
import { Course } from "../types";

export const courseService = {
  getAllCourses: async () => {
    const response = await api.get("/api/courses");
    return response.data;
  },

  getCourse: async (id: string) => {
    const response = await api.get(`/api/courses/${id}`);
    return response.data;
  },

  createCourse: async (courseData: Partial<Course>) => {
    const response = await api.post("/api/courses", courseData);
    return response.data;
  },

  updateCourse: async (id: string, courseData: Partial<Course>) => {
    const response = await api.put(`/api/courses/${id}`, courseData);
    return response.data;
  },

  deleteCourse: async (id: string) => {
    const response = await api.delete(`/api/courses/${id}`);
    return response.data;
  },
};
