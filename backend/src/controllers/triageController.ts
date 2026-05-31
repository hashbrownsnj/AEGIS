import type { Request, Response } from "express";
import { Patient } from "../models/Patient.js";
import { TriageAssessment } from "../models/TriageAssessment.js";
import { analyzeTriage, extractFromTranscript } from "../services/acuityService.js";
import { recordTriageFeedback, getFeedbackStats } from "../services/learningService.js";
import { isClaudeAvailable } from "../services/claudeService.js";
import { ensureQueueEntry } from "../services/queueService.js";
import { audit } from "../services/auditService.js";
import { ok } from "../utils/http.js";

export async function analyze(req: Request, res: Response) {
  const result = await analyzeTriage(req.body);
  let saved = null;
  if (req.body.patientId) {
    saved = await TriageAssessment.create({
      patient: req.body.patientId,
      createdBy: req.user?.id,
      inputSnapshot: req.body,
      ...result,
    });
    await Patient.findByIdAndUpdate(req.body.patientId, {
      triageStatus: result.priorityLevel,
      priorityScore: result.urgencyScore,
      $push: {
        timeline: {
          event: "triage_score_generated",
          reason: result.rationale,
          createdBy: req.user?.id,
        },
      },
    });
    await ensureQueueEntry(req.body.patientId, req.user?.id);
    await audit(req, "triage_score_generated", "patient", req.body.patientId, {
      urgencyScore: result.urgencyScore,
      analysisSource: result.analysisSource,
    });
  }
  return ok(res, { result, assessment: saved, claudeEnabled: isClaudeAvailable() });
}

export async function analyzeStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await analyzeTriage(req.body, (thought) => send("thought", { text: thought }));
    send("result", { result, claudeEnabled: isClaudeAvailable() });
    send("done", {});
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Analysis failed" });
  } finally {
    res.end();
  }
}

export async function extractReport(req: Request, res: Response) {
  const { reportText } = req.body as { reportText: string };
  const thoughts: string[] = [];
  const extracted = await extractFromTranscript(reportText, (t) => thoughts.push(t));
  return ok(res, { extracted, thoughts, claudeEnabled: isClaudeAvailable() });
}

export async function submitFeedback(req: Request, res: Response) {
  await recordTriageFeedback(req.body, req.user?.id);
  await audit(req, "triage_feedback_recorded", "triage", req.body.patientId ?? "unknown", {
    correctedPriority: req.body.correctedPriority,
  });
  return ok(res, { recorded: true });
}

export async function learningStats(_req: Request, res: Response) {
  return ok(res, await getFeedbackStats());
}

export async function history(req: Request, res: Response) {
  return ok(res, await TriageAssessment.find({ patient: req.params.patientId }).sort({ createdAt: -1 }));
}

export async function aiStatus(_req: Request, res: Response) {
  return ok(res, { claudeEnabled: isClaudeAvailable(), model: isClaudeAvailable() ? "claude-sonnet-4-20250514" : null });
}
