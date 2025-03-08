import { Request, Response } from "express";
import Course, { ICourse } from "../models/Course";
import Faculty from "../models/Faculty";

export const courseController = {
  // Get all courses - filtered by faculty's assigned courses for non-admin users
  getAllCourses: async (req: Request, res: Response): Promise<void> => {
    try {
      // If user is admin, return all courses
      if (req.user?.isAdmin) {
        const courses = await Course.find().sort({ createdAt: -1 });
        res.json(courses);
        return;
      }

      // For non-admin faculty, only return their assigned courses
      const faculty = await Faculty.findById(req.user?.id);
      if (!faculty) {
        res.status(404).json({ message: "Faculty not found" });
        return;
      }

      // Get only the courses assigned to this faculty
      const courses = await Course.find({
        _id: { $in: faculty.courseIds },
      }).sort({ createdAt: -1 });

      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Error fetching courses", error });
    }
  },

  // Get a single course
  getCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      // If user is not admin, verify they have access to this course
      if (!req.user?.isAdmin) {
        const faculty = await Faculty.findById(req.user?.id);
        if (!faculty) {
          res.status(404).json({ message: "Faculty not found" });
          return;
        }

        // Check if faculty has access to this course
        const hasCourseAccess = faculty.courseIds.some(
          (id) => id.toString() === course._id.toString()
        );

        if (!hasCourseAccess) {
          res
            .status(403)
            .json({ message: "Not authorized to access this course" });
          return;
        }
      }

      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Error fetching course", error });
    }
  },

  // Create a new course (admin only)
  createCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const newCourse = new Course(req.body);
      const savedCourse = await newCourse.save();
      res.status(201).json(savedCourse);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(400).json({ message: "Error creating course", error });
    }
  },

  // Update a course (admin only)
  updateCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const updatedCourse = await Course.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updatedCourse) {
        res.status(404).json({ message: "Course not found" });
        return;
      }
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(400).json({ message: "Error updating course", error });
    }
  },

  // Delete a course (admin only)
  deleteCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedCourse = await Course.findByIdAndDelete(req.params.id);
      if (!deletedCourse) {
        res.status(404).json({ message: "Course not found" });
        return;
      }
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Error deleting course", error });
    }
  },
};
