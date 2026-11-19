import React, { createContext, useContext, useState, useEffect } from "react";
import type {
  Role,
  Employee,
  TaskItem,
  ApplicationItem,
  AssignmentItem,
  SubmissionItem,
  TransactionItem,
} from "../types";
import {
  employees as defaultEmployees,
  initialTasks,
  initialApplications,
  initialAssignments,
  initialSubmissions,
  initialTransactions,
} from "../data/mockData";
import {
  auth,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  onAuthStateChanged,
  type User,
} from "../config/firebase";
import { ToastContainer, type ToastItem, type ToastType } from "../components/Toast";
import { api } from "../services/api";

interface WorkforceContextType {
  role: Role;
  setRole: (role: Role) => void;
  active: string;
  setActive: (page: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;

  // Custom Notifications / Toasts
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;

  // Firebase Auth State
  firebaseUser: User | null;
  authToken: string | null;
  isAuthLoading: boolean;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  handleEmailLogin: (email: string, pass: string) => Promise<void>;
  handleEmailRegister: (email: string, pass: string, name: string) => Promise<void>;
  handleLogout: () => Promise<void>;

  // Active simulated / authenticated employee
  currentEmployeeEmail: string;
  setCurrentEmployeeEmail: (email: string) => void;
  currentEmployee: Employee;

  // Shared platform datasets
  employeeList: Employee[];
  setEmployeeList: React.Dispatch<React.SetStateAction<Employee[]>>;
  taskList: TaskItem[];
  setTaskList: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  applications: ApplicationItem[];
  setApplications: React.Dispatch<React.SetStateAction<ApplicationItem[]>>;
  assignments: AssignmentItem[];
  setAssignments: React.Dispatch<React.SetStateAction<AssignmentItem[]>>;
  submissions: SubmissionItem[];
  setSubmissions: React.Dispatch<React.SetStateAction<SubmissionItem[]>>;
  ledger: TransactionItem[];
  setLedger: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
}

const WorkforceContext = createContext<WorkforceContextType | undefined>(undefined);

export function WorkforceProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [active, setActive] = useState<string>("My Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(true);

  const [employeeList, setEmployeeList] = useState<Employee[]>(defaultEmployees);
  const [currentEmployeeEmail, setCurrentEmployeeEmail] = useState("");

  const [taskList, setTaskList] = useState<TaskItem[]>(initialTasks);
  const [applications, setApplications] = useState<ApplicationItem[]>(initialApplications);
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(initialSubmissions);
  const [ledger, setLedger] = useState<TransactionItem[]>(initialTransactions);

  // Custom Toast state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync with Firebase Auth state
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setFirebaseUser(user);
        if (user) {
          const token = await user.getIdToken();
          setAuthToken(token);
          setLoginModalOpen(false);

          // Check if admin or employee
          const configuredAdmin = (import.meta.env.VITE_ADMIN_EMAIL || "jim@merchnexa.com").toLowerCase();
          const userEmail = (user.email || "").toLowerCase();
          const isAdmin =
            userEmail === configuredAdmin ||
            userEmail.includes("admin") ||
            userEmail.startsWith("jim");

          if (isAdmin) {
            setRole("ADMIN");
            setActive("Overview");
          } else {
            setRole("EMPLOYEE");
            setActive("My Dashboard");
            if (user.email) {
              setCurrentEmployeeEmail(user.email);
              // Ensure user is in employeeList
              setEmployeeList((prev) => {
                const exists = prev.some((e) => e.email.toLowerCase() === user.email?.toLowerCase());
                if (!exists) {
                  const newEmp: Employee = {
                    name: user.displayName || user.email?.split("@")[0] || "Employee",
                    email: user.email!,
                    role: "Staff Member",
                    status: "Pending", // Needs admin review
                    initials: (user.displayName || user.email || "E").slice(0, 2).toUpperCase(),
                    color: "bg-emerald-100 text-emerald-700",
                  };
                  return [...prev, newEmp];
                }
                return prev;
              });

              // Ensure employee is recorded in Google Sheets
              api.employees
                .create(
                  {
                    name: user.displayName || user.email?.split("@")[0] || "Staff Member",
                    email: user.email,
                    role: "Staff Member",
                  },
                  token
                )
                .catch(() => {});
            }
          }
        } else {
          setAuthToken(null);
          setRole("EMPLOYEE");
          setActive("My Dashboard");
          setLoginModalOpen(true);
        }
        setIsAuthLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase Auth listener initialized in local mode:", e);
      setIsAuthLoading(false);
    }
  }, []);

  // Sync real-time tasks & applications from MongoDB Atlas
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [taskData, appData] = await Promise.allSettled([
          api.tasks.list(authToken || undefined),
          api.applications.list(authToken || undefined),
        ]);

        if (taskData.status === "fulfilled" && Array.isArray(taskData.value?.tasks)) {
          setTaskList(taskData.value.tasks);
        }
        if (appData.status === "fulfilled" && Array.isArray(appData.value?.applications)) {
          setApplications(appData.value.applications);
        }
      } catch {
        // Local mode fallback
      }
    }
    loadBackendData();
  }, [authToken]);

  const handleEmailLogin = async (email: string, pass: string) => {
    const configuredAdmin = (import.meta.env.VITE_ADMIN_EMAIL || "jim@merchnexa.com").toLowerCase();
    const cleanEmail = email.toLowerCase().trim();

    // If mock / offline fallback credentials used without live backend user
    if ((cleanEmail === configuredAdmin || cleanEmail === "jim@merchnexa.com") && pass === "Admin123!") {
      setFirebaseUser({
        email: cleanEmail,
        displayName: "Jim",
        uid: "admin-jim-uid",
        getIdToken: async () => "mock-admin-token",
      } as any);
      setRole("ADMIN");
      setActive("Overview");
      setLoginModalOpen(false);
      return;
    }
    if (cleanEmail === "sarah@gmail.com" && pass === "Staff123!") {
      setFirebaseUser({
        email: cleanEmail,
        displayName: "Sarah Ahmed",
        uid: "employee-sarah-uid",
        getIdToken: async () => "mock-employee-token",
      } as any);
      setRole("EMPLOYEE");
      setActive("My Dashboard");
      setCurrentEmployeeEmail("sarah@gmail.com");
      setLoginModalOpen(false);
      return;
    }
    await loginWithEmail(email, pass);
    setLoginModalOpen(false);
  };

  const handleEmailRegister = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const existing = employeeList.find((e) => e.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`An employee with email "${cleanEmail}" is already registered. One email can only be used for one employee.`);
    }

    const cred = await registerWithEmail(email, pass, name);
    if (cred.user) {
      const token = await cred.user.getIdToken();
      try {
        await api.employees.create({ name, email: cleanEmail, role: "Staff Member" }, token);
      } catch (e: any) {
        console.warn("Employee registration error:", e.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
    setFirebaseUser(null);
    setAuthToken(null);
    setRole("EMPLOYEE");
    setActive("My Dashboard");
    setLoginModalOpen(true);
  };

  const currentEmployee: Employee =
    employeeList.find((e) => e.email.toLowerCase() === currentEmployeeEmail.toLowerCase()) ||
    employeeList[0] || {
      name: firebaseUser?.displayName || "Staff Member",
      email: firebaseUser?.email || "staff@merchnexa.com",
      role: "Staff Member",
      status: "Active",
      initials: (firebaseUser?.displayName || "SM").slice(0, 2).toUpperCase(),
      color: "bg-blue-100 text-blue-700",
    };

  return (
    <WorkforceContext.Provider
      value={{
        role,
        setRole,
        active,
        setActive,
        mobileOpen,
        setMobileOpen,
        firebaseUser,
        authToken,
        isAuthLoading,
        loginModalOpen,
        openLoginModal: () => setLoginModalOpen(true),
        closeLoginModal: () => setLoginModalOpen(false),
        handleEmailLogin,
        handleEmailRegister,
        handleLogout,
        currentEmployeeEmail,
        setCurrentEmployeeEmail,
        currentEmployee,
        employeeList,
        setEmployeeList,
        taskList,
        setTaskList,
        applications,
        setApplications,
        assignments,
        setAssignments,
        submissions,
        setSubmissions,
        ledger,
        setLedger,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {children}
    </WorkforceContext.Provider>
  );
}

export function useWorkforce() {
  const context = useContext(WorkforceContext);
  if (!context) {
    throw new Error("useWorkforce must be used within a WorkforceProvider");
  }
  return context;
}
