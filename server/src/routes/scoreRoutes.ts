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
  (req, res, next) =>
    scoreController
      .getScoresByCourse(req, res)
      .catch(next) as unknown as RequestHandler
);

router.get(
  "/student/:studentId",
  protect,
  (req, res, next) =>
    scoreController
      .getScoresByStudent(req, res)
      .catch(next) as unknown as RequestHandler
);

router.post(
  "/course",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  (req, res, next) =>
    scoreController
      .updateCourseScores(req, res)
      .catch(next) as unknown as RequestHandler
);

router.get(
  "/course/:courseId/summary",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  (req, res, next) =>
    scoreController
      .getCourseSummary(req, res)
      .catch(next) as unknown as RequestHandler
);

export default router;
