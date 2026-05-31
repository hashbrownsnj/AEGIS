import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../config/env.js";
import { getLearningExamples } from "./learningService.js";
import type {
  ExtractedReportFields,
  TriageLevel,
  TriageResult,
  VitalSigns,
} from "@aegis/shared";

const MODEL_ID = "claude-sonnet-4-6";

const triageLevelSchema = z.enum(["critical", "emergent", "urgent", "semi_urgent", "non_urgent"]);

const claudeTriageSchema = z.object({
  reasoningSteps: z.array(z.string()).min(1).max(12),
  extractedFields: z
    .object({
      unitId: z.string().optional(),
      etaMinutes: z.number().optional(),
      patientDescriptor: z.string().optional(),
      chiefComplaint: z.string().optional(),
      symptoms: z.array(z.string()).default([]),
      age: z.number().optional(),
      sex: z.enum(["female", "male", "intersex", "unknown"]).optional(),
      vitalSigns: z
        .object({
          heartRate: z.number().optional(),
          respiratoryRate: z.number().optional(),
          systolicBp: z.number().optional(),
          diastolicBp: z.number().optional(),
          oxygenSaturation: z.number().optional(),
          temperatureC: z.number().optional(),
          painScore: z.number().optional(),
        })
        .optional(),
      medicationsMentioned: z.array(z.string()).optional(),
      allergiesMentioned: z.array(z.string()).optional(),
      mechanismOfInjury: z.string().optional(),
      mentalStatus: z.string().optional(),
      additionalContext: z.string().optional(),
    })
    .default({ symptoms: [] }),
  urgencyScore: z.number().min(0).max(100),
  priorityLevel: triageLevelSchema,
  riskClassification: z.string(),
  conditionCategory: z.string(),
  confidenceScore: z.number().min(0).max(1),
  recommendedRouting: z.string(),
  suggestedNextAction: z.string(),
  rationale: z.string(),
  findings: z
    .array(
      z.object({
        factor: z.string(),
        impact: z.number(),
        rationale: z.string(),
      })
    )
    .default([]),
  suggestedTeams: z.array(z.string()).optional(),
  equipmentChecklist: z.array(z.string()).optional(),
  preparationNotes: z.array(z.string()).optional(),
});

export type ClaudeAnalyzeInput = {
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

export type ClaudeTriageOutput = z.infer<typeof claudeTriageSchema>;

export type ThoughtCallback = (step: string) => void;

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

export function isClaudeAvailable(): boolean {
  return !!env.anthropicApiKey;
}

function buildUserPayload(input: ClaudeAnalyzeInput): string {
  return JSON.stringify(
    {
      symptoms: input.symptoms ?? [],
      age: input.age,
      medicalHistory: input.medicalHistory ?? [],
      vitalSigns: input.vitalSigns ?? {},
      arrivalSource: input.arrivalSource ?? "unknown",
      ambulanceReportText: input.ambulanceReportText ?? "",
      clinicalNotes: input.clinicalNotes ?? "",
      patientDescriptor: input.patientDescriptor ?? "",
      etaMinutes: input.etaMinutes,
    },
    null,
    2
  );
}

const SYSTEM_PROMPT = `You are ACUITY, a clinical decision-support engine for emergency department triage and ambulance pre-arrival coordination.

CRITICAL RULES:
- You provide operational triage support ONLY. You do NOT diagnose. Always frame output for ED staff preparation.
- Parse radio transcripts and free text into structured clinical fields when present.
- urgencyScore is 0-100 (higher = more urgent). priorityLevel must align: critical≥85, emergent≥70, urgent≥50, semi_urgent≥30, non_urgent<30.
- confidenceScore is your HONEST self-assessed certainty (0-1) based on data completeness and ambiguity. Do NOT inflate it.
- reasoningSteps: show your step-by-step clinical reasoning (4-8 concise steps) as if thinking aloud for the charge nurse.
- findings: list specific factors that drove the score with impact weights.
- For ambulance reports, also populate suggestedTeams, equipmentChecklist, preparationNotes.

Respond with ONLY valid JSON matching the requested schema. No markdown fences.`;

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1]!.trim() : trimmed;
  return JSON.parse(raw);
}

