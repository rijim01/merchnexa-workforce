import mongoose from "mongoose";
import { config } from "./env.js";

export async function connectDB(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (!config.mongoUri) {
    console.warn("⚠️  [MongoDB Atlas] MONGODB_URI is not set in .env.");
    return false;
  }

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ [MongoDB Atlas] Connected to database: "${conn.connection.name}" at ${conn.connection.host}`);
    return true;
  } catch (error: any) {
    console.error("❌ [MongoDB Atlas] Connection failed:", error.message);
    return false;
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
