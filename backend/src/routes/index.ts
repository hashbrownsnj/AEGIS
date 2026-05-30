import { Router } from "express";
import { z } from "zod";
import { intakeRateLimiter } from "../middleware/rateLimiters.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import * as auth from "../controllers/authController.js";
import * as patients from "../controllers/patientController.js";
import * as queue from "../controllers/queueController.js";
import * as ambulance from "../controllers/ambulanceController.js";
import * as triage from "../controllers/triageController.js";
import * as analytics from "../controllers/analyticsController.js";
import * as admin from "../controllers/adminController.js";
import * as pharma from "../controllers/pharmaController.js";
import { ambulanceSchema, idParam, intakeSchema, loginSchema, manualOverrideSchema, noteSchema, patientCreateSchema, patientUpdateSchema, pharmaInteractionSchema, statusSchema, triageSchema } from "../validation/schemas.js";
import { ROLES } from "@aegis/shared";

const r = Router();

// Auth
r.post("/auth/login", validate(loginSchema), asyncHandler(auth.login));
r.post("/auth/logout", requireAuth, asyncHandler(auth.logout));
r.get("/auth/me", requireAuth, asyncHandler(auth.me));
r.post("/auth/refresh", requireAuth, asyncHandler(auth.me));

// Patients
r.get("/patients", requireAuth, requirePermission("patients:read"), asyncHandler(patients.listPatients));
r.post("/patients", requireAuth, requirePermission("patients:write"), validate(patientCreateSchema), asyncHandler(patients.createPatient));
r.get("/patients/:id", requireAuth, requirePermission("patients:read"), asyncHandler(patients.getPatient));
r.put("/patients/:id", requireAuth, requirePermission("patients:write"), validate(patientUpdateSchema), asyncHandler(patients.updatePatient));
r.patch("/patients/:id/status", requireAuth, requirePermission("patients:write"), validate(statusSchema), asyncHandler(patients.updateStatus));
r.patch("/patients/:id/notes", requireAuth, requirePermission("patients:write"), validate(noteSchema), asyncHandler(patients.addNote));
r.delete("/patients/:id", requireAuth, requirePermission("*"), asyncHandler(patients.deletePatient));

// Queue
r.get("/queue", requireAuth, requirePermission("queue:read"), asyncHandler(queue.getQueue));
r.post("/queue/reorder", requireAuth, requirePermission("queue:write"), asyncHandler(queue.reorderQueue));
r.patch("/queue/:id/priority", requireAuth, requirePermission("queue:write"), asyncHandler(queue.updatePriority));
r.patch("/queue/:id/move", requireAuth, requirePermission("queue:write"), asyncHandler(queue.moveEntry));
r.post("/queue/manual-override", requireAuth, requirePermission("queue:write"), validate(manualOverrideSchema), asyncHandler(queue.manualOverride));

// Ambulances
r.get("/ambulances", requireAuth, requirePermission("ambulances:read"), asyncHandler(ambulance.listAmbulances));
r.post("/ambulances", requireAuth, requirePermission("ambulances:write"), validate(ambulanceSchema), asyncHandler(ambulance.createAmbulance));
r.get("/ambulances/:id", requireAuth, requirePermission("ambulances:read"), asyncHandler(ambulance.getAmbulance));
r.patch("/ambulances/:id", requireAuth, requirePermission("ambulances:write"), asyncHandler(ambulance.updateAmbulance));
r.post("/ambulances/:id/analyze", requireAuth, requirePermission("ambulances:write"), asyncHandler(ambulance.analyzeReport));

// Triage
r.post("/triage/analyze", requireAuth, requirePermission("triage:write"), validate(triageSchema), asyncHandler(triage.analyze));
r.get("/triage/:patientId/history", requireAuth, requirePermission("patients:read"), asyncHandler(triage.history));

// Analytics
r.get("/analytics/overview", requireAuth, requirePermission("analytics:read"), asyncHandler(analytics.overview));
r.get("/analytics/queue", requireAuth, requirePermission("analytics:read"), asyncHandler(analytics.queueAnalytics));
r.get("/analytics/capacity", requireAuth, requirePermission("analytics:read"), asyncHandler(analytics.capacity));
r.get("/analytics/arrivals", requireAuth, requirePermission("analytics:read"), asyncHandler(analytics.arrivals));

// Audit
r.get("/audit", requireAuth, requirePermission("audit:read"), asyncHandler(admin.auditList));
r.get("/audit/:id", requireAuth, requirePermission("audit:read"), validate(idParam), asyncHandler(admin.auditGet));

// Settings
r.get("/settings", requireAuth, requirePermission("settings:read"), asyncHandler(admin.getSettings));
r.put("/settings", requireAuth, requirePermission("*"), asyncHandler(admin.updateSettings));

// Users (admin only)
const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(12, "Password must be at least 12 characters"),
    role: z.enum(ROLES),
    department: z.string().optional(),
  }),
});
const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    role: z.enum(ROLES).optional(),
    department: z.string().optional(),
    active: z.boolean().optional(),
    password: z.string().min(12).optional(),
  }),
});
r.get("/users", requireAuth, requirePermission("*"), asyncHandler(admin.listUsers));
r.post("/users", requireAuth, requirePermission("*"), validate(createUserSchema), asyncHandler(admin.createUser));
r.put("/users/:id", requireAuth, requirePermission("*"), validate(updateUserSchema), asyncHandler(admin.updateUser));
r.delete("/users/:id", requireAuth, requirePermission("*"), asyncHandler(admin.deleteUser));
r.patch("/users/:id/role", requireAuth, requirePermission("*"), asyncHandler(admin.setRole));
r.patch("/users/:id/status", requireAuth, requirePermission("*"), asyncHandler(admin.setStatus));
r.post("/users/csv", requireAuth, requirePermission("*"), validate(z.object({ body: z.object({ csv: z.string().min(1) }) })), asyncHandler(admin.importUsersFromCsv));

// Pharma / intake
r.post("/pharma/intake/:token", intakeRateLimiter, validate(intakeSchema), asyncHandler(pharma.publicIntake));
r.get("/pharma/search", asyncHandler(pharma.searchDrugs));
r.post("/pharma/interactions", requireAuth, validate(pharmaInteractionSchema), asyncHandler(pharma.checkInteractions));
r.post("/patients/:id/intake-link", requireAuth, requirePermission("patients:write"), asyncHandler(pharma.generateIntakeLink));

export default r;
