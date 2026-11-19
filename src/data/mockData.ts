import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  CheckCircle2,
  Wallet,
  BarChart3,
  Settings,
  BriefcaseBusiness,
  UserCircle,
} from "lucide-react";
import type {
  Employee,
  TaskItem,
  ApplicationItem,
  AssignmentItem,
  SubmissionItem,
  TransactionItem,
} from "../types";

export const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Employees", icon: Users },
  { name: "Tasks", icon: ClipboardList },
  { name: "Applications", icon: FileText },
  { name: "Submissions", icon: CheckCircle2 },
  { name: "Payments", icon: Wallet },
  { name: "Reports", icon: BarChart3 },
  { name: "Settings", icon: Settings },
];

export const employeeNavigation = [
  { name: "My Dashboard", icon: LayoutDashboard },
  { name: "Available Tasks", icon: ClipboardList },
  { name: "My Tasks", icon: BriefcaseBusiness },
  { name: "My Submissions", icon: CheckCircle2 },
  { name: "My Earnings", icon: Wallet },
  { name: "My Profile", icon: UserCircle },
];

// Production Clean State: Empty datasets for real company usage
export const employees: Employee[] = [];
export const initialTasks: TaskItem[] = [];
export const initialApplications: ApplicationItem[] = [];
export const initialAssignments: AssignmentItem[] = [];
export const initialSubmissions: SubmissionItem[] = [];
export const initialTransactions: TransactionItem[] = [];
export const recentTasksOverview: any[] = [];
export const activities: any[] = [];
