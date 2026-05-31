export const ROLES = ["admin", "physician", "nurse", "ems", "dispatcher", "operations_manager"] as const;
export type Role = typeof ROLES[number];
export const PATIENT_STATUSES = ["waiting", "triage", "roomed", "in_treatment", "observation", "admitted", "discharged"] as const;
export type PatientStatus = typeof PATIENT_STATUSES[number];
export const TRIAGE_LEVELS = ["critical", "emergent", "urgent", "semi_urgent", "non_urgent"] as const;
export type TriageLevel = typeof TRIAGE_LEVELS[number];
export const ACUITY_SOURCES = ["claude", "rules", "hybrid"] as const;
export type AcuitySource = typeof ACUITY_SOURCES[number];

export interface VitalSigns {
  heartRate?: number;
  respiratoryRate?: number;
  systolicBp?: number;
  diastolicBp?: number;
  oxygenSaturation?: number;
  temperatureC?: number;
  painScore?: number;
}

export interface ExtractedReportFields {
  /** e.g. "Medic 4", "Unit 12" */
  unitId?: string;
  /** Minutes until hospital arrival */
  etaMinutes?: number;
  /** Short patient summary for ED, e.g. "72yo male, chest pain" */
  patientDescriptor?: string;
  chiefComplaint?: string;
  symptoms: string[];
  age?: number;
  sex?: "female" | "male" | "intersex" | "unknown";
  vitalSigns?: VitalSigns;
  medicationsMentioned?: string[];
  allergiesMentioned?: string[];
  mechanismOfInjury?: string;
  mentalStatus?: string;
  additionalContext?: string;
}

export interface AcuityFinding {
  factor: string;
  impact: number;
  rationale: string;
}

export interface TriageResult {
  urgencyScore: number;
  priorityLevel: TriageLevel;
  riskClassification: string;
  conditionCategory: string;
  /** Real model confidence (0–1) when Claude ran; null when rules-only fallback */
  confidenceScore: number | null;
  recommendedRouting: string;
  suggestedNextAction: string;
  rationale: string;
  findings: AcuityFinding[];
  /** How this assessment was produced */
  analysisSource: AcuitySource;
  /** Claude chain-of-thought steps shown in UI */
  reasoningSteps?: string[];
  /** Fields parsed from radio transcript / free text by Claude */
  extractedFields?: ExtractedReportFields;
  /** True when deterministic rules raised urgency above Claude */
  guardrailApplied?: boolean;
  /** Rules-engine baseline score before hybrid merge */
  rulesBaselineScore?: number;
  /** Model identifier when Claude was used */
  modelId?: string;
}

export interface AmbulanceAnalysis {
  conditionCategory: string;
  urgencyLevel: TriageLevel;
  suggestedTeams: string[];
  equipmentChecklist: string[];
  suggestedPlacement: string;
  expectedPathway: string;
  preparationNotes: string[];
  rationale: string;
  confidenceScore: number | null;
  analysisSource: AcuitySource;
  reasoningSteps?: string[];
  extractedFields?: ExtractedReportFields;
  guardrailApplied?: boolean;
  rulesBaselineScore?: number;
  modelId?: string;
}

export interface TriageFeedbackInput {
  assessmentId?: string;
  patientId?: string;
  originalPriority: TriageLevel;
  correctedPriority: TriageLevel;
  originalCategory?: string;
  correctedCategory?: string;
  clinicianNotes: string;
  inputSnapshot?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface Medication {
  rxcui: string;
  name: string;
  dose?: string;
  frequency?: string;
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "contraindicated" | "major" | "moderate" | "minor";
  description: string;
}

export interface InteractionCheckResult {
  medications: Medication[];
  interactions: DrugInteraction[];
  hasContraindications: boolean;
}
