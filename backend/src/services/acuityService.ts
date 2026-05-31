import type { AmbulanceAnalysis, TriageLevel, TriageResult, VitalSigns } from "@aegis/shared";
import {
  analyzeWithClaude,
  claudeOutputToTriageResult,
  extractFromTranscript,
  isClaudeAvailable,
  type ClaudeAnalyzeInput,
  type ThoughtCallback,
} from "./claudeService.js";

export type AnalyzeInput = {
  symptoms?: string[];
  age?: number;
  medicalHistory?: string[];
  vitalSigns?: VitalSigns;
  arrivalSource?: string;
  ambulanceReportText?: string;
  clinicalNotes?: string;
  patientDescriptor?: string;
  etaMinutes?: number;
};

const rules = [
  { keys: ["chest pain", "pressure", "stemi", "crushing"], category: "Cardiac", impact: 28, action: "Route to cardiac capable monitored bed and notify physician lead" },
  { keys: ["shortness of breath", "dyspnea", "respiratory", "wheezing", "can't breathe"], category: "Respiratory", impact: 22, action: "Prepare oxygen delivery and respiratory support evaluation" },
  { keys: ["stroke", "weakness", "facial droop", "slurred", "aphasia"], category: "Neurologic", impact: 30, action: "Activate stroke assessment workflow and assign monitored room" },
  { keys: ["sepsis", "fever", "confusion", "hypotension", "rigors"], category: "Infectious risk", impact: 24, action: "Prioritize sepsis screening and isolation review" },
  { keys: ["trauma", "fall", "mvc", "bleeding", "gunshot", "stab"], category: "Trauma", impact: 24, action: "Prepare trauma bay resources and rapid provider assessment" },
  { keys: ["suicidal", "overdose", "self harm", "attempt"], category: "Behavioral health safety", impact: 20, action: "Place in safe observation workflow with clinical supervision" },
];

