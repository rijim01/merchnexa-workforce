import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  id: string;
  date: string;
  employee: string;
  email: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  method: string;
  reference: string;
  description: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    id: { type: String, required: true, unique: true },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    employee: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, enum: ["CREDIT", "DEBIT"], required: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, default: "bKash" },
    reference: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const TransactionModel = mongoose.model<ITransaction>("Transaction", TransactionSchema);
