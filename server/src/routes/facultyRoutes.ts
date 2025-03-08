import express, { Router } from "express";
import { facultyController } from "../controllers/facultyController";
import { protect } from "../middleware/authMiddleware";

const router: Router = express.Router();

type RequestHandler = (
  req: express.Request,
  res: express.Response
) => Promise<void>;

// All faculty routes are protected
router.get(
  "/courses",
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    protect(req, res, next),
  facultyController.getAssignedCourses as RequestHandler
);

router.put(
  "/profile",
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    protect(req, res, next),
  facultyController.updateProfile as RequestHandler
);

export default router;
