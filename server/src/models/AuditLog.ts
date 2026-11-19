import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: { type: String, default: () => new Date().toISOString() },
    actor: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLogModel = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
