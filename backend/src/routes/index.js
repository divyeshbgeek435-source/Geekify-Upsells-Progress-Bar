import { Router } from "express";
import { createCrudController } from "../controllers/crudController.js";
import { tierWidgetSettingsController } from "../controllers/tierWidgetSettingsController.js";
import { AnnouncementBar } from "../models/AnnouncementBar.js";
import { CartAccessLog } from "../models/CartAccessLog.js";
import { ThresholdTier } from "../models/ThresholdTier.js";
import { TierWidgetSettings } from "../models/TierWidgetSettings.js";
import { createCrudRouter } from "./createCrudRouter.js";

const router = Router();

router.use(
  "/announcement-bars",
  createCrudRouter(createCrudController(AnnouncementBar)),
);
router.use("/threshold-tiers", createCrudRouter(createCrudController(ThresholdTier)));
router.use("/cart-access-logs", createCrudRouter(createCrudController(CartAccessLog)));
router.use(
  "/tier-widget-settings",
  createCrudRouter(createCrudController(TierWidgetSettings)),
);
router.get("/tier-widget-settings/shop/:shop", tierWidgetSettingsController.getByShop);
router.put(
  "/tier-widget-settings/shop/:shop",
  tierWidgetSettingsController.upsertByShop,
);
router.patch(
  "/tier-widget-settings/shop/:shop",
  tierWidgetSettingsController.upsertByShop,
);

export default router;
