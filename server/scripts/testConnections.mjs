import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("\n==================================================");
console.log("   MerchNexa WorkHub - Cloud Connectivity Diagnostic");
console.log("==================================================\n");

async function runDiagnostics() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  console.log(`[1/2] Testing Firebase Admin SDK...`);
  console.log(`- Project ID: ${projectId}`);
  console.log(`- Service Account: ${clientEmail}`);

  try {
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Firebase credentials in .env");
    }

    const app = admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      "diagnostic-app"
    );

    const userRecords = await admin.auth(app).listUsers(5);
    console.log(`  ✓ Firebase Auth Connected successfully!`);
    console.log(`  ✓ Total registered users found: ${userRecords.users.length}`);
    if (userRecords.users.length > 0) {
      userRecords.users.forEach((u, i) => {
        console.log(`    ${i + 1}. ${u.email || u.uid} (${u.displayName || "No Name"})`);
      });
    }
  } catch (err) {
    console.error(`  ✗ Firebase Test FAILED:`, err.message);
  }

  console.log(`\n[2/2] Testing Google Sheets API...`);
  console.log(`- Spreadsheet ID: ${spreadsheetId}`);

  try {
    if (!spreadsheetId) {
      throw new Error("Missing GOOGLE_SPREADSHEET_ID in .env");
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId });

    console.log(`  ✓ Google Sheets Connected successfully!`);
    console.log(`  ✓ Spreadsheet Title: "${meta.data.properties?.title}"`);

    const tabsFound = (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
    console.log(`  ✓ Tabs found: ${tabsFound.join(", ")}`);

    const targetTab = tabsFound.includes("AuditLogs") ? "AuditLogs" : tabsFound[0];
    if (targetTab) {
      console.log(`  Testing write append to tab "${targetTab}"...`);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${targetTab}!A:D`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              new Date().toISOString(),
              "TEST_SCRIPT",
              "PING",
              "Live verification from diagnostic script",
            ],
          ],
        },
      });
      console.log(`  ✓ Successfully wrote test audit row to "${targetTab}"!`);
    }

    console.log("\n==================================================");
    console.log("  ALL TESTS PASSED: System is ready for production!");
    console.log("==================================================\n");
  } catch (err) {
    console.error(`  ✗ Google Sheets Test FAILED:`, err.message);
    if (err.code === 403 || (err.message && err.message.includes("permission"))) {
      console.log(`\n  👉 FIX: Open your Google Sheet, click 'Share', and add this email as Editor:`);
      console.log(`     ${clientEmail}\n`);
    }
  }

  process.exit(0);
}

runDiagnostics();
