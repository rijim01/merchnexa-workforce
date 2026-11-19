import mongoose from "mongoose";
import { config } from "./env.js";

let isConnected = false;

export async function connectDB(): Promise<boolean> {
  if (isConnected) {
    return true;
  }

  if (!config.mongoUri) {
    console.warn("⚠️  [MongoDB Atlas] MONGODB_URI is not set in .env. Running in memory / local mode.");
    return false;
  }

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`✅ [MongoDB Atlas] Connected to database: ${conn.connection.name} at ${conn.connection.host}`);
    return true;
  } catch (error: any) {
    console.error("❌ [MongoDB Atlas] Connection failed:", error.message);
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
