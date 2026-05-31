import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { TRIAGE_LEVELS } from "@aegis/shared";

const TriageFeedbackSchema = new Schema(
  {
    assessment: { type: Schema.Types.ObjectId, ref: "TriageAssessment" },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    originalPriority: { type: String, enum: TRIAGE_LEVELS, required: true },
    correctedPriority: { type: String, enum: TRIAGE_LEVELS, required: true },
    originalCategory: String,
    correctedCategory: String,
    clinicianNotes: { type: String, required: true, maxlength: 2000 },
    inputSnapshot: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export type TriageFeedbackDocument = InferSchemaType<typeof TriageFeedbackSchema> & mongoose.Document;
export const TriageFeedback = mongoose.model("TriageFeedback", TriageFeedbackSchema);
