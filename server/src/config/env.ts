import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  adminEmail: (process.env.ADMIN_EMAIL || "jim@merchnexa.com").toLowerCase(),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
  google: {
    projectId: process.env.GOOGLE_PROJECT_ID || "merchnexa-workhub",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/google-drive/callback",
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || "",
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
};
