import { google } from "googleapis";
import { config } from "./env.js";

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

export function getSheetsClient() {
  if (!sheetsClient) {
    if (config.google.clientEmail && config.google.privateKey) {
      const auth = new google.auth.JWT({
        email: config.google.clientEmail,
        key: config.google.privateKey,
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.file",
        ],
      });

      sheetsClient = google.sheets({ version: "v4", auth });
      console.log("✓ Google Sheets API client initialized.");
    } else {
      console.warn("⚠ Google Sheets credentials not configured in .env. Repository will log operations.");
    }
  }
  return sheetsClient;
}
