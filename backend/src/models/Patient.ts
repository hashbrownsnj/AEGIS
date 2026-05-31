import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { PATIENT_STATUSES, TRIAGE_LEVELS } from "@aegis/shared";
import { InteractionSchema, MedicationSchema } from "./medicationSchemas.js";
import { encryptionPlugin } from "../services/encryptionService.js";

const VitalSignsSchema = new Schema(
  {
    heartRate: Number,
    respiratoryRate: Number,
    systolicBp: Number,
    diastolicBp: Number,
    oxygenSaturation: Number,
    temperatureC: Number,
    painScore: Number,
  },
  { _id: false }
);

const TimelineSchema = new Schema(
  {
    event: { type: String, required: true },
    from: String,
    to: String,
    reason: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const NoteSchema = new Schema(
  {
    text: { type: String, required: true, maxlength: 2000 },
    author: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const PatientSchema = new Schema(
  {
    // ── PII — encrypted at rest via encryptionPlugin ───────────
    mrn:      { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true, index: true },

    // Non-PII fields remain unencrypted for efficient querying
    age: { type: Number, required: true, min: 0, max: 125 },
    sex: {
      type: String,
      enum: ["female", "male", "intersex", "unknown"],
      default: "unknown",
    },
    arrivalSource: {
      type: String,
      enum: ["walk_in", "ems", "transfer", "referral"],
      required: true,
      index: true,
    },
    symptoms:       [{ type: String, trim: true }],
    medicalHistory: [{ type: String, trim: true }],
    allergies:      [{ type: String, trim: true }],   // also encrypted
    vitalSigns: VitalSignsSchema,
    triageStatus: {
      type: String,
      enum: ["pending", ...TRIAGE_LEVELS],
      default: "pending",
      index: true,
    },
    priorityScore:  { type: Number, default: 0, min: 0, max: 100, index: true },
    status:         { type: String, enum: PATIENT_STATUSES, default: "waiting", index: true },
    assignedZone:   { type: String, default: "Unassigned", index: true },
    assignedRoom:   String,
    assignedStaff:  [{ type: Schema.Types.ObjectId, ref: "User" }],
    ambulanceReport:{ type: Schema.Types.ObjectId, ref: "AmbulanceReport" },
    medications:            [MedicationSchema],
    medicationInteractions: [InteractionSchema],
    intakeToken: { type: String, index: true, sparse: true },
    notes:    [NoteSchema],
    timeline: [TimelineSchema],
  },
  { timestamps: true }
);

PatientSchema.index({ status: 1, priorityScore: -1, createdAt: 1 });

/**
 * Field-level AES-256-GCM encryption for PII columns.
 * Requires FIELD_ENCRYPTION_KEY (64 hex chars) in the environment.
 * Transparent: encrypted on write, decrypted on read.
 */
PatientSchema.plugin(encryptionPlugin, {
  fields: ["fullName", "mrn", "allergies", "medicalHistory"],
});

export type PatientDocument = InferSchemaType<typeof PatientSchema> & mongoose.Document;
export const Patient = mongoose.model("Patient", PatientSchema);
