import { TierWidgetSettings } from "../models/TierWidgetSettings.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const tierWidgetSettingsController = {
  getByShop: asyncHandler(async (req, res) => {
    const { shop } = req.params;
    const doc = await TierWidgetSettings.findOne({ shop });
    res.json({ success: true, data: doc });
  }),

  upsertByShop: asyncHandler(async (req, res) => {
    const { shop } = req.params;
    const doc = await TierWidgetSettings.findOneAndUpdate(
      { shop },
      { ...req.body, shop },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json({ success: true, data: doc });
  }),
};