function textOf(input: AnalyzeInput): string {
  return [
    ...(input.symptoms ?? []),
    ...(input.medicalHistory ?? []),
    input.ambulanceReportText ?? "",
    input.clinicalNotes ?? "",
    input.patientDescriptor ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function level(score: number): TriageLevel {
  if (score >= 85) return "critical";
  if (score >= 70) return "emergent";
  if (score >= 50) return "urgent";
  if (score >= 30) return "semi_urgent";
  return "non_urgent";
}

function condition(score: number): string {
  if (score >= 85) return "Immediate clinical review required";
  if (score >= 70) return "High risk presentation";
  if (score >= 50) return "Time sensitive presentation";
  if (score >= 30) return "Stable but needs ED evaluation";
  return "Lower acuity operational pathway";
}

function routingFor(priorityLevel: TriageLevel): string {
  if (priorityLevel === "critical") return "Resuscitation bay";
  if (priorityLevel === "emergent") return "Monitored acute care zone";
  if (priorityLevel === "urgent") return "Main ED treatment zone";
  if (priorityLevel === "semi_urgent") return "Expedited triage or vertical care";
  return "Fast track when available";
}

/** Deterministic safety floor — keyword + vital-sign rules. No fake ML confidence. */
export function analyzeTriageRules(input: AnalyzeInput): TriageResult {
  const text = textOf(input);
  let score = 12;
  const findings: TriageResult["findings"] = [];
  let category = "General emergency presentation";
  let action = "Assign to standard triage workflow with clinician review";

  for (const rule of rules) {
    if (rule.keys.some((k) => text.includes(k))) {
      score += rule.impact;
      category = rule.category;
      action = rule.action;
      findings.push({
        factor: rule.category,
        impact: rule.impact,
        rationale: `Deterministic guardrail: reported information contains indicators associated with ${rule.category.toLowerCase()} operational risk.`,
      });
    }
  }

  const v = input.vitalSigns ?? {};
  if ((input.age ?? 0) >= 65) {
    score += 10;
    findings.push({ factor: "Age 65 or older", impact: 10, rationale: "Older age increases risk of deterioration and supports earlier assessment." });
  }
  if (input.arrivalSource === "ems") {
    score += 8;
    findings.push({ factor: "EMS arrival", impact: 8, rationale: "Prehospital transport suggests higher operational urgency and room readiness needs." });
  }
  if (v.oxygenSaturation !== undefined && v.oxygenSaturation < 92) {
    score += 24;
    findings.push({ factor: "Low oxygen saturation", impact: 24, rationale: "Oxygen saturation below 92 percent increases respiratory risk." });
  }
  if (v.systolicBp !== undefined && v.systolicBp < 90) {
    score += 25;
    findings.push({ factor: "Hypotension", impact: 25, rationale: "Low systolic pressure is a significant instability indicator." });
  }
  if (v.heartRate !== undefined && (v.heartRate > 120 || v.heartRate < 45)) {
    score += 16;
    findings.push({ factor: "Abnormal heart rate", impact: 16, rationale: "Marked heart rate abnormality may indicate instability." });
  }
  if (v.painScore !== undefined && v.painScore >= 8) {
    score += 8;
    findings.push({ factor: "Severe pain", impact: 8, rationale: "Severe reported pain increases prioritization within the queue." });
  }

  score = Math.min(100, Math.round(score));
  const priorityLevel = level(score);
  const rationale =
    findings.length > 0
      ? `[Rules engine] ${findings.map((f: TriageResult["findings"][number]) => f.rationale).join(" ")}`
      : "[Rules engine] No high risk indicators were found in the submitted information, so standard prioritization is recommended.";

  return {
    urgencyScore: score,
    priorityLevel,
    riskClassification: condition(score),
    conditionCategory: category,
    confidenceScore: null,
    recommendedRouting: routingFor(priorityLevel),
    suggestedNextAction: action,
    rationale,
    findings,
    analysisSource: "rules",
    rulesBaselineScore: score,
  };
}

function mergeWithGuardrail(claudeResult: TriageResult, rulesResult: TriageResult): TriageResult {
  const guardrailApplied = rulesResult.urgencyScore > claudeResult.urgencyScore;
  const finalScore = Math.max(claudeResult.urgencyScore, rulesResult.urgencyScore);
  const priorityLevel = level(finalScore);

  const ruleFindings = rulesResult.findings.filter(
    (rf: TriageResult["findings"][number]) =>
      !claudeResult.findings.some((cf: TriageResult["findings"][number]) => cf.factor === rf.factor)
  );

  return {
    ...claudeResult,
    urgencyScore: finalScore,
    priorityLevel,
    riskClassification: condition(finalScore),
    recommendedRouting: routingFor(priorityLevel),
    findings: [...claudeResult.findings, ...ruleFindings],
    analysisSource: guardrailApplied ? "hybrid" : "claude",
    guardrailApplied,
    rulesBaselineScore: rulesResult.urgencyScore,
    rationale: guardrailApplied
      ? `${claudeResult.rationale} [Safety guardrail elevated urgency from ${claudeResult.urgencyScore} to ${finalScore} based on deterministic clinical indicators.]`
      : claudeResult.rationale,
  };
}

/** Primary triage entry: Claude reasoning + deterministic rules as safety floor. */
export async function analyzeTriage(input: AnalyzeInput, onThought?: ThoughtCallback): Promise<TriageResult> {
  const { triage } = await runAcuityAnalysis(input, onThought);
  return triage;
}

async function runAcuityAnalysis(
  input: AnalyzeInput,
  onThought?: ThoughtCallback
): Promise<{ triage: TriageResult; claudeOutput: Awaited<ReturnType<typeof analyzeWithClaude>> }> {
  const rulesResult = analyzeTriageRules(input);

  if (!isClaudeAvailable()) {
    onThought?.("Claude unavailable — using deterministic rules engine only.");
    return { triage: rulesResult, claudeOutput: null };
  }

  onThought?.("Running Claude clinical reasoning with rules guardrail…");
  const claudeOutput = await analyzeWithClaude(input as ClaudeAnalyzeInput, onThought);

  if (!claudeOutput) {
    onThought?.("Claude analysis failed — falling back to rules engine.");
    return { triage: rulesResult, claudeOutput: null };
  }

  const claudeResult = claudeOutputToTriageResult(
    claudeOutput,
    rulesResult.urgencyScore,
    rulesResult.urgencyScore > claudeOutput.urgencyScore
  );

  return { triage: mergeWithGuardrail(claudeResult, rulesResult), claudeOutput };
}

/** Sync alias for legacy callers — rules only (no Claude). Prefer analyzeTriage async. */
export function analyzeTriageSync(input: AnalyzeInput): TriageResult {
  return analyzeTriageRules(input);
}

function defaultTeams(category: string): string[] {
  const cardiac = category === "Cardiac";
  const respiratory = category === "Respiratory";
  const trauma = category === "Trauma";
  return [
    "Charge nurse",
    "ED attending",
    ...(cardiac ? ["Cardiology notification"] : []),
    ...(respiratory ? ["Respiratory therapy"] : []),
    ...(trauma ? ["Trauma team lead"] : []),
  ];
}

function defaultEquipment(category: string): string[] {
  const cardiac = category === "Cardiac";
  const respiratory = category === "Respiratory";
  const trauma = category === "Trauma";
  return [
    "Monitored bed",
    "IV access supplies",
    "Point of care testing cart",
    ...(cardiac ? ["ECG machine", "Defibrillator readiness check"] : []),
    ...(respiratory ? ["Oxygen delivery setup", "Airway cart available"] : []),
    ...(trauma ? ["Trauma cart", "Rapid transfusion readiness review"] : []),
  ];
}

export async function analyzeAmbulance(
  report: {
    reportText: string;
    structuredSymptoms?: string[];
    age?: number;
    vitals?: VitalSigns;
    etaMinutes?: number;
    patientDescriptor?: string;
  },
  onThought?: ThoughtCallback
): Promise<AmbulanceAnalysis> {
  let enrichedInput: AnalyzeInput = {
    symptoms: report.structuredSymptoms,
    age: report.age,
    vitalSigns: report.vitals,
    arrivalSource: "ems",
    ambulanceReportText: report.reportText,
    patientDescriptor: report.patientDescriptor,
    etaMinutes: report.etaMinutes,
  };

  let preExtracted: Awaited<ReturnType<typeof extractFromTranscript>> = null;

  if (isClaudeAvailable() && report.reportText.trim()) {
    preExtracted = await extractFromTranscript(report.reportText, onThought);
    if (preExtracted) {
      enrichedInput = {
        ...enrichedInput,
        symptoms: [...new Set([...(enrichedInput.symptoms ?? []), ...preExtracted.symptoms])],
        age: enrichedInput.age ?? preExtracted.age,
        vitalSigns: { ...preExtracted.vitalSigns, ...enrichedInput.vitalSigns },
      };
    }
  }

  const { triage, claudeOutput } = await runAcuityAnalysis(enrichedInput, onThought);

  const extractedFields = triage.extractedFields ?? preExtracted ?? undefined;

  const suggestedTeams =
    claudeOutput?.suggestedTeams?.length ? claudeOutput.suggestedTeams : defaultTeams(triage.conditionCategory);
  const equipmentChecklist =
    claudeOutput?.equipmentChecklist?.length
      ? claudeOutput.equipmentChecklist
      : defaultEquipment(triage.conditionCategory);
  const prepNotes = claudeOutput?.preparationNotes?.length
    ? claudeOutput.preparationNotes
    : [
        `ETA ${report.etaMinutes ?? "not specified"} minutes requires receiving team awareness.`,
        triage.suggestedNextAction,
        "Decision support only. Clinician assessment determines final care pathway.",
      ];

  return {
    conditionCategory: triage.conditionCategory,
    urgencyLevel: triage.priorityLevel,
    suggestedTeams,
    equipmentChecklist,
    suggestedPlacement: triage.recommendedRouting,
    expectedPathway: `${triage.conditionCategory} assessment pathway with clinician confirmation on arrival`,
    preparationNotes: prepNotes,
    rationale: triage.rationale,
    confidenceScore: triage.confidenceScore,
    analysisSource: triage.analysisSource,
    reasoningSteps: triage.reasoningSteps,
    extractedFields,
    guardrailApplied: triage.guardrailApplied,
    rulesBaselineScore: triage.rulesBaselineScore,
    modelId: triage.modelId,
  };
}

export { extractFromTranscript, isClaudeAvailable };
export type { ThoughtCallback };
