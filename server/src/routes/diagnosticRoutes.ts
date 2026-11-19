import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import mongoose from "mongoose";
import { google } from "googleapis";
import { config } from "../config/env.js";
import { getFirebaseAdmin } from "../config/firebase.js";
import { getSheetsClient } from "../config/sheets.js";
import { connectDB, isDbConnected } from "../config/db.js";
import { EmployeeModel } from "../models/Employee.js";
import { TaskModel } from "../models/Task.js";
import { SubmissionModel } from "../models/Submission.js";
import { TransactionModel } from "../models/Transaction.js";

export const diagnosticRouter = Router();

diagnosticRouter.get("/test-connections", async (req: Request, res: Response) => {
  const results: {
    timestamp: string;
    mongoAtlas: {
      status: "CONNECTED" | "ERROR" | "NOT_CONFIGURED";
      host?: string;
      database?: string;
      collections?: {
        employees: number;
        tasks: number;
        submissions: number;
        transactions: number;
      };
      error?: string;
    };
    firebase: {
      status: "CONNECTED" | "ERROR" | "NOT_CONFIGURED";
      projectId?: string;
      userCount?: number;
      users?: string[];
      error?: string;
    };
    googleSheets: {
      status: "CONNECTED" | "ERROR" | "NOT_CONFIGURED";
      spreadsheetId?: string;
      spreadsheetTitle?: string;
      tabsFound?: string[];
      missingTabs?: string[];
      writeTest?: "SUCCESS" | "FAILED";
      error?: string;
    };
  } = {
    timestamp: new Date().toISOString(),
    mongoAtlas: { status: "NOT_CONFIGURED" },
    firebase: { status: "NOT_CONFIGURED" },
    googleSheets: { status: "NOT_CONFIGURED" },
  };

  // 1. Test MongoDB Atlas Connection
  try {
    if (!config.mongoUri) {
      results.mongoAtlas = {
        status: "NOT_CONFIGURED",
        error: "MONGODB_URI is not set in .env or Render environment variables.",
      };
    } else {
      const connected = await connectDB();
      if (connected) {
        const [empCount, taskCount, subCount, txnCount] = await Promise.all([
          EmployeeModel.countDocuments().catch(() => 0),
          TaskModel.countDocuments().catch(() => 0),
          SubmissionModel.countDocuments().catch(() => 0),
          TransactionModel.countDocuments().catch(() => 0),
        ]);

        results.mongoAtlas = {
          status: "CONNECTED",
          host: mongoose.connection.host || "MongoDB Atlas Cluster",
          database: mongoose.connection.name || "merchnexa",
          collections: {
            employees: empCount,
            tasks: taskCount,
            submissions: subCount,
            transactions: txnCount,
          },
        };
      } else {
        results.mongoAtlas = {
          status: "ERROR",
          error: "Could not connect to MongoDB Atlas. Please check IP Whitelist (0.0.0.0/0) and credentials.",
        };
      }
    }
  } catch (mErr: any) {
    results.mongoAtlas = {
      status: "ERROR",
      error: mErr.message || "Failed to communicate with MongoDB Atlas",
    };
  }

  // 2. Test Firebase Admin SDK Connection
  try {
    const fbApp = getFirebaseAdmin();
    if (!fbApp) {
      results.firebase = {
        status: "NOT_CONFIGURED",
        error: "Firebase Admin credentials missing or incomplete in .env",
      };
    } else {
      const userRecords = await admin.auth().listUsers(10);
      results.firebase = {
        status: "CONNECTED",
        projectId: config.firebase.projectId,
        userCount: userRecords.users.length,
        users: userRecords.users.map((u) => u.email || u.uid),
      };
    }
  } catch (err: any) {
    console.error("Firebase Diagnostic Error:", err);
    results.firebase = {
      status: "ERROR",
      projectId: config.firebase.projectId,
      error: err.message || "Failed to communicate with Firebase Auth",
    };
  }

  // 3. Test Google Sheets Connection (as optional mirror)
  try {
    const sheets = getSheetsClient();
    if (!sheets || !config.google.spreadsheetId) {
      results.googleSheets = {
        status: "NOT_CONFIGURED",
        error: "Google Sheets credentials or GOOGLE_SPREADSHEET_ID missing in .env",
      };
    } else {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: config.google.spreadsheetId,
      });

      const title = meta.data.properties?.title || "Untitled Spreadsheet";
      const tabsFound = (meta.data.sheets || [])
        .map((s) => s.properties?.title)
        .filter(Boolean) as string[];

      results.googleSheets = {
        status: "CONNECTED",
        spreadsheetId: config.google.spreadsheetId,
        spreadsheetTitle: title,
        tabsFound,
      };
    }
  } catch (err: any) {
    results.googleSheets = {
      status: "ERROR",
      spreadsheetId: config.google.spreadsheetId,
      error: err.message || "Google Sheets mirror unavailable",
    };
  }

  const dbOk = results.mongoAtlas.status === "CONNECTED";
  const fbOk = results.firebase.status === "CONNECTED";

  res.status(dbOk && fbOk ? 200 : 207).json({
    success: dbOk && fbOk,
    summary:
      dbOk && fbOk
        ? "✓ MongoDB Atlas and Firebase Authentication are 100% operational!"
        : "⚠ Please check the service statuses below.",
    results,
  });
});
