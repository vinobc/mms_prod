import express, { Router } from "express";
import scoreController from "../controllers/scoreController";
import { protect, courseAuthorization } from "../middleware/authMiddleware";

const router: Router = express.Router();

type RequestHandler = (
  req: express.Request,
  res: express.Response
) => Promise<void>;

router.get(
  "/course/:courseId",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  scoreController.getScoresByCourse as RequestHandler
);

router.get(
  "/student/:studentId",
  protect,
  scoreController.getScoresByStudent as RequestHandler
);

router.post(
  "/course",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  scoreController.updateCourseScores as RequestHandler
);

router.get(
  "/course/:courseId/summary",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  scoreController.getCourseSummary as RequestHandler
);

export default router;
