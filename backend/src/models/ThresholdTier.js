import mongoose from "mongoose";

const thresholdTierSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    name: { type: String, required: true },
    minSubtotal: { type: Number, required: true },
    rewardType: { type: String, required: true },
    discountPercent: { type: Number, default: null },
    message: { type: String, default: "" },
    position: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

thresholdTierSchema.index({ shop: 1, active: 1, position: 1 });

export const ThresholdTier = mongoose.model("ThresholdTier", thresholdTierSchema);
