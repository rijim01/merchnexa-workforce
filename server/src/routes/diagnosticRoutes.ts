import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import { google } from "googleapis";
import { config } from "../config/env.js";
import { getFirebaseAdmin } from "../config/firebase.js";
import { getSheetsClient } from "../config/sheets.js";

export const diagnosticRouter = Router();

diagnosticRouter.get("/test-connections", async (req: Request, res: Response) => {
  const results: {
    timestamp: string;
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
    firebase: { status: "NOT_CONFIGURED" },
    googleSheets: { status: "NOT_CONFIGURED" },
  };

  // 1. Test Firebase Admin SDK Connection
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

  // 2. Test Google Sheets Connection
  try {
    const sheets = getSheetsClient();
    if (!sheets || !config.google.spreadsheetId) {
      results.googleSheets = {
        status: "NOT_CONFIGURED",
        error: "Google Sheets credentials or GOOGLE_SPREADSHEET_ID missing in .env",
      };
    } else {
      // Read spreadsheet metadata
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: config.google.spreadsheetId,
      });

      const title = meta.data.properties?.title || "Untitled Spreadsheet";
      const tabsFound = (meta.data.sheets || [])
        .map((s) => s.properties?.title)
        .filter(Boolean) as string[];

      const expectedTabs = [
        "Employees",
        "Tasks",
        "Transactions",
        "Submissions",
        "Applications",
        "AuditLogs",
      ];
      const missingTabs = expectedTabs.filter((t) => !tabsFound.includes(t));

      // Attempt write test to AuditLogs (if present) or first available tab
      let writeTest: "SUCCESS" | "FAILED" = "FAILED";
      const targetTab = tabsFound.includes("AuditLogs") ? "AuditLogs" : tabsFound[0];

      if (targetTab) {
        try {
          await sheets.spreadsheets.values.append({
            spreadsheetId: config.google.spreadsheetId,
            range: `${targetTab}!A:D`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [
                [
                  new Date().toISOString(),
                  "SYSTEM_DIAGNOSTIC",
                  "PING_TEST",
                  "Verified Firebase & Sheets live connectivity",
                ],
              ],
            },
          });
          writeTest = "SUCCESS";
        } catch (wErr: any) {
          console.error("Sheets write test failed:", wErr);
        }
      }

      results.googleSheets = {
        status: "CONNECTED",
        spreadsheetId: config.google.spreadsheetId,
        spreadsheetTitle: title,
        tabsFound,
        missingTabs: missingTabs.length > 0 ? missingTabs : undefined,
        writeTest,
      };
    }
  } catch (err: any) {
    console.error("Google Sheets Diagnostic Error:", err);
    let errMsg = err.message || "Failed to communicate with Google Sheets";
    if (err.code === 403 || errMsg.includes("permission")) {
      errMsg = `Permission Denied: Please share your Google Sheet with '${config.google.clientEmail}' as an Editor.`;
    } else if (err.code === 404 || errMsg.includes("not found")) {
      errMsg = `Spreadsheet Not Found: Please verify GOOGLE_SPREADSHEET_ID in .env.`;
    }
    results.googleSheets = {
      status: "ERROR",
      spreadsheetId: config.google.spreadsheetId,
      error: errMsg,
    };
  }

  const allPassed =
    results.firebase.status === "CONNECTED" &&
    results.googleSheets.status === "CONNECTED" &&
    results.googleSheets.writeTest === "SUCCESS";

  res.status(allPassed ? 200 : 207).json({
    success: allPassed,
    summary: allPassed
      ? "✓ Both Firebase Authentication and Google Sheets are 100% operational!"
      : "⚠ One or more cloud services reported an issue. See details below.",
    results,
  });
});
