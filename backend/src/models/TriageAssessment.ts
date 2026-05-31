import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ACUITY_SOURCES, TRIAGE_LEVELS } from "@aegis/shared";

const FindingSchema = new Schema({ factor: String, impact: Number, rationale: String }, { _id: false });

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

const TriageAssessmentSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    inputSnapshot: { type: Schema.Types.Mixed, required: true },
    urgencyScore: { type: Number, min: 0, max: 100, required: true, index: true },
    priorityLevel: { type: String, enum: TRIAGE_LEVELS, required: true, index: true },
    riskClassification: { type: String, required: true },
    conditionCategory: { type: String, required: true },
    confidenceScore: { type: Number, min: 0, max: 1, default: null },
    recommendedRouting: { type: String, required: true },
    suggestedNextAction: { type: String, required: true },
    rationale: { type: String, required: true },
    findings: [FindingSchema],
    analysisSource: { type: String, enum: ACUITY_SOURCES, default: "rules" },
    reasoningSteps: [String],
    extractedFields: ExtractedFieldsSchema,
    guardrailApplied: { type: Boolean, default: false },
    rulesBaselineScore: Number,
    modelId: String,
  },
  { timestamps: true }
);

export type TriageAssessmentDocument = InferSchemaType<typeof TriageAssessmentSchema> & mongoose.Document;
export const TriageAssessment = mongoose.model("TriageAssessment", TriageAssessmentSchema);
