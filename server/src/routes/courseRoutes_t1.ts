import express, { Router, Request, Response } from "express";
import { courseController } from "../controllers/courseController";
import {
  protect,
  admin,
  courseAuthorization,
} from "../middleware/authMiddleware";

const router: Router = express.Router();

// Define RequestHandler type with void return type
type RequestHandler = (req: Request, res: Response) => Promise<void>;

// Public routes - none

// Protected routes
router.get("/", protect, courseController.getAllCourses as RequestHandler);

// Separate the middleware and handler for better type compatibility
router.get(
  "/:id",
  protect,
  (req: Request, res: Response, next: express.NextFunction) =>
    courseAuthorization(req, res, next),
  courseController.getCourse as RequestHandler
);

// Admin only routes
router.post(
  "/",
  protect,
  (req: Request, res: Response, next: express.NextFunction) =>
    admin(req, res, next),
  courseController.createCourse as RequestHandler
);

router.put(
  "/:id",
  protect,
  (req: Request, res: Response, next: express.NextFunction) =>
    admin(req, res, next),
  courseController.updateCourse as RequestHandler
);

router.delete(
  "/:id",
  protect,
  (req: Request, res: Response, next: express.NextFunction) =>
    admin(req, res, next),
  courseController.deleteCourse as RequestHandler
);

export default router;
