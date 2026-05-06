import mongoose from "mongoose";

const announcementBarSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
    barType: { type: String, required: true },
    configJson: { type: String, default: "{}" },
    customHtml: { type: String, default: "" },
    customLiquid: { type: String, default: "" },
    customCss: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const AnnouncementBar = mongoose.model(
  "AnnouncementBar",
  announcementBarSchema,
);
