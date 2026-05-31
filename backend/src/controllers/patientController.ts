import type { Request, Response } from "express";
import { PATIENT_STATUSES } from "@aegis/shared";
import { Patient } from "../models/Patient.js";
import { TriageAssessment } from "../models/TriageAssessment.js";
import { analyzeTriage } from "../services/acuityService.js";
import { isClaudeAvailable } from "../services/claudeService.js";
import { ensureQueueEntry, recalculateQueue } from "../services/queueService.js";
import { audit } from "../services/auditService.js";
import { created, HttpError, ok } from "../utils/http.js";
export async function listPatients(req: Request, res: Response) {
  const q: Record<string, unknown> = {};
  if (req.query.status) {
    const status = String(req.query.status);
    if ((PATIENT_STATUSES as readonly string[]).includes(status)) q.status = status;
  }
  const patients = await Patient.find(q).sort({ updatedAt: -1 }).limit(200).populate("ambulanceReport");
  return ok(res, patients);
}
export async function createPatient(req: Request, res: Response) {
  const result = await analyzeTriage({
    symptoms: req.body.symptoms,
    age: req.body.age,
    medicalHistory: req.body.medicalHistory,
    vitalSigns: req.body.vitalSigns,
    arrivalSource: req.body.arrivalSource,
  });
  const patient = await Patient.create({
    ...req.body,
    triageStatus: result.priorityLevel,
    priorityScore: result.urgencyScore,
    timeline: [{ event: "patient_created", to: "waiting", reason: "Patient intake completed", createdBy: req.user?.id }],
  });
  await TriageAssessment.create({ patient: patient._id, createdBy: req.user?.id, inputSnapshot: req.body, ...result });
  await ensureQueueEntry(String(patient._id), req.user?.id);
  await audit(req, "patient_created", "patient", String(patient._id), {
    priority: result.priorityLevel,
    analysisSource: result.analysisSource,
  });
  return created(res, patient);
}

export async function createPatientStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const triageInput = {
      symptoms: req.body.symptoms,
      age: req.body.age,
      medicalHistory: req.body.medicalHistory,
      vitalSigns: req.body.vitalSigns,
      arrivalSource: req.body.arrivalSource,
      clinicalNotes: req.body.clinicalNotes,
    };
    const result = await analyzeTriage(triageInput, (thought) => send("thought", { text: thought }));

    const patient = await Patient.create({
      ...req.body,
      triageStatus: result.priorityLevel,
      priorityScore: result.urgencyScore,
      timeline: [{ event: "patient_created", to: "waiting", reason: "Patient intake completed", createdBy: req.user?.id }],
    });
    const assessment = await TriageAssessment.create({
      patient: patient._id,
      createdBy: req.user?.id,
      inputSnapshot: req.body,
      ...result,
    });
    await ensureQueueEntry(String(patient._id), req.user?.id);
    await audit(req, "patient_created", "patient", String(patient._id), {
      priority: result.priorityLevel,
      analysisSource: result.analysisSource,
    });
    send("result", { patient, triage: result, assessment, claudeEnabled: isClaudeAvailable() });
    send("done", {});
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Intake failed" });
  } finally {
    res.end();
  }
}
export async function getPatient(req: Request, res: Response) { const patient = await Patient.findById(req.params.id).populate("ambulanceReport assignedStaff notes.author"); if (!patient) throw new HttpError(404, "Patient not found"); const triage = await TriageAssessment.find({ patient: patient._id }).sort({ createdAt: -1 }); return ok(res, { patient, triage }); }
export async function updatePatient(req: Request, res: Response) { const patient = await Patient.findByIdAndUpdate(req.params.id, { $set: req.body, $push: { timeline: { event: "patient_updated", reason: "Record updated", createdBy: req.user?.id } } }, { new: true }); if (!patient) throw new HttpError(404, "Patient not found"); await ensureQueueEntry(String(patient._id), req.user?.id); await audit(req, "patient_updated", "patient", String(patient._id)); return ok(res, patient); }
export async function updateStatus(req: Request, res: Response) { const patient = await Patient.findById(req.params.id); if (!patient) throw new HttpError(404, "Patient not found"); const from = patient.status; patient.status = req.body.status; patient.timeline.push({ event: "status_changed", from, to: req.body.status, reason: req.body.reason, createdBy: req.user?.id as any }); await patient.save(); await recalculateQueue(req.user?.id, "Patient status changed"); await audit(req, "patient_status_updated", "patient", String(patient._id), { from, to: req.body.status }); return ok(res, patient); }
export async function addNote(req: Request, res: Response) { const patient = await Patient.findByIdAndUpdate(req.params.id, { $push: { notes: { text: req.body.text, author: req.user?.id } } }, { new: true }); if (!patient) throw new HttpError(404, "Patient not found"); await audit(req, "patient_note_added", "patient", String(patient._id)); return ok(res, patient); }
export async function deletePatient(req: Request, res: Response) { const patient = await Patient.findByIdAndDelete(req.params.id); if (!patient) throw new HttpError(404, "Patient not found"); await audit(req, "patient_deleted", "patient", String(patient._id)); return ok(res, { deleted: true }); }
