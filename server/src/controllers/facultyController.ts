import { Request, Response } from "express";
import Faculty from "../models/Faculty";
import Course from "../models/Course";
import mongoose from "mongoose";

export const facultyController = {
  // Get faculty's assigned courses
  getAssignedCourses: async (req: Request, res: Response): Promise<void> => {
    try {
      const facultyId = req.user?.id;

      // Find faculty
      const faculty = await Faculty.findById(facultyId);
      if (!faculty) {
        res.status(404).json({ message: "Faculty not found" });
        return;
      }

      // Get courses assigned to this faculty
      const courses = await Course.find({
        _id: { $in: faculty.courseIds },
      }).sort({ createdAt: -1 });

      res.json(courses);
    } catch (error) {
      console.error("Error fetching assigned courses:", error);
      res
        .status(500)
        .json({ message: "Error fetching assigned courses", error });
    }
  },

  // Update faculty profile
  updateProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const facultyId = req.user?.id;
      const { name, department, email, currentPassword, newPassword } =
        req.body;

      // Find faculty
      const faculty = await Faculty.findById(facultyId);
      if (!faculty) {
        res.status(404).json({ message: "Faculty not found" });
        return;
      }

      // Update basic profile info
      if (name) faculty.name = name;
      if (department) faculty.department = department;

      // If email is being updated, check if it's already in use
      if (email && email !== faculty.email) {
        const existingFaculty = await Faculty.findOne({ email });
        if (existingFaculty) {
          res.status(400).json({ message: "Email already in use" });
          return;
        }
        faculty.email = email;
      }

      // If password is being updated, verify current password
      if (currentPassword && newPassword) {
        const isMatch = await faculty.comparePassword(currentPassword);
        if (!isMatch) {
          res.status(401).json({ message: "Current password is incorrect" });
          return;
        }
        faculty.password = newPassword;
      }

      // Save updates
      const updatedFaculty = await faculty.save();

      res.json({
        _id: updatedFaculty._id,
        name: updatedFaculty.name,
        email: updatedFaculty.email,
        department: updatedFaculty.department,
        isAdmin: updatedFaculty.isAdmin,
      });
    } catch (error) {
      console.error("Error updating faculty profile:", error);
      res.status(500).json({ message: "Error updating profile", error });
    }
  },
};
