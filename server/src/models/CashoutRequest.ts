import mongoose, { Schema, Document } from "mongoose";

export interface ICashoutRequest extends Document {
  id: string;
  employeeName: string;
  employeeEmail: string;
  amount: number;
  method: "bKash" | "Nagad" | "Bank Transfer" | "System Credit";
  accountNumber: string;
  status: "Pending" | "Paid" | "Rejected";
  requestedDate: string;
  processedDate?: string;
  transactionRef?: string;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashoutRequestSchema = new Schema<ICashoutRequest>(
  {
    id: { type: String, required: true, unique: true },
    employeeName: { type: String, required: true, trim: true },
    employeeEmail: { type: String, required: true, lowercase: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    method: {
      type: String,
      enum: ["bKash", "Nagad", "Bank Transfer", "System Credit"],
      default: "bKash",
    },
    accountNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Rejected"],
      default: "Pending",
    },
    requestedDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    processedDate: { type: String },
    transactionRef: { type: String, default: "" },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

export const CashoutRequestModel = mongoose.model<ICashoutRequest>(
  "CashoutRequest",
  CashoutRequestSchema
);
