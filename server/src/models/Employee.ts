import mongoose, { Schema, Document } from "mongoose";

export interface IEmployee extends Document {
  name: string;
  email: string;
  role: string;
  status: "Active" | "Pending" | "Rejected" | "Suspended";
  initials: string;
  color: string;
  phone?: string;
  birthDate?: string;
  photoUrl?: string;
  bio?: string;
  skills: string[];
  rating?: number;
  ratingCount?: number;
  completedTasks?: number;
  totalEarnings?: number;
  paymentMethod?: string;
  paymentNumber?: string;
  joinedDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, default: "Staff Member", trim: true },
    status: {
      type: String,
      enum: ["Active", "Pending", "Rejected", "Suspended"],
      default: "Pending",
    },
    initials: { type: String, default: "EM" },
    color: { type: String, default: "bg-blue-100 text-blue-700" },
    phone: { type: String, default: "" },
    birthDate: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "" },
    paymentNumber: { type: String, default: "" },
    joinedDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true }
);

export const EmployeeModel = mongoose.model<IEmployee>("Employee", EmployeeSchema);
