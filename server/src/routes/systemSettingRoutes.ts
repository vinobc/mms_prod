import express, { Router } from "express";
import { systemSettingController } from "../controllers/systemSettingController";
import { protect, admin } from "../middleware/authMiddleware";

const router: Router = express.Router();

type RequestHandler = (
  req: express.Request,
  res: express.Response
) => Promise<void>;

// All routes require admin privileges except for checking if score entry is enabled
router.get(
  "/",
  protect,
  admin,
  systemSettingController.getAllSettings as RequestHandler
);

router.get(
  "/:key",
  protect,
  admin,
  systemSettingController.getSetting as RequestHandler
);

router.put(
  "/:key",
  protect,
  admin,
  systemSettingController.updateSetting as RequestHandler
);

// Public endpoint that can be accessed by any authenticated user
router.get(
  "/status/scoreEntry",
  protect,
  systemSettingController.isScoreEntryEnabled as RequestHandler
);

export default router;
