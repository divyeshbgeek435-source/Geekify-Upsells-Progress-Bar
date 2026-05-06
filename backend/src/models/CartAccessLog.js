import mongoose from "mongoose";

const cartAccessLogSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    itemCount: { type: Number, default: null },
    subtotalCents: { type: Number, default: null },
    currency: { type: String, default: null },
    pathname: { type: String, default: null },
    source: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

cartAccessLogSchema.index({ shop: 1, createdAt: -1 });

export const CartAccessLog = mongoose.model("CartAccessLog", cartAccessLogSchema);
