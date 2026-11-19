export type Role = "ADMIN" | "EMPLOYEE";

export type EmployeeStatus = "Active" | "Pending" | "Rejected" | "Suspended";

export interface Employee {
  name: string;
  email: string;
  role: string;
  status: EmployeeStatus;
  initials: string;
  color: string;
  phone?: string;
  birthDate?: string;
  skills?: string[];
  photoUrl?: string;
  bio?: string;
  joinedDate?: string;
  paymentMethod?: string;
  paymentNumber?: string;
}

export type TaskStatus = "Draft" | "Open" | "Closed" | "In Progress" | "Under Review" | "Assigned" | "Completed";
export type TaskPaymentType = "FIXED" | "PER_UNIT";

export interface TaskItem {
  id: number;
  title: string;
  description: string;
  skills: string[];
  deadline: string;
  payment: number;
  documentUrl: string;
  status: TaskStatus;
  employee: string; // Primary or legacy label
  assignedEmployees?: string[]; // Multiple approved employees
  slots?: number; // Total workers needed (e.g. 1, 2, 5)
  paymentType?: TaskPaymentType; // "FIXED" or "PER_UNIT" (Bulky work)
  unitRate?: number; // Rate per item (e.g. ৳10 per Gmail account)
  unitName?: string; // e.g. "Account", "Lead", "Entry"
  targetQuantity?: number; // Total target items (e.g. 500)
  completedQuantity?: number; // Total units completed & approved so far
  // Admin-only Client Revenue & Profitability Tracking
  clientName?: string; // Optional client or business name
  clientAmount?: number; // Total billing amount received/invoiced from client (Fixed or Total Pool)
  clientUnitRate?: number; // Rate billed to client per unit (e.g. ৳15/Account)
}

export type ApplicationStatus = "Pending" | "Accepted" | "Rejected";

export interface ApplicationItem {
  id: number;
  employee: string;
  email: string;
  taskTitle: string;
  appliedOn: string;
  message: string;
  status: ApplicationStatus;
}

export type AssignmentStatus = "Assigned" | "In Progress" | "Submitted" | "Completed";

export interface AssignmentItem {
  id: number;
  applicationId: number;
  employee: string;
  email: string;
  taskTitle: string;
  assignedOn: string;
  deadline: string;
  payment: number;
  status: AssignmentStatus;
  paymentType?: TaskPaymentType;
  unitRate?: number;
  unitName?: string;
  targetQuantity?: number;
}

export type SubmissionStatus = "Under Review" | "Approved" | "Revision Requested";

export interface SubmissionItem {
  id: number;
  taskTitle: string;
  employee: string;
  email: string;
  submittedOn: string;
  deliverableUrl: string;
  notes: string;
  payment: number;
  status: SubmissionStatus;
  feedback?: string;
  rating?: number; // Performance score out of 10 assigned by Admin
  paymentType?: TaskPaymentType;
  unitRate?: number;
  unitName?: string;
  submittedQuantity?: number; // e.g. 50 accounts submitted
  approvedQuantity?: number; // e.g. 50 accounts approved by Admin
}

export type TransactionType = "CREDIT" | "DEBIT";
export type PaymentMethod = "bKash" | "Nagad" | "Bank Transfer" | "System Credit";

export interface TransactionItem {
  id: string;
  employee: string;
  email: string;
  type: TransactionType;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference: string;
  description: string;
}

export interface ActivityItem {
  title: string;
  detail: string;
  time: string;
  icon: any;
}
