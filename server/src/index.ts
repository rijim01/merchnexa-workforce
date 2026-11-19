import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config/env.js";
import { taskRouter } from "./routes/taskRoutes.js";
import { paymentRouter } from "./routes/paymentRoutes.js";
import { googleAuthRouter } from "./routes/googleAuthRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { employeeRouter } from "./routes/employeeRoutes.js";
import { submissionRouter } from "./routes/submissionRoutes.js";
import { applicationRouter } from "./routes/applicationRoutes.js";
import { diagnosticRouter } from "./routes/diagnosticRoutes.js";
import { getFirebaseAdmin } from "./config/firebase.js";
import { getSheetsClient } from "./config/sheets.js";
import { connectDB, isDbConnected } from "./config/db.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Initialize services
getFirebaseAdmin();
getSheetsClient();
connectDB();

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MerchNexa WorkHub Backend API",
    database: isDbConnected() ? "connected (MongoDB Atlas)" : "local / disconnected",
    time: new Date().toISOString(),
  });
});

// Protected & Integration routes
app.use("/api/auth", authRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/applications", applicationRouter);
app.use("/api/submissions", submissionRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/diagnostics", diagnosticRouter);
app.use("/api/integrations/google", googleAuthRouter);
app.use("/api/integrations/google-drive", googleAuthRouter);

// Serve static frontend build (for single-server deployment)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../../dist");

app.use(express.static(frontendDistPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/health")) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, "index.html"), (err) => {
    if (err) {
      next();
    }
  });
});

app.listen(config.port, () => {
  console.log(`🚀 MerchNexa WorkHub Server running on http://localhost:${config.port}`);
});
