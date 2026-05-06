import mongoose from "mongoose";

const tierWidgetSettingsSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, unique: true },
    sequentialMsg1: {
      type: String,
      default: "Apply discount to unlock free shipping",
    },
    sequentialMsg2: {
      type: String,
      default: "Free shipping unlocked",
    },
    selectorTargets: {
      type: String,
      default:
        ".product__info-container, .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks",
    },
    nameTargetSelectors: {
      type: String,
      default:
        ".cart-drawer__content, .drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks",
    },
    sequentialTitle: { type: String, default: "Rewards progress" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const TierWidgetSettings = mongoose.model(
  "TierWidgetSettings",
  tierWidgetSettingsSchema,
);
