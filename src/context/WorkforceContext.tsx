import React, { createContext, useContext, useState, useEffect } from "react";
import type {
  Role,
  Employee,
  TaskItem,
  ApplicationItem,
  AssignmentItem,
  SubmissionItem,
  TransactionItem,
  CashoutRequestItem,
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
  cashoutRequests: CashoutRequestItem[];
  setCashoutRequests: React.Dispatch<React.SetStateAction<CashoutRequestItem[]>>;
  refreshCashoutRequests: () => Promise<void>;
}

const WorkforceContext = createContext<WorkforceContextType | undefined>(undefined);

export function WorkforceProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    try {
      const savedUser = localStorage.getItem("merchnexa_auth_user");
      const userObj = savedUser ? JSON.parse(savedUser) : null;
      const userEmail = (userObj?.email || "").toLowerCase().trim();
      const adminEmails = [
        (import.meta.env.VITE_ADMIN_EMAIL || "jim.sec14@gmail.com").toLowerCase().trim(),
        "jim.sec14@gmail.com",
        "jim@merchnexa.com",
      ];
      return userEmail && adminEmails.includes(userEmail) ? "ADMIN" : "EMPLOYEE";
    } catch {
      return "EMPLOYEE";
    }
  });
  const [active, setActive] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem("merchnexa_auth_user");
      const userObj = savedUser ? JSON.parse(savedUser) : null;
      const userEmail = (userObj?.email || "").toLowerCase().trim();
      const adminEmails = [
        (import.meta.env.VITE_ADMIN_EMAIL || "jim.sec14@gmail.com").toLowerCase().trim(),
        "jim.sec14@gmail.com",
        "jim@merchnexa.com",
      ];
      return userEmail && adminEmails.includes(userEmail) ? "Overview" : "My Dashboard";
    } catch {
      return "My Dashboard";
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth state with session persistence across refresh
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("merchnexa_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem("merchnexa_auth_token") || null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [employeeList, setEmployeeList] = useState<Employee[]>(defaultEmployees);
  const [currentEmployeeEmail, setCurrentEmployeeEmail] = useState("");

  const [taskList, setTaskList] = useState<TaskItem[]>(initialTasks);
  const [applications, setApplications] = useState<ApplicationItem[]>(initialApplications);
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(initialSubmissions);
  const [ledger, setLedger] = useState<TransactionItem[]>(initialTransactions);
  const [cashoutRequests, setCashoutRequests] = useState<CashoutRequestItem[]>([]);

  const refreshCashoutRequests = async () => {
    try {
      const res = await api.payments.listCashoutRequests(authToken || undefined);
      if (res?.success && Array.isArray(res?.requests)) {
        setCashoutRequests(res.requests);
      }
    } catch (e) {
      console.warn("Failed to refresh cashout requests:", e);
    }
  };

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
        if (user) {
          setFirebaseUser(user);
          const token = await user.getIdToken();
          setAuthToken(token);
          setLoginModalOpen(false);

          // Check if admin or employee (Strict email check)
          const configuredAdmin = (import.meta.env.VITE_ADMIN_EMAIL || "jim.sec14@gmail.com").toLowerCase().trim();
          const adminEmails = [
            configuredAdmin,
            "jim.sec14@gmail.com",
            "jim@merchnexa.com",
          ];
          const userEmail = (user.email || "").toLowerCase().trim();
          const isAdmin = adminEmails.includes(userEmail);

          const assignedRole = isAdmin ? "ADMIN" : "EMPLOYEE";
          setRole(assignedRole);
          if (isAdmin) {
            setActive("Overview");
          }

          localStorage.setItem("merchnexa_auth_user", JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "Jim",
          }));
          localStorage.setItem("merchnexa_auth_role", assignedRole);
          localStorage.setItem("merchnexa_auth_token", token);

          if (!isAdmin && user.email) {
            setCurrentEmployeeEmail(user.email);
            setEmployeeList((prev) => {
              const exists = prev.some((e) => e.email.toLowerCase() === user.email?.toLowerCase());
              if (!exists) {
                const newEmp: Employee = {
                  name: user.displayName || user.email?.split("@")[0] || "Employee",
                  email: user.email!,
                  role: "Staff Member",
                  status: "Pending",
                  initials: (user.displayName || user.email || "E").slice(0, 2).toUpperCase(),
                  color: "bg-emerald-100 text-emerald-700",
                };
                return [...prev, newEmp];
              }
              return prev;
            });
          }
        } else {
          // If no active Firebase web session, check if we have cached admin session
          const cachedUser = localStorage.getItem("merchnexa_auth_user");
          if (!cachedUser) {
            setAuthToken(null);
            setRole("EMPLOYEE");
            setActive("My Dashboard");
            setLoginModalOpen(true);
          }
        }
        setIsAuthLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase Auth listener initialized in local mode:", e);
      setIsAuthLoading(false);
    }
  }, []);

  // Sync real-time tasks, applications, and employees from MongoDB Atlas
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [taskData, appData, empData, assignData, subData, ledgerData, cashoutData] = await Promise.allSettled([
          api.tasks.list(authToken || undefined),
          api.applications.list(authToken || undefined),
          api.employees.list(authToken || undefined),
          api.assignments.list(authToken || undefined),
          api.submissions.list(authToken || undefined),
          api.payments.getLedger(authToken || undefined),
          api.payments.listCashoutRequests(authToken || undefined),
        ]);

        if (taskData.status === "fulfilled" && Array.isArray(taskData.value?.tasks)) {
          setTaskList(taskData.value.tasks);
        }
        if (appData.status === "fulfilled" && Array.isArray(appData.value?.applications)) {
          setApplications(appData.value.applications);
        }
        if (empData.status === "fulfilled" && Array.isArray(empData.value?.employees) && empData.value.employees.length > 0) {
          setEmployeeList(empData.value.employees);
        }
        if (assignData.status === "fulfilled" && Array.isArray(assignData.value?.assignments)) {
          setAssignments(assignData.value.assignments);
        }
        if (subData.status === "fulfilled" && Array.isArray(subData.value?.submissions)) {
          setSubmissions(subData.value.submissions);
        }
        if (ledgerData.status === "fulfilled" && Array.isArray(ledgerData.value?.ledger)) {
          setLedger(ledgerData.value.ledger);
        }
        if (cashoutData.status === "fulfilled" && Array.isArray(cashoutData.value?.requests)) {
          setCashoutRequests(cashoutData.value.requests);
        }
      } catch {
        // Local mode fallback
      }
    }
    loadBackendData();
  }, [authToken]);

  const handleEmailLogin = async (email: string, pass: string) => {
    const configuredAdmin = (import.meta.env.VITE_ADMIN_EMAIL || "jim.sec14@gmail.com").toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();
    const adminEmails = [
      configuredAdmin,
      "jim.sec14@gmail.com",
      "jim@merchnexa.com",
    ];

    // If mock / offline fallback credentials used without live backend user
    if (adminEmails.includes(cleanEmail) && pass === "Admin123!") {
      const mockAdmin = {
        email: cleanEmail,
        displayName: "Jim",
        uid: "admin-jim-uid",
      };
      setFirebaseUser(mockAdmin as any);
      setRole("ADMIN");
      setActive("Overview");
      setAuthToken("mock-admin-token");
      setLoginModalOpen(false);
      localStorage.setItem("merchnexa_auth_user", JSON.stringify(mockAdmin));
      localStorage.setItem("merchnexa_auth_role", "ADMIN");
      localStorage.setItem("merchnexa_auth_token", "mock-admin-token");
      return;
    }
    if (cleanEmail === "sarah@gmail.com" && pass === "Staff123!") {
      const mockEmp = {
        email: cleanEmail,
        displayName: "Sarah Ahmed",
        uid: "employee-sarah-uid",
      };
      setFirebaseUser(mockEmp as any);
      setRole("EMPLOYEE");
      setActive("My Dashboard");
      setCurrentEmployeeEmail("sarah@gmail.com");
      setAuthToken("mock-employee-token");
      setLoginModalOpen(false);
      localStorage.setItem("merchnexa_auth_user", JSON.stringify(mockEmp));
      localStorage.setItem("merchnexa_auth_role", "EMPLOYEE");
      localStorage.setItem("merchnexa_auth_token", "mock-employee-token");
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
    localStorage.removeItem("merchnexa_auth_user");
    localStorage.removeItem("merchnexa_auth_role");
    localStorage.removeItem("merchnexa_auth_token");
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
        cashoutRequests,
        setCashoutRequests,
        refreshCashoutRequests,
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
