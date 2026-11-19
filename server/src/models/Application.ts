import mongoose, { Schema, Document } from "mongoose";

export interface IApplication extends Document {
  id: number;
  taskTitle: string;
  employee: string;
  email: string;
  message: string;
  status: "Pending" | "Accepted" | "Rejected";
  appliedOn: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    id: { type: Number, required: true, unique: true },
    taskTitle: { type: String, required: true },
    employee: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    appliedOn: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true }
);

export const ApplicationModel = mongoose.model<IApplication>("Application", ApplicationSchema);