export async function analyzeWithClaude(
  input: ClaudeAnalyzeInput,
  onThought?: ThoughtCallback
): Promise<ClaudeTriageOutput | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const learningBlock = await getLearningExamples();
  const userContent = `Analyze this ED/EMS presentation and return JSON with keys:
reasoningSteps, extractedFields, urgencyScore, priorityLevel, riskClassification, conditionCategory, confidenceScore, recommendedRouting, suggestedNextAction, rationale, findings, suggestedTeams, equipmentChecklist, preparationNotes

Input:
${buildUserPayload(input)}${learningBlock}`;

  onThought?.("Connecting to Claude clinical reasoning engine…");

  try {
    const response = await anthropic.messages.create({
      model: MODEL_ID,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: "submit_triage_assessment",
          description: "Submit structured ED/EMS triage assessment with reasoning steps",
          input_schema: {
            type: "object",
            properties: {
              reasoningSteps: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 12 },
              extractedFields: {
                type: "object",
                properties: {
                  chiefComplaint: { type: "string" },
                  symptoms: { type: "array", items: { type: "string" } },
                  age: { type: "number" },
                  sex: { type: "string", enum: ["female", "male", "intersex", "unknown"] },
                  vitalSigns: {
                    type: "object",
                    properties: {
                      heartRate: { type: "number" },
                      respiratoryRate: { type: "number" },
                      systolicBp: { type: "number" },
                      diastolicBp: { type: "number" },
                      oxygenSaturation: { type: "number" },
                      temperatureC: { type: "number" },
                      painScore: { type: "number" },
                    },
                  },
                  medicationsMentioned: { type: "array", items: { type: "string" } },
                  allergiesMentioned: { type: "array", items: { type: "string" } },
                  mechanismOfInjury: { type: "string" },
                  mentalStatus: { type: "string" },
                  additionalContext: { type: "string" },
                },
              },
              urgencyScore: { type: "number", minimum: 0, maximum: 100 },
              priorityLevel: { type: "string", enum: ["critical", "emergent", "urgent", "semi_urgent", "non_urgent"] },
              riskClassification: { type: "string" },
              conditionCategory: { type: "string" },
              confidenceScore: { type: "number", minimum: 0, maximum: 1 },
              recommendedRouting: { type: "string" },
              suggestedNextAction: { type: "string" },
              rationale: { type: "string" },
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factor: { type: "string" },
                    impact: { type: "number" },
                    rationale: { type: "string" },
                  },
                  required: ["factor", "impact", "rationale"],
                },
              },
              suggestedTeams: { type: "array", items: { type: "string" } },
              equipmentChecklist: { type: "array", items: { type: "string" } },
              preparationNotes: { type: "array", items: { type: "string" } },
            },
            required: [
              "reasoningSteps",
              "urgencyScore",
              "priorityLevel",
              "riskClassification",
              "conditionCategory",
              "confidenceScore",
              "recommendedRouting",
              "suggestedNextAction",
              "rationale",
              "findings",
            ],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_triage_assessment" },
      messages: [{ role: "user", content: userContent }],
    });

    for (const step of (response.content.find((b) => b.type === "tool_use") as any)?.input?.reasoningSteps ?? []) {
      onThought?.(step);
    }

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") return null;

    onThought?.("Validating structured triage output…");
    return claudeTriageSchema.parse(toolBlock.input);
  } catch (toolErr) {
    console.warn("[ACUITY Claude] tool_use failed, falling back to JSON stream:", toolErr instanceof Error ? toolErr.message : toolErr);
  }

  try {
    const stream = anthropic.messages.stream({
      model: MODEL_ID,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    let fullText = "";
    stream.on("text", (delta) => {
      fullText += delta;
      if (onThought && fullText.includes('"reasoningSteps"')) {
        const partial = fullText.match(/"reasoningSteps"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
        if (partial?.[1]) {
          const steps = partial[1].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
          if (steps?.length) {
            const last = steps[steps.length - 1]!.replace(/^"|"$/g, "").replace(/\\"/g, '"');
            if (last.length > 10) onThought(last);
          }
        }
      }
    });

    const message = await stream.finalMessage();
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    onThought?.("Validating structured triage output…");
    const parsed = parseJsonResponse(textBlock.text);
    return claudeTriageSchema.parse(parsed);
  } catch (err) {
    console.error("[ACUITY Claude]", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function extractFromTranscript(
  reportText: string,
  onThought?: ThoughtCallback
): Promise<ExtractedReportFields | null> {
  const anthropic = getClient();
  if (!anthropic || !reportText.trim()) return null;

  onThought?.("Listening to natural speech — mapping to hospital fields…");

  const extractSchema = z.object({
    reasoningSteps: z.array(z.string()).default([]),
    extractedFields: z.object({
      unitId: z.string().optional(),
      etaMinutes: z.number().min(0).max(180).optional(),
      patientDescriptor: z.string().optional(),
      chiefComplaint: z.string().optional(),
      symptoms: z.array(z.string()).default([]),
      age: z.number().optional(),
      sex: z.enum(["female", "male", "intersex", "unknown"]).optional(),
      vitalSigns: z
        .object({
          heartRate: z.number().optional(),
          respiratoryRate: z.number().optional(),
          systolicBp: z.number().optional(),
          diastolicBp: z.number().optional(),
          oxygenSaturation: z.number().optional(),
          temperatureC: z.number().optional(),
          painScore: z.number().optional(),
        })
        .optional(),
      medicationsMentioned: z.array(z.string()).optional(),
      allergiesMentioned: z.array(z.string()).optional(),
      mechanismOfInjury: z.string().optional(),
      mentalStatus: z.string().optional(),
      additionalContext: z.string().optional(),
    }),
  });

  const NATURAL_SPEECH_PROMPT = `You parse NATURAL paramedic speech — not formal radio protocol.
The medic may be talking to a partner, giving a hospital call, or thinking aloud while working.
Extract every field you can infer from casual phrasing:
- unitId: "Medic 4", "Unit 12", "Ambulance 7"
- etaMinutes: "8 minutes out", "ETA five", "be there in twelve"
- patientDescriptor: brief ED-facing summary e.g. "72yo male chest pain"
- chiefComplaint, symptoms, age, sex, vitals (BP, HR, SpO2, pain 0-10)
- medicationsMentioned, allergiesMentioned, mechanismOfInjury, mentalStatus
Do not invent data. Return JSON: { reasoningSteps: string[], extractedFields: object }`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL_ID,
      max_tokens: 2048,
      system: NATURAL_SPEECH_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this natural paramedic speech into structured AEGIS/hospital fields:\n\n"""${reportText}"""\n\nReturn JSON only.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = extractSchema.parse(parseJsonResponse(textBlock.text));
    for (const step of parsed.reasoningSteps) onThought?.(step);
    return parsed.extractedFields;
  } catch (err) {
    console.error("[ACUITY extract]", err instanceof Error ? err.message : err);
    return null;
  }
}

export function claudeOutputToTriageResult(
  output: ClaudeTriageOutput,
  rulesBaselineScore: number,
  guardrailApplied: boolean
): TriageResult {
  return {
    urgencyScore: output.urgencyScore,
    priorityLevel: output.priorityLevel as TriageLevel,
    riskClassification: output.riskClassification,
    conditionCategory: output.conditionCategory,
    confidenceScore: output.confidenceScore,
    recommendedRouting: output.recommendedRouting,
    suggestedNextAction: output.suggestedNextAction,
    rationale: output.rationale,
    findings: output.findings,
    analysisSource: guardrailApplied ? "hybrid" : "claude",
    reasoningSteps: output.reasoningSteps,
    extractedFields: output.extractedFields,
    guardrailApplied,
    rulesBaselineScore,
    modelId: MODEL_ID,
  };
}

export { MODEL_ID };
