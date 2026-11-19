import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  id: number;
  title: string;
  description: string;
  skills: string[];
  deadline: string;
  payment: number;
  documentUrl: string;
  status: "Draft" | "Open" | "Closed" | "In Progress" | "Under Review" | "Assigned" | "Completed";
  employee: string;
  assignedEmployees: string[];
  slots: number;
  paymentType: "FIXED" | "PER_UNIT";
  unitRate?: number;
  unitName?: string;
  targetQuantity?: number;
  completedQuantity: number;
  clientName?: string;
  clientAmount?: number;
  clientUnitRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    skills: { type: [String], default: [] },
    deadline: { type: String, required: true },
    payment: { type: Number, required: true },
    documentUrl: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Draft", "Open", "Closed", "In Progress", "Under Review", "Assigned", "Completed"],
      default: "Open",
    },
    employee: { type: String, default: "Unassigned" },
    assignedEmployees: { type: [String], default: [] },
    slots: { type: Number, default: 1 },
    paymentType: { type: String, enum: ["FIXED", "PER_UNIT"], default: "FIXED" },
    unitRate: { type: Number },
    unitName: { type: String, default: "Account" },
    targetQuantity: { type: Number },
    completedQuantity: { type: Number, default: 0 },
    clientName: { type: String, default: "" },
    clientAmount: { type: Number },
    clientUnitRate: { type: Number },
  },
  { timestamps: true }
);

export const TaskModel = mongoose.model<ITask>("Task", TaskSchema);
