import express, { Router } from "express";
import { authController } from "../controllers/authController";
import { protect, admin } from "../middleware/authMiddleware";

const router: Router = express.Router();

type RequestHandler = (
  req: express.Request,
  res: express.Response
) => Promise<void>;

// Public routes
router.post("/register", authController.register as RequestHandler);
router.post("/login", authController.login as RequestHandler);
router.post("/admin", authController.createAdmin as RequestHandler);

// Protected routes
router.get(
  "/profile",
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    protect(req, res, next),
  authController.getProfile as RequestHandler
);

// Admin routes
router.get(
  "/faculties",
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    protect(req, res, next),
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    admin(req, res, next),
  authController.getAllFaculties as RequestHandler
);

router.post(
  "/assign-courses",
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    protect(req, res, next),
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    admin(req, res, next),
  authController.assignCourses as RequestHandler
);

export default router;
