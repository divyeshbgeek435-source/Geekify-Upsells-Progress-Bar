import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function parseSort(sortQuery) {
  if (!sortQuery) return { createdAt: -1 };
  try {
    return JSON.parse(sortQuery);
  } catch {
    return { createdAt: -1 };
  }
}

function buildQuery(req) {
  const query = {};
  if (req.query.shop) query.shop = req.query.shop;
  if (req.query.active !== undefined) query.active = req.query.active === "true";
  return query;
}

export function createCrudController(Model) {
  return {
    create: asyncHandler(async (req, res) => {
      const doc = await Model.create(req.body);
      res.status(201).json({ success: true, data: doc });
    }),

    list: asyncHandler(async (req, res) => {
      const query = buildQuery(req);
      const limit = Number(req.query.limit || 100);
      const docs = await Model.find(query)
        .sort(parseSort(req.query.sort))
        .limit(limit);
      res.json({ success: true, data: docs });
    }),

    getById: asyncHandler(async (req, res) => {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid document id");
      }
      const doc = await Model.findById(id);
      if (!doc) {
        throw new ApiError(404, "Record not found");
      }
      res.json({ success: true, data: doc });
    }),

    updateById: asyncHandler(async (req, res) => {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid document id");
      }
      const doc = await Model.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!doc) {
        throw new ApiError(404, "Record not found");
      }
      res.json({ success: true, data: doc });
    }),

    removeById: asyncHandler(async (req, res) => {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid document id");
      }
      const doc = await Model.findByIdAndDelete(id);
      if (!doc) {
        throw new ApiError(404, "Record not found");
      }
      res.json({ success: true, data: doc });
    }),
  };
}
