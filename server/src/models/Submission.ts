import mongoose, { Schema, Document } from "mongoose";

export interface ISubmission extends Document {
  id: number;
  taskTitle: string;
  employee: string;
  email: string;
  submittedOn: string;
  deliverableUrl: string;
  notes: string;
  payment: number;
  status: "Under Review" | "Approved" | "Revision Requested";
  feedback?: string;
  rating?: number;
  paymentType?: "FIXED" | "PER_UNIT";
  unitRate?: number;
  unitName?: string;
  submittedQuantity?: number;
  approvedQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    id: { type: Number, required: true, unique: true },
    taskTitle: { type: String, required: true },
    employee: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    submittedOn: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    deliverableUrl: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    payment: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Under Review", "Approved", "Revision Requested"],
      default: "Under Review",
    },
    feedback: { type: String, default: "" },
    rating: { type: Number },
    paymentType: { type: String, enum: ["FIXED", "PER_UNIT"], default: "FIXED" },
    unitRate: { type: Number },
    unitName: { type: String, default: "Account" },
    submittedQuantity: { type: Number, default: 1 },
    approvedQuantity: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const SubmissionModel = mongoose.model<ISubmission>("Submission", SubmissionSchema);
