import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ACUITY_SOURCES, TRIAGE_LEVELS } from "@aegis/shared";
import { InteractionSchema, MedicationSchema } from "./medicationSchemas.js";

const ExtractedFieldsSchema = new Schema(
  {
    unitId: String,
    etaMinutes: Number,
    patientDescriptor: String,
    chiefComplaint: String,
    symptoms: [String],
    age: Number,
    sex: { type: String, enum: ["female", "male", "intersex", "unknown"] },
    vitalSigns: { type: Schema.Types.Mixed },
    medicationsMentioned: [String],
    allergiesMentioned: [String],
    mechanismOfInjury: String,
    mentalStatus: String,
    additionalContext: String,
  },
  { _id: false }
);

const AmbulanceAnalysisSchema = new Schema(
  {
    conditionCategory: String,
    urgencyLevel: { type: String, enum: TRIAGE_LEVELS },
    suggestedTeams: [String],
    equipmentChecklist: [String],
    suggestedPlacement: String,
    expectedPathway: String,
    preparationNotes: [String],
    rationale: String,
    confidenceScore: { type: Number, min: 0, max: 1, default: null },
    analysisSource: { type: String, enum: ACUITY_SOURCES, default: "rules" },
    reasoningSteps: [String],
    extractedFields: ExtractedFieldsSchema,
    guardrailApplied: { type: Boolean, default: false },
    rulesBaselineScore: Number,
    modelId: String,
  },
  { _id: false }
);

const AmbulanceReportSchema = new Schema(
  {
    unitId: { type: String, required: true, trim: true, index: true },
    etaMinutes: { type: Number, required: true, min: 0, max: 180 },
    patientDescriptor: { type: String, required: true, maxlength: 180 },
    age: { type: Number, min: 0, max: 125 },
    sex: { type: String, enum: ["female", "male", "intersex", "unknown"], default: "unknown" },
    structuredSymptoms: [String],
    reportText: { type: String, required: true, maxlength: 5000 },
    transcriptText: { type: String, maxlength: 5000 },
    vitals: { type: Schema.Types.Mixed },
    status: { type: String, enum: ["incoming", "arrived", "converted", "cancelled"], default: "incoming", index: true },
    analysis: AmbulanceAnalysisSchema,
    medications: [MedicationSchema],
    medicationInteractions: [InteractionSchema],
    linkedPatient: { type: Schema.Types.ObjectId, ref: "Patient" },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export type AmbulanceReportDocument = InferSchemaType<typeof AmbulanceReportSchema> & mongoose.Document;
export const AmbulanceReport = mongoose.model("AmbulanceReport", AmbulanceReportSchema);
