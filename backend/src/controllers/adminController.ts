import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { Settings } from "../models/Settings.js";
import { audit } from "../services/auditService.js";
import { created, HttpError, ok } from "../utils/http.js";
import { ROLES } from "@aegis/shared";

export async function auditList(_req: Request, res: Response) { return ok(res, await AuditLog.find().sort({ createdAt: -1 }).limit(300).populate("actor")); }
export async function auditGet(req: Request, res: Response) { const log = await AuditLog.findById(req.params.id).populate("actor"); if (!log) throw new HttpError(404, "Audit log not found"); return ok(res, log); }
export async function getSettings(_req: Request, res: Response) { return ok(res, await Settings.findOne({ singletonKey: "default" })); }
export async function updateSettings(req: Request, res: Response) { const settings = await Settings.findOneAndUpdate({ singletonKey: "default" }, { ...req.body, updatedBy: req.user?.id }, { upsert: true, new: true }); await audit(req, "settings_changed", "settings", String(settings._id)); return ok(res, settings); }
export async function listUsers(_req: Request, res: Response) { return ok(res, await User.find().sort({ name: 1 })); }
export async function createUser(req: Request, res: Response) { const passwordHash = await User.hashPassword(req.body.password); const user = await User.create({ ...req.body, passwordHash }); await audit(req, "user_created", "user", String(user._id)); return created(res, user); }
export async function setRole(req: Request, res: Response) { const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }); if (!user) throw new HttpError(404, "User not found"); await audit(req, "user_role_changed", "user", String(user._id), { role: req.body.role }); return ok(res, user); }
export async function setStatus(req: Request, res: Response) { const user = await User.findByIdAndUpdate(req.params.id, { active: req.body.active }, { new: true }); if (!user) throw new HttpError(404, "User not found"); await audit(req, "user_status_changed", "user", String(user._id), { active: req.body.active }); return ok(res, user); }
export async function updateUser(req: Request, res: Response) {
  const update: Record<string, unknown> = {};
  if (req.body.name) update.name = req.body.name;
  if (req.body.role) update.role = req.body.role;
  if (req.body.department !== undefined) update.department = req.body.department;
  if (req.body.active !== undefined) update.active = req.body.active;
  if (req.body.password) update.passwordHash = await User.hashPassword(req.body.password);
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) throw new HttpError(404, "User not found");
  await audit(req, "user_updated", "user", String(user._id), update);
  return ok(res, user);
}
export async function deleteUser(req: Request, res: Response) {
  if (String(req.params.id) === String(req.user?.id)) throw new HttpError(400, "Cannot delete your own account");
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  await audit(req, "user_deleted", "user", String(req.params.id));
  return ok(res, { deleted: true });
}

// ── CSV bulk import ────────────────────────────────────────────────────────
// Expected CSV (with header): name,email,password,role,department
export async function importUsersFromCsv(req: Request, res: Response) {
  const raw: string = req.body.csv ?? "";
  if (!raw.trim()) throw new HttpError(400, "No CSV data provided");

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new HttpError(400, "CSV must have a header row and at least one data row");

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (row: string[], name: string) => row[header.indexOf(name)]?.trim() ?? "";

  const results: { row: number; email: string; status: "created" | "skipped" | "error"; reason?: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((c) => c.trim());
    const name = col(row, "name");
    const email = col(row, "email");
    const password = col(row, "password");
    const role = col(row, "role");
    const department = col(row, "department") || "Emergency Department";

    if (!name || !email || !password || !role) {
      results.push({ row: i + 1, email: email || "(blank)", status: "error", reason: "Missing required field (name, email, password, role)" });
      continue;
    }
    if (!ROLES.includes(role as any)) {
      results.push({ row: i + 1, email, status: "error", reason: `Invalid role "${role}". Valid roles: ${ROLES.join(", ")}` });
      continue;
    }
    if (password.length < 12) {
      results.push({ row: i + 1, email, status: "error", reason: "Password must be at least 12 characters" });
      continue;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      results.push({ row: i + 1, email, status: "skipped", reason: "Email already exists" });
      continue;
    }

    try {
      const passwordHash = await User.hashPassword(password);
      const user = await User.create({ name, email, passwordHash, role, department, active: true });
      await audit(req, "user_created", "user", String(user._id), { source: "csv_import" });
      results.push({ row: i + 1, email, status: "created" });
    } catch (err: any) {
      results.push({ row: i + 1, email, status: "error", reason: err.message ?? "Unknown error" });
    }
  }

  const created_count = results.filter((r) => r.status === "created").length;
  const skipped_count = results.filter((r) => r.status === "skipped").length;
  const error_count = results.filter((r) => r.status === "error").length;

  return ok(res, { summary: { created: created_count, skipped: skipped_count, errors: error_count }, results });
}
