import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/rbacMiddleware.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";

export const employeeRouter = Router();

// In-memory cache synced with Google Sheets (starts fresh for production)
let employeesCache: any[] = [];

// List employees (Admin only)
employeeRouter.get("/", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    // If spreadsheet configured, optionally read rows
    const rows = await sheetsRepo.readRows("Employees");
    if (rows && rows.length > 1) {
      // First row is headers
      const fetched = rows.slice(1).map((row) => ({
        name: row[0],
        email: row[1],
        role: row[2],
        status: row[3],
        initials: row[4] || row[0]?.slice(0, 2).toUpperCase(),
        color: row[5] || "bg-blue-100 text-blue-700",
      }));
      if (fetched.length > 0) {
        employeesCache = fetched;
      }
    }

    res.json({
      success: true,
      employees: employeesCache,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch employees" });
  }
});

// Register / Sync new employee to Google Sheets
employeeRouter.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, email, role, phone, paymentMethod, paymentNumber } = req.body;
    const targetEmail = (email || req.user?.email || "").toLowerCase().trim();
    const targetName = name || req.user?.email?.split("@")[0] || "Staff Member";

    if (!targetEmail) {
      return res.status(400).json({ error: "Email is required" });
    }

    const initials = targetName.slice(0, 2).toUpperCase();
    const color = "bg-blue-100 text-blue-700";
    const status = "Pending";
    const joinedDate = new Date().toISOString().slice(0, 10);

    let emp = employeesCache.find((e) => e.email.toLowerCase() === targetEmail);
    if (!emp) {
      emp = {
        name: targetName,
        email: targetEmail,
        role: role || "Staff Member",
        status,
        initials,
        color,
        phone: phone || "",
        paymentMethod: paymentMethod || "",
        paymentNumber: paymentNumber || "",
        joinedDate,
      };
      employeesCache.push(emp);

      // Append row to 'Employees' tab in Google Sheets
      await sheetsRepo.appendRow("Employees", [
        targetName,
        targetEmail,
        role || "Staff Member",
        status,
        initials,
        color,
        phone || "",
        paymentMethod || "",
        paymentNumber || "",
        joinedDate,
      ]);

      // Record in AuditLogs
      await sheetsRepo.appendRow("AuditLogs", [
        new Date().toISOString(),
        targetEmail,
        "REGISTER_EMPLOYEE",
        `New employee registered in Google Sheets: ${targetName} (${targetEmail})`,
      ]);
    }

    res.status(201).json({
      success: true,
      message: `Employee ${targetEmail} recorded in Google Sheets`,
      employee: emp,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to register employee" });
  }
});

// Update employee status (Admin only)
employeeRouter.patch("/:email/status", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const rawEmail = req.params.email;
    const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    if (!email) {
      return res.status(400).json({ error: "Missing email parameter" });
    }

    const { status } = req.body;

    if (!["Active", "Pending", "Rejected", "Suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const emp = employeesCache.find((e) => e.email.toLowerCase() === email.toLowerCase());
    if (!emp) {
      return res.status(404).json({ error: "Employee not found" });
    }

    emp.status = status;

    // Record status audit row in Google Sheets
    await sheetsRepo.appendRow("AuditLogs", [
      new Date().toISOString(),
      req.user?.email || "Admin",
      "UPDATE_EMPLOYEE_STATUS",
      `Changed status of ${email} to ${status}`,
    ]);

    res.json({
      success: true,
      message: `Employee ${email} status updated to ${status}`,
      employee: emp,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update employee status" });
  }
});

// Update employee profile (Own profile or Admin)
employeeRouter.patch("/:email/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const rawEmail = req.params.email;
    const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    if (!email) {
      return res.status(400).json({ error: "Missing email parameter" });
    }

    // Allow user to edit their own profile, or Admin
    if (req.user?.role !== "ADMIN" && req.user?.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: Cannot edit another user's profile" });
    }

    const { name, role, phone, birthDate, photoUrl, bio, skills, paymentMethod, paymentNumber } = req.body;

    let emp = employeesCache.find((e) => e.email.toLowerCase() === email.toLowerCase());
    if (!emp) {
      emp = {
        name: name || "Staff Member",
        email,
        role: role || "Staff Member",
        status: "Active",
        initials: (name || "EM").slice(0, 2).toUpperCase(),
        color: "bg-blue-100 text-blue-700",
      };
      employeesCache.push(emp);
    }

    // Update in-memory profile
    Object.assign(emp, {
      name: name ?? emp.name,
      role: role ?? emp.role,
      phone,
      birthDate,
      photoUrl,
      bio,
      skills,
      paymentMethod,
      paymentNumber,
    });

    // Record profile update in Google Sheets
    await sheetsRepo.appendRow("Employees", [
      emp.name,
      emp.email,
      emp.role,
      emp.status,
      emp.initials,
      emp.color,
      phone || emp.phone || "",
      paymentMethod || emp.paymentMethod || "",
      paymentNumber || emp.paymentNumber || "",
      emp.joinedDate || new Date().toISOString().slice(0, 10),
    ]);

    await sheetsRepo.appendRow("AuditLogs", [
      new Date().toISOString(),
      req.user?.email || email,
      "UPDATE_PROFILE",
      `Profile updated for ${email}`,
    ]);

    res.json({
      success: true,
      message: "Profile updated successfully",
      employee: emp,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
});
