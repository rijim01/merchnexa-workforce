/**
 * Centralized API service layer for MerchNexa WorkHub
 * Direct communication with the Node.js backend.
 * (UI components never communicate with Google Sheets directly).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  auth: {
    me: (token?: string) => fetchWithAuth("/auth/me", { method: "GET" }, token),
    assignRole: (targetUid: string, role: string, token?: string) =>
      fetchWithAuth("/auth/assign-role", { method: "POST", body: JSON.stringify({ targetUid, role }) }, token),
    updateAdminCredentials: (data: { newEmail?: string; newPassword?: string }, token?: string) =>
      fetchWithAuth("/auth/update-admin-credentials", { method: "POST", body: JSON.stringify(data) }, token),
  },
  employees: {
    list: (token?: string) => fetchWithAuth("/employees", { method: "GET" }, token),
    create: (data: any, token?: string) =>
      fetchWithAuth("/employees", { method: "POST", body: JSON.stringify(data) }, token),
    updateStatus: (email: string, status: string, token?: string) =>
      fetchWithAuth(`/employees/${encodeURIComponent(email)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }, token),
    updateProfile: (email: string, profileData: any, token?: string) =>
      fetchWithAuth(`/employees/${encodeURIComponent(email)}/profile`, {
        method: "PATCH",
        body: JSON.stringify(profileData),
      }, token),
  },
  tasks: {
    list: (token?: string) => fetchWithAuth("/tasks", { method: "GET" }, token),
    create: (taskData: any, token?: string) =>
      fetchWithAuth("/tasks", { method: "POST", body: JSON.stringify(taskData) }, token),
  },
  applications: {
    list: (token?: string) => fetchWithAuth("/applications", { method: "GET" }, token),
    create: (data: any, token?: string) =>
      fetchWithAuth("/applications", { method: "POST", body: JSON.stringify(data) }, token),
    updateStatus: (id: number, status: string, token?: string) =>
      fetchWithAuth(`/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
  },
  submissions: {
    create: (submissionData: any, token?: string) =>
      fetchWithAuth("/submissions", { method: "POST", body: JSON.stringify(submissionData) }, token),
    approve: (id: number, approvalData: any, token?: string) =>
      fetchWithAuth(`/submissions/${id}/approve`, { method: "PATCH", body: JSON.stringify(approvalData) }, token),
  },
  payments: {
    getLedger: (token?: string) => fetchWithAuth("/payments/ledger", { method: "GET" }, token),
    recordCashout: (payoutData: any, token?: string) =>
      fetchWithAuth("/payments/cashout", { method: "POST", body: JSON.stringify(payoutData) }, token),
  },
  diagnostics: {
    testConnections: () => fetchWithAuth("/diagnostics/test-connections", { method: "GET" }),
  },
};
