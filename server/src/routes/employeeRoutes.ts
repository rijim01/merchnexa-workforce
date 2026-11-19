import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/rbacMiddleware.js";
import { EmployeeModel } from "../models/Employee.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { connectDB, isDbConnected } from "../config/db.js";
import { sheetsRepo } from "../repositories/sheetsRepo.js";

export const employeeRouter = Router();

// In-memory cache fallback if DB is temporarily disconnected
let employeesCache: any[] = [];

// List employees (Admin only)
employeeRouter.get("/", async (req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      const dbEmployees = await EmployeeModel.find().sort({ createdAt: -1 }).lean();
      return res.json({
        success: true,
        employees: dbEmployees,
      });
    }

    // Fallback: Read from Google Sheets or memory
    const rows = await sheetsRepo.readRows("Employees");
    if (rows && rows.length > 1) {
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

// Register / Sync new employee to MongoDB Atlas
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

    let employeeDoc: any = null;

    if (!isDbConnected()) {
      await connectDB();
    }

    if (isDbConnected()) {
      // 1. Strictly enforce: ONE email per employee
      const existing = await EmployeeModel.findOne({ email: targetEmail });
      if (existing) {
        return res.status(409).json({
          error: `An employee with email "${targetEmail}" is already registered (${existing.name}). One email can only be used for one employee.`,
          employee: existing,
        });
      }

      employeeDoc = await EmployeeModel.create({
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
      });

      console.log(`✅ [MongoDB Atlas] New employee registered: ${targetName} (${targetEmail})`);

      await AuditLogModel.create({
        actor: targetEmail,
        action: "REGISTER_EMPLOYEE",
        details: `New employee registered in MongoDB Atlas: ${targetName} (${targetEmail})`,
      });
    } else {
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
      }
      employeeDoc = emp;
    }

    // Optional mirror append to Google Sheets if configured
    sheetsRepo.appendRow("Employees", [
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
    ]).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Employee ${targetEmail} recorded in MongoDB Atlas`,
      employee: employeeDoc,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to register employee" });
  }
});

// Update employee status (Admin only)
employeeRouter.patch("/:email/status", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const rawEmail = req.params.email;
    const email = (Array.isArray(rawEmail) ? rawEmail[0] : rawEmail || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: "Missing email parameter" });
    }

    const { status } = req.body;
    if (!["Active", "Pending", "Rejected", "Suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    let updatedDoc: any = null;

    if (isDbConnected()) {
      updatedDoc = await EmployeeModel.findOneAndUpdate(
        { email },
        { status },
        { new: true }
      );

      await AuditLogModel.create({
        actor: req.user?.email || "Admin",
        action: "UPDATE_EMPLOYEE_STATUS",
        details: `Changed status of ${email} to ${status}`,
      });
    }

    // Also update in-memory cache
    const emp = employeesCache.find((e) => e.email.toLowerCase() === email);
    if (emp) {
      emp.status = status;
    }

    // Mirror to Google Sheets audit log
    sheetsRepo.appendRow("AuditLogs", [
      new Date().toISOString(),
      req.user?.email || "Admin",
      "UPDATE_EMPLOYEE_STATUS",
      `Changed status of ${email} to ${status}`,
    ]).catch(() => {});

    res.json({
      success: true,
      message: `Employee ${email} status updated to ${status}`,
      employee: updatedDoc || emp,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update employee status" });
  }
});

// Update employee profile (Own profile or Admin)
employeeRouter.patch("/:email/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const rawEmail = req.params.email;
    const email = (Array.isArray(rawEmail) ? rawEmail[0] : rawEmail || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: "Missing email parameter" });
    }

    if (req.user?.role !== "ADMIN" && req.user?.email.toLowerCase() !== email) {
      return res.status(403).json({ error: "Forbidden: Cannot edit another user's profile" });
    }

    const { name, role, phone, birthDate, photoUrl, bio, skills, paymentMethod, paymentNumber } = req.body;

    let updatedDoc: any = null;

    if (isDbConnected()) {
      updatedDoc = await EmployeeModel.findOneAndUpdate(
        { email },
        {
          $set: {
            ...(name && { name }),
            ...(role && { role }),
            ...(phone !== undefined && { phone }),
            ...(birthDate !== undefined && { birthDate }),
            ...(photoUrl !== undefined && { photoUrl }),
            ...(bio !== undefined && { bio }),
            ...(skills !== undefined && { skills }),
            ...(paymentMethod !== undefined && { paymentMethod }),
            ...(paymentNumber !== undefined && { paymentNumber }),
          },
        },
        { new: true, upsert: true }
      );

      await AuditLogModel.create({
        actor: req.user?.email || email,
        action: "UPDATE_PROFILE",
        details: `Profile updated for ${email}`,
      });
    }

    // In-memory cache update
    let emp = employeesCache.find((e) => e.email.toLowerCase() === email);
    if (!emp) {
      emp = { name: name || "Staff Member", email, role: role || "Staff Member", status: "Active" };
      employeesCache.push(emp);
    }
    Object.assign(emp, { name, role, phone, birthDate, photoUrl, bio, skills, paymentMethod, paymentNumber });

    // Mirror to Google Sheets
    sheetsRepo.appendRow("AuditLogs", [
      new Date().toISOString(),
      req.user?.email || email,
      "UPDATE_PROFILE",
      `Profile updated for ${email}`,
    ]).catch(() => {});

    res.json({
      success: true,
      message: "Profile updated successfully in MongoDB Atlas",
      employee: updatedDoc || emp,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
});
