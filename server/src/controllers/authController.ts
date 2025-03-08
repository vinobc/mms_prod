import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Faculty, { IFaculty } from "../models/Faculty";
import mongoose from "mongoose";

// Create JWT token
const generateToken = (faculty: IFaculty): string => {
  return jwt.sign(
    {
      id: faculty._id,
      email: faculty.email,
      name: faculty.name,
      isAdmin: faculty.isAdmin,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1d" }
  );
};

export const authController = {
  // Register a new faculty
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name, department } = req.body;

      // Check if faculty already exists
      const existingFaculty = await Faculty.findOne({ email });
      if (existingFaculty) {
        res
          .status(400)
          .json({ message: "Faculty already exists with this email" });
        return;
      }

      // Create new faculty
      const faculty = new Faculty({
        email,
        password,
        name,
        department,
        isAdmin: false, // Default to non-admin
      });

      await faculty.save();

      // Generate token
      const token = generateToken(faculty);

      // Return user data and token
      res.status(201).json({
        _id: faculty._id,
        email: faculty.email,
        name: faculty.name,
        department: faculty.department,
        isAdmin: faculty.isAdmin,
        token,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error registering faculty", error: error.message });
    }
  },

  // Faculty login
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find faculty by email
      const faculty = await Faculty.findOne({ email });
      if (!faculty) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      // Check password
      const isMatch = await faculty.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      // Generate token
      const token = generateToken(faculty);

      // Return user data and token
      res.json({
        _id: faculty._id,
        email: faculty.email,
        name: faculty.name,
        department: faculty.department,
        isAdmin: faculty.isAdmin,
        token,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error logging in", error: error.message });
    }
  },

  // Get faculty profile
  getProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const faculty = await Faculty.findById(req.user?.id).select("-password");
      if (!faculty) {
        res.status(404).json({ message: "Faculty not found" });
        return;
      }
      res.json(faculty);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error fetching profile", error: error.message });
    }
  },

  // Admin: Get all faculties
  getAllFaculties: async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if the requesting user is an admin
      if (!req.user?.isAdmin) {
        res.status(403).json({ message: "Not authorized as an admin" });
        return;
      }

      const faculties = await Faculty.find()
        .select("-password")
        .sort({ createdAt: -1 });
      res.json(faculties);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error fetching faculties", error: error.message });
    }
  },

  // Admin: Assign courses to faculty
  assignCourses: async (req: Request, res: Response): Promise<void> => {
    try {
      const { facultyId, courseIds } = req.body;

      // Check if the requesting user is an admin
      if (!req.user?.isAdmin) {
        res.status(403).json({ message: "Not authorized as an admin" });
        return;
      }

      // Validate faculty ID
      if (!mongoose.Types.ObjectId.isValid(facultyId)) {
        res.status(400).json({ message: "Invalid faculty ID format" });
        return;
      }

      // Check if faculty exists
      const faculty = await Faculty.findById(facultyId);
      if (!faculty) {
        res.status(404).json({ message: "Faculty not found" });
        return;
      }

      // Validate course IDs if provided
      if (courseIds && Array.isArray(courseIds)) {
        const invalidIds = courseIds.filter(
          (id) => !mongoose.Types.ObjectId.isValid(id)
        );
        if (invalidIds.length > 0) {
          res.status(400).json({
            message: "One or more course IDs have invalid format",
            invalidIds,
          });
          return;
        }
      }

      // Update faculty with new course IDs
      faculty.courseIds = courseIds || [];
      await faculty.save();

      res.json({
        message: "Courses assigned successfully",
        faculty: {
          _id: faculty._id,
          email: faculty.email,
          name: faculty.name,
          department: faculty.department,
          courseIds: faculty.courseIds,
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error assigning courses", error: error.message });
    }
  },

  // Create admin user (for initial setup)
  createAdmin: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name, department, secretKey } = req.body;

      // Verify secret key for admin creation
      if (secretKey !== process.env.ADMIN_SECRET_KEY) {
        res.status(401).json({ message: "Invalid secret key" });
        return;
      }

      // Check if faculty already exists
      const existingFaculty = await Faculty.findOne({ email });
      if (existingFaculty) {
        res
          .status(400)
          .json({ message: "Faculty already exists with this email" });
        return;
      }

      // Create new admin faculty
      const admin = new Faculty({
        email,
        password,
        name,
        department,
        isAdmin: true,
      });

      await admin.save();

      res.status(201).json({
        message: "Admin created successfully",
        admin: {
          _id: admin._id,
          email: admin.email,
          name: admin.name,
          department: admin.department,
          isAdmin: admin.isAdmin,
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating admin", error: error.message });
    }
  },
};
