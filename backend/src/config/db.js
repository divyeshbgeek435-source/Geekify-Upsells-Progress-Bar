import mongoose from "mongoose";

export async function connectDatabase(mongoUri) {
  try {
    mongoose.set("strictQuery", true);
    const connection = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}
