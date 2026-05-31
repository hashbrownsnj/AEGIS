import type { Request, Response } from "express";
import { AmbulanceReport } from "../models/AmbulanceReport.js";
import { analyzeAmbulance } from "../services/acuityService.js";
import { audit } from "../services/auditService.js";
import { created, HttpError, ok } from "../utils/http.js";
import type { VitalSigns } from "@aegis/shared";

function mergeReportPayload(body: Record<string, unknown>, analysis: Awaited<ReturnType<typeof analyzeAmbulance>>) {
  const extractedVitals = analysis.extractedFields?.vitalSigns ?? {};
  const bodyVitals = (body.vitals as VitalSigns | undefined) ?? {};
  const vitals = { ...extractedVitals, ...bodyVitals };
  const hasVitals = Object.keys(vitals).length > 0;

  return {
    ...body,
    transcriptText: body.transcriptText ?? body.reportText,
    unitId: body.unitId ?? analysis.extractedFields?.unitId,
    etaMinutes: body.etaMinutes ?? analysis.extractedFields?.etaMinutes,
    patientDescriptor: body.patientDescriptor ?? analysis.extractedFields?.patientDescriptor,
    age: body.age ?? analysis.extractedFields?.age,
    sex: body.sex ?? analysis.extractedFields?.sex,
    structuredSymptoms:
      (body.structuredSymptoms as string[] | undefined)?.length
        ? body.structuredSymptoms
        : analysis.extractedFields?.symptoms?.length
          ? analysis.extractedFields.symptoms
          : body.structuredSymptoms,
    vitals: hasVitals ? vitals : body.vitals,
    analysis,
  };
}

export async function listAmbulances(_req: Request, res: Response) {
  return ok(res, await AmbulanceReport.find().sort({ createdAt: -1 }).limit(100).populate("linkedPatient"));
}

export async function createAmbulance(req: Request, res: Response) {
  const analysis = await analyzeAmbulance({
    reportText: req.body.reportText,
    structuredSymptoms: req.body.structuredSymptoms,
    age: req.body.age,
    vitals: req.body.vitals,
    etaMinutes: req.body.etaMinutes,
    patientDescriptor: req.body.patientDescriptor,
  });
  const report = await AmbulanceReport.create(mergeReportPayload(req.body, analysis) as any);
  await audit(req, "ambulance_report_submitted", "ambulance", String(report._id), {
    urgency: analysis.urgencyLevel,
    analysisSource: analysis.analysisSource,
  });
  return created(res, report);
}

export async function createAmbulanceStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const analysis = await analyzeAmbulance(
      {
        reportText: req.body.reportText,
        structuredSymptoms: req.body.structuredSymptoms,
        age: req.body.age,
        vitals: req.body.vitals,
        etaMinutes: req.body.etaMinutes,
        patientDescriptor: req.body.patientDescriptor,
      },
      (thought) => send("thought", { text: thought })
    );
    const report = await AmbulanceReport.create({
      ...mergeReportPayload(req.body, analysis),
      submittedBy: req.user?.id,
    } as any);
    await audit(req, "ambulance_report_submitted", "ambulance", String(report._id), {
      urgency: analysis.urgencyLevel,
      analysisSource: analysis.analysisSource,
    });
    send("result", { report });
    send("done", {});
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Analysis failed" });
  } finally {
    res.end();
  }
}

export async function getAmbulance(req: Request, res: Response) {
  const report = await AmbulanceReport.findById(req.params.id).populate("linkedPatient");
  if (!report) throw new HttpError(404, "Ambulance report not found");
  return ok(res, report);
}

export async function updateAmbulance(req: Request, res: Response) {
  const report = await AmbulanceReport.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!report) throw new HttpError(404, "Ambulance report not found");
  await audit(req, "ambulance_report_updated", "ambulance", String(report._id));
  return ok(res, report);
}

export async function analyzeReport(req: Request, res: Response) {
  const report = await AmbulanceReport.findById(req.params.id);
  if (!report) throw new HttpError(404, "Ambulance report not found");
  report.analysis = (await analyzeAmbulance({
    reportText: report.reportText,
    structuredSymptoms: report.structuredSymptoms,
    age: report.age ?? undefined,
    vitals: report.vitals as any,
    etaMinutes: report.etaMinutes,
    patientDescriptor: report.patientDescriptor,
  })) as any;
  await report.save();
  await audit(req, "ambulance_report_analyzed", "ambulance", String(report._id));
  return ok(res, report);
}
