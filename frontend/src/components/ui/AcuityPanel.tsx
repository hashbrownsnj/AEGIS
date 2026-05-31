import { Activity, Shield } from "lucide-react";
import { Badge } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";
import type { AcuitySource, ExtractedReportFields } from "@aegis/shared";

type AcuityAnalysis = {
  urgencyScore?: number;
  urgencyLevel?: string;
  priorityLevel?: string;
  conditionCategory?: string;
  confidenceScore?: number | null;
  rationale?: string;
  analysisSource?: AcuitySource;
  reasoningSteps?: string[];
  extractedFields?: ExtractedReportFields;
  guardrailApplied?: boolean;
  rulesBaselineScore?: number;
  modelId?: string;
  suggestedTeams?: string[];
  equipmentChecklist?: string[];
  preparationNotes?: string[];
};

function sourceLabel(source?: AcuitySource): string {
  if (source === "claude") return "Claude reasoning";
  if (source === "hybrid") return "Claude + rules guardrail";
  return "Rules engine";
}

// Saturated color encodes status only. Claude = the single primary (sky) accent,
// applied sparingly; guardrail = amber status; deterministic rules = neutral slate.
function sourceTone(source?: AcuitySource): string {
  if (source === "claude") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if (source === "hybrid") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-slate-600/40 bg-slate-800/60 text-slate-400";
}

export function AcuityPanel({
  analysis,
  liveThoughts = [],
  analyzing = false,
  compact = false,
}: {
  analysis?: AcuityAnalysis | null;
  liveThoughts?: string[];
  analyzing?: boolean;
  compact?: boolean;
}) {
  const steps = analyzing ? liveThoughts : analysis?.reasoningSteps ?? [];
  const extracted = analysis?.extractedFields;
  const showConfidence = analysis?.confidenceScore != null;

  return (
    <div className={cn("rounded-xl border border-slate-800/60 bg-slate-950/50", compact ? "p-3" : "p-3.5")}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Activity className={cn("h-3.5 w-3.5", analyzing ? "text-sky-400" : "text-slate-500")} aria-hidden />
          <b className="font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-slate-400">
            ACUITY · Clinical Reasoning
          </b>
        </div>
        {analysis?.analysisSource && (
          <Badge className={sourceTone(analysis.analysisSource)}>{sourceLabel(analysis.analysisSource)}</Badge>
        )}
        {analysis?.guardrailApplied && (
          <Badge className="animate-pulse-once border-amber-500/30 bg-amber-500/10 text-amber-300">
            <Shield className="mr-1 inline h-3 w-3" aria-hidden />
            Guardrail applied
          </Badge>
        )}
        {showConfidence && (
          <span className="ml-auto font-mono text-[10px] font-semibold tabular-nums text-slate-500">
            Model self-rated confidence: {Math.round((analysis!.confidenceScore as number) * 100)}%
          </span>
        )}
        {analysis?.analysisSource === "rules" && analysis.confidenceScore == null && (
          <span className="ml-auto font-mono text-[10px] text-slate-600">Deterministic rules only — no model confidence</span>
        )}
      </div>

      {showConfidence && (
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">
          Model self-assessment, not clinical certainty — verify against the patient and your own judgment.
        </p>
      )}

      {(analyzing || steps.length > 0) && (
        <div
          className={cn(
            "mt-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70",
            analyzing && "border-l-2 border-l-sky-500/60"
          )}
        >
          <div className="flex items-center gap-1.5 border-b border-slate-800/80 px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[.2em] text-slate-500">
            <span className={cn("h-1.5 w-1.5 rounded-full", analyzing ? "animate-pulse bg-sky-400" : "bg-slate-600")} aria-hidden />
            {analyzing ? "Live reasoning" : "Decision log"}
            <span className="ml-auto tabular-nums text-slate-600">{steps.length} step{steps.length === 1 ? "" : "s"}</span>
          </div>
          <ol className="grid gap-px p-2 font-mono text-[11px] leading-relaxed">
            {steps.map((step, i) => (
              <li
                key={i}
                className="animate-fade-in-up grid grid-cols-[1.75rem_1fr] gap-2 rounded px-1.5 py-1 text-slate-400 hover:bg-white/[.02]"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              >
                <span className="select-none tabular-nums text-sky-500/70">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-slate-300">{step}</span>
              </li>
            ))}
            {analyzing && (
              <li className="grid grid-cols-[1.75rem_1fr] gap-2 px-1.5 py-1 text-slate-600">
                <span className="tabular-nums text-sky-500/70">{String(steps.length + 1).padStart(2, "0")}</span>
                <span className="inline-flex items-center gap-1">
                  {steps.length === 0 ? "initializing clinical reasoning" : "reasoning"}
                  <span className="inline-block h-3 w-1.5 animate-pulse bg-sky-500/60" aria-hidden />
                </span>
              </li>
            )}
          </ol>
        </div>
      )}

      {extracted && (extracted.unitId || extracted.etaMinutes != null || extracted.symptoms?.length || extracted.chiefComplaint || extracted.vitalSigns) && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <div className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[.2em] text-slate-500">
            Extracted from dictation
          </div>
          <dl className="grid gap-1.5 text-[11px]">
            {extracted.unitId && (
              <div>
                <dt className="text-slate-600">Unit</dt>
                <dd className="font-mono text-slate-300">{extracted.unitId}</dd>
              </div>
            )}
            {extracted.etaMinutes != null && (
              <div>
                <dt className="text-slate-600">ETA</dt>
                <dd className="font-mono tabular-nums text-slate-300">{extracted.etaMinutes} min</dd>
              </div>
            )}
            {extracted.patientDescriptor && (
              <div>
                <dt className="text-slate-600">Patient</dt>
                <dd className="text-slate-300">{extracted.patientDescriptor}</dd>
              </div>
            )}
            {extracted.chiefComplaint && (
              <div>
                <dt className="text-slate-600">Chief complaint</dt>
                <dd className="text-slate-300">{extracted.chiefComplaint}</dd>
              </div>
            )}
            {extracted.symptoms?.length > 0 && (
              <div>
                <dt className="text-slate-600">Symptoms</dt>
                <dd className="text-slate-300">{extracted.symptoms.join(", ")}</dd>
              </div>
            )}
            {extracted.vitalSigns && Object.keys(extracted.vitalSigns).length > 0 && (
              <div>
                <dt className="text-slate-600">Vitals parsed</dt>
                <dd className="font-mono tabular-nums text-sky-300">
                  {Object.entries(extracted.vitalSigns)
                    .filter(([, v]) => v != null)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {analysis?.rationale && (
        <p className="mt-3 text-[12px] leading-relaxed text-slate-500">{analysis.rationale}</p>
      )}

      {analysis?.guardrailApplied && analysis.rulesBaselineScore != null && (
        <p className="mt-2 text-[10px] text-amber-500/80">
          Rules baseline score <span className="font-mono tabular-nums">{analysis.rulesBaselineScore}</span> triggered safety guardrail elevation.
        </p>
      )}

      {analysis?.modelId && (
        <p className="mt-2 font-mono text-[9px] text-slate-700">model: {analysis.modelId}</p>
      )}
    </div>
  );
}
