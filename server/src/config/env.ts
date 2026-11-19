import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

function formatPrivateKey(key?: string): string {
  if (!key) return "";
  let formatted = key.trim();
  // Strip surrounding quotes if copied with quotes
  if (
    (formatted.startsWith('"') && formatted.endsWith('"')) ||
    (formatted.startsWith("'") && formatted.endsWith("'"))
  ) {
    formatted = formatted.slice(1, -1);
  }
  // Replace escaped newlines with real newlines and remove any carriage returns
  formatted = formatted.replace(/\\n/g, "\n").replace(/\\r/g, "");
  return formatted.trim();
}

function cleanMongoUri(uri?: string): string {
  if (!uri) return "";
  let clean = uri.trim();
  // Strip surrounding quotes if copied with quotes
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1);
  }
  return clean.trim();
}

export const config = {
  port: process.env.PORT || 5000,
  adminEmail: (process.env.ADMIN_EMAIL || "jim@merchnexa.com").toLowerCase(),
  mongoUri: cleanMongoUri(process.env.MONGODB_URI),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  },
  google: {
    projectId: process.env.GOOGLE_PROJECT_ID || "merchnexa-workhub",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/google-drive/callback",
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || "",
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY),
  },
};
