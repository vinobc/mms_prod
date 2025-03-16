/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "./api";
import { Student } from "../types";

// Cache for storing recently retrieved students by registration number
const studentCache = {
  data: {} as Record<string, any>,
  set: (registrationNumber: string, student: any) => {
    studentCache.data[registrationNumber] = student;

    // Set expiration (clear after 5 minutes)
    setTimeout(() => {
      delete studentCache.data[registrationNumber];
    }, 5 * 60 * 1000);
  },
  get: (registrationNumber: string) => {
    return studentCache.data[registrationNumber];
  },
  clear: () => {
    studentCache.data = {};
  },
};

export const studentService = {
  // Get all students
  getAllStudents: async () => {
    try {
      const response = await api.get("/api/students");
      return response.data;
    } catch (error) {
      console.error("Error fetching all students:", error);
      throw error;
    }
  },

  // Find a student by registration number
  findByRegistrationNumber: async (registrationNumber: string) => {
    try {
      // Check cache first
      const cachedStudent = studentCache.get(registrationNumber);
      if (cachedStudent) {
        console.log(`Using cached student for ${registrationNumber}`);
        return cachedStudent;
      }

      // If not in cache, fetch from API
      const response = await api.get(
        `/api/students/registration/${registrationNumber}`
      );

      // Store in cache
      studentCache.set(registrationNumber, response.data);

      return response.data;
    } catch (error) {
      console.error(`Error finding student by registration number:`, error);
      throw error;
    }
  },

  // Get students for a specific course
  getStudentsByCourse: async (courseId: string) => {
    try {
      if (!courseId) {
        throw new Error("Course ID is required");
      }

      const response = await api.get(`/api/students/course/${courseId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching students for course ${courseId}:`, error);
      throw error;
    }
  },

  // Get a student by ID
  getStudent: async (id: string) => {
    try {
      if (!id) {
        throw new Error("Student ID is required");
      }

      const response = await api.get(`/api/students/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching student ${id}:`, error);
      throw error;
    }
  },

  // Create a new student
  createStudent: async (studentData: Partial<Student>) => {
    try {
      // Validate required fields
      if (!studentData.registrationNumber || !studentData.name) {
        throw new Error("Registration number and name are required");
      }

      // Make sure courseIds is an array of strings
      const data = {
        ...studentData,
        courseIds: Array.isArray(studentData.courseIds)
          ? studentData.courseIds.map((id) => String(id))
          : [],
      };

      // Try to find if student already exists
      try {
        const existingStudent = await studentService.findByRegistrationNumber(
          studentData.registrationNumber
        );

        // If this didn't throw an error, the student exists
        if (existingStudent) {
          console.log("Student exists, adding courses:", existingStudent);

          // Add all courses from the new request to this student
          for (const courseId of data.courseIds) {
            await studentService.addStudentToCourse(
              existingStudent._id,
              courseId
            );
          }

          return existingStudent;
        }
      } catch (error) {
        // If error, student doesn't exist, continue with creation
        console.log("Student not found, creating new:", error);
      }

      // Create new student
      const response = await api.post("/api/students", data);

      // Clear cache to ensure fresh data
      studentCache.clear();

      return response.data;
    } catch (error) {
      console.error("Error creating student:", error);

      // Handle special case for existing student
      // if (error.response?.status === 409) {
      //   throw new Error(
      //     `Student with registration number ${studentData.registrationNumber} already exists.`
      //   );
      // }

      // throw error;

      if ((error as any).response?.status === 409) {
        throw new Error(
          `Student with registration number ${studentData.registrationNumber} already exists.`
        );
      }
      throw error;
    }
  },

  // Update a student
  updateStudent: async (id: string, studentData: Partial<Student>) => {
    try {
      if (!id) {
        throw new Error("Student ID is required");
      }

      // Clean up the data
      const data = { ...studentData };

      // Remove _id if present to avoid conflicts
      if ("_id" in data) delete data._id;

      // Make sure courseIds is properly formatted if present
      if (data.courseIds) {
        data.courseIds = Array.isArray(data.courseIds)
          ? data.courseIds.map((id) => String(id))
          : [];
      }

      const response = await api.put(`/api/students/${id}`, data);

      // Clear cache to ensure fresh data
      studentCache.clear();

      return response.data;
    } catch (error) {
      console.error(`Error updating student ${id}:`, error);
      throw error;
    }
  },

  // Delete a student
  deleteStudent: async (id: string) => {
    try {
      if (!id) {
        throw new Error("Student ID is required");
      }

      const response = await api.delete(`/api/students/${id}`);

      // Clear cache to ensure fresh data
      studentCache.clear();

      return response.data;
    } catch (error) {
      console.error(`Error deleting student ${id}:`, error);
      throw error;
    }
  },

  // Add a student to a course
  addStudentToCourse: async (studentId: string, courseId: string) => {
    try {
      if (!studentId || !courseId) {
        throw new Error("Student ID and Course ID are required");
      }

      const response = await api.post("/api/students/add-to-course", {
        studentId,
        courseId,
      });

      // Clear cache to ensure fresh data
      studentCache.clear();

      return response.data;
    } catch (error) {
      console.error(
        `Error adding student ${studentId} to course ${courseId}:`,
        error
      );
      throw error;
    }
  },

  // Remove a student from a course
  removeStudentFromCourse: async (studentId: string, courseId: string) => {
    try {
      if (!studentId || !courseId) {
        throw new Error("Student ID and Course ID are required");
      }

      const response = await api.post("/api/students/remove-from-course", {
        studentId,
        courseId,
      });

      // Clear cache to ensure fresh data
      studentCache.clear();

      return response.data;
    } catch (error) {
      console.error(
        `Error removing student ${studentId} from course ${courseId}:`,
        error
      );
      throw error;
    }
  },

  // Bulk create students
  bulkCreateStudents: async (students: Partial<Student>[]) => {
    try {
      if (!Array.isArray(students) || students.length === 0) {
        throw new Error("Valid student data array is required");
      }

      // Ensure each student has the required fields and proper courseIds
      const data = students.map((student) => {
        if (!student.registrationNumber || !student.name) {
          throw new Error(
            "All students must have registration number and name"
          );
        }

        return {
          ...student,
          courseIds: Array.isArray(student.courseIds)
            ? student.courseIds.map((id) => String(id))
            : [],
        };
      });

      const response = await api.post("/api/students/bulk", { students: data });

      // Clear cache to ensure fresh data
      studentCache.clear();

      return response.data;
    } catch (error) {
      console.error("Error bulk creating students:", error);
      throw error;
    }
  },

  // Search students by keyword (name or registration number)
  searchStudents: async (keyword: string) => {
    try {
      if (!keyword || keyword.trim() === "") {
        return [];
      }

      // For now, we'll fetch all students and filter on the client
      // In a real implementation, this would be a proper API endpoint
      const allStudents = await studentService.getAllStudents();

      // Filter by name or registration number
      return allStudents.filter(
        (student: any) =>
          student.name.toLowerCase().includes(keyword.toLowerCase()) ||
          student.registrationNumber
            .toLowerCase()
            .includes(keyword.toLowerCase())
      );
    } catch (error) {
      console.error(`Error searching students:`, error);
      throw error;
    }
  },
};
