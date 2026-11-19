import mongoose, { Schema, Document } from "mongoose";

export interface IAssignment extends Document {
  id: number;
  applicationId?: number;
  employee: string;
  email: string;
  taskTitle: string;
  assignedOn: string;
  deadline: string;
  payment: number;
  status: "Assigned" | "In Progress" | "Submitted" | "Completed";
  paymentType?: "FIXED" | "PER_UNIT";
  unitRate?: number;
  unitName?: string;
  targetQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    id: { type: Number, required: true, unique: true },
    applicationId: { type: Number },
    employee: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    taskTitle: { type: String, required: true, trim: true },
    assignedOn: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    deadline: { type: String, required: true },
    payment: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Assigned", "In Progress", "Submitted", "Completed"],
      default: "Assigned",
    },
    paymentType: { type: String, enum: ["FIXED", "PER_UNIT"], default: "FIXED" },
    unitRate: { type: Number },
    unitName: { type: String, default: "Account" },
    targetQuantity: { type: Number },
  },
  { timestamps: true }
);

export const AssignmentModel = mongoose.model<IAssignment>("Assignment", AssignmentSchema);
