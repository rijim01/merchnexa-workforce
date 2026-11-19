import { Router } from "express";
import { google } from "googleapis";
import { config } from "../config/env.js";

export const googleAuthRouter = Router();

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
}

// Generate Google Consent URL
googleAuthRouter.get("/auth-url", (req, res) => {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.json({ success: true, url });
});

// OAuth Callback handler (matches the redirect_uri in your Google Console)
googleAuthRouter.get("/callback", async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    res.status(400).send("Authorization code missing from Google callback.");
    return;
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log("✓ Google OAuth2 Tokens received successfully!");
    
    // Redirect or send HTML success message
    res.send(`
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 60px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
        <h2 style="color: #059669;">✓ Google Account Connected!</h2>
        <p style="color: #475569; font-size: 14px;">MerchNexa WorkHub has successfully linked to Google Sheets & Google Drive.</p>
        <p style="color: #64748b; font-size: 12px;">You can now close this tab and return to the application.</p>
      </div>
    `);
  } catch (error: any) {
    console.error("Error exchanging code for Google tokens:", error);
    res.status(500).send(`Authentication error: ${error.message}`);
  }
});
