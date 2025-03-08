import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Faculty from "../models/Faculty";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        isAdmin: boolean;
      };
    }
  }
}

// Verify JWT token middleware
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
        name: string;
        isAdmin: boolean;
      };

      // Add user to request
      req.user = decoded;

      next();
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
    return;
  }
};

// Admin middleware
export const admin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};

// Check course authorization middleware
export const courseAuthorization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip for admins (admins can access all courses)
    if (req.user?.isAdmin) {
      return next();
    }

    // Get courseId from params or body
    const courseId = req.params.courseId || req.params.id || req.body.courseId;

    if (!courseId) {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }

    // Find faculty and check course access
    const faculty = await Faculty.findById(req.user?.id);

    if (!faculty) {
      res.status(404).json({ message: "Faculty not found" });
      return;
    }

    // Check if faculty has access to this course
    const hasCourseAccess = faculty.courseIds.some(
      (id) => id.toString() === courseId
    );

    if (!hasCourseAccess) {
      res.status(403).json({
        message: "Not authorized to access this course",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Course authorization error:", error);
    res.status(500).json({ message: "Error checking course authorization" });
    return;
  }
};
