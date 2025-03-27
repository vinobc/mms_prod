// server/src/routes/attendanceRoutes.ts
import express, { Router } from "express";
import { attendanceController } from "../controllers/attendanceController";
import { protect, courseAuthorization } from "../middleware/authMiddleware";

const router: Router = express.Router();

type RequestHandler = (
  req: express.Request,
  res: express.Response
) => Promise<void>;

// All attendance routes require authentication and course authorization
router.get(
  "/course/:courseId",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  attendanceController.getAttendanceByCourse as RequestHandler
);

router.get(
  "/course/:courseId/summary",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  attendanceController.getAttendanceSummary as RequestHandler
);

router.get(
  "/course/:courseId/student/:studentId",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  attendanceController.getStudentAttendance as RequestHandler
);

router.post(
  "/course/:courseId",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  attendanceController.takeAttendance as RequestHandler
);

router.delete(
  "/course/:courseId",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  attendanceController.deleteAttendanceRecord as RequestHandler
);

router.put(
  "/course/:courseId",
  protect,
  (req, res, next) => courseAuthorization(req, res, next),
  attendanceController.modifyAttendance as RequestHandler
);

export default router;
