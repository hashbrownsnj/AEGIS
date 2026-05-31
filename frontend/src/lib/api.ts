const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4200/api";
import type { DrugInteraction, Medication, TriageFeedbackInput } from "@aegis/shared";

type Options = RequestInit & { auth?: boolean };
export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) throw new ApiError(res.status, body.message ?? "Request failed");
  return body.data as T;
}

export type StreamHandlers = {
  onThought?: (text: string) => void;
  onResult?: (data: unknown) => void;
  onError?: (message: string) => void;
};

async function consumeSseStream(path: string, body: unknown, handlers: StreamHandlers): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.message ?? "Stream failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7);
        if (line.startsWith("data: ")) data = line.slice(6);
      }
      if (!data) continue;
      const parsed = JSON.parse(data);
      if (event === "thought") handlers.onThought?.(parsed.text);
      if (event === "result") handlers.onResult?.(parsed);
      if (event === "error") handlers.onError?.(parsed.message);
    }
  }
}

export const endpoints = {
  login: (email: string, password: string) => api<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => api<any>("/auth/me"),
  logout: () => api("/auth/logout", { method: "POST" }),
  overview: () => api<any>("/analytics/overview"),
  patients: () => api<any[]>("/patients"),
  patient: (id: string) => api<any>(`/patients/${id}`),
  createPatient: (data: any) => api<any>("/patients", { method: "POST", body: JSON.stringify(data) }),
  createPatientStream: (data: any, handlers: StreamHandlers) =>
    consumeSseStream("/patients/stream", data, handlers),
  updatePatient: (id: string, data: any) => api<any>(`/patients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  note: (id: string, text: string) => api<any>(`/patients/${id}/notes`, { method: "PATCH", body: JSON.stringify({ text }) }),
  status: (id: string, status: string, reason: string) => api<any>(`/patients/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) }),
  queue: () => api<any[]>("/queue"),
  override: (data: any) => api<any[]>("/queue/manual-override", { method: "POST", body: JSON.stringify(data) }),
  reorder: () => api<any[]>("/queue/reorder", { method: "POST" }),
  ambulances: () => api<any[]>("/ambulances"),
  createAmbulance: (data: any) => api<any>("/ambulances", { method: "POST", body: JSON.stringify(data) }),
  createAmbulanceStream: (data: any, handlers: StreamHandlers) =>
    consumeSseStream("/ambulances/stream", data, handlers),
  analyzeAmbulance: (id: string) => api<any>(`/ambulances/${id}/analyze`, { method: "POST" }),
  triage: (data: any) => api<any>("/triage/analyze", { method: "POST", body: JSON.stringify(data) }),
  triageStream: (data: any, handlers: StreamHandlers) =>
    consumeSseStream("/triage/analyze/stream", data, handlers),
  extractReport: (reportText: string) =>
    api<{ extracted: any; thoughts: string[]; claudeEnabled: boolean }>("/triage/extract", {
      method: "POST",
      body: JSON.stringify({ reportText }),
    }),
  triageFeedback: (data: TriageFeedbackInput) =>
    api("/triage/feedback", { method: "POST", body: JSON.stringify(data) }),
  aiStatus: () => api<{ claudeEnabled: boolean; model: string | null }>("/triage/ai-status"),
  analyticsQueue: () => api<any>("/analytics/queue"),
  capacity: () => api<any[]>("/analytics/capacity"),
  arrivals: () => api<any>("/analytics/arrivals"),
  audit: () => api<any[]>("/audit"),
  settings: () => api<any>("/settings"),
  saveSettings: (data: any) => api<any>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  users: () => api<any[]>("/users"),
  createUser: (data: any) => api<any>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api<any>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id: string) => api<any>(`/users/${id}`, { method: "DELETE" }),
  importUsersCsv: (csv: string) => api<any>("/users/csv", { method: "POST", body: JSON.stringify({ csv }) }),
  searchDrugs: (q: string) => api<Array<{ name: string; rxcui: string }>>(`/pharma/search?q=${encodeURIComponent(q)}`),
  checkInteractions: (rxcuis: string[]) => api<DrugInteraction[]>("/pharma/interactions", { method: "POST", body: JSON.stringify({ rxcuis }) }),
  generateIntakeLink: (id: string) => api<{ intakeUrl: string }>(`/patients/${id}/intake-link`, { method: "POST" }),
  publicIntake: async (token: string, medications: Medication[]) => {
    const res = await fetch(`${API_URL}/pharma/intake/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medications })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) throw new ApiError(res.status, body.message ?? "Request failed");
    return body.data as { medications: Medication[]; interactions: DrugInteraction[] };
  }
};
