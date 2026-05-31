import { Brain, Shield, Sparkles } from "lucide-react";
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
  if (source === "claude") return "Claude AI";
  if (source === "hybrid") return "Claude + Rules Guardrail";
  return "Rules Engine";
}

function sourceTone(source?: AcuitySource): string {
  if (source === "claude") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
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
  const urgency = analysis?.urgencyLevel ?? analysis?.priorityLevel;
  const steps = analyzing ? liveThoughts : analysis?.reasoningSteps ?? [];
  const extracted = analysis?.extractedFields;

  return (
    <div className={cn("rounded-xl border border-slate-800/60 bg-slate-950/50", compact ? "p-3" : "p-3.5")}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <b className="text-xs font-bold uppercase tracking-widest text-slate-400">ACUITY AI</b>
        </div>
        {analysis?.analysisSource && (
          <Badge className={sourceTone(analysis.analysisSource)}>{sourceLabel(analysis.analysisSource)}</Badge>
        )}
        {analysis?.guardrailApplied && (
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
            <Shield className="mr-1 inline h-3 w-3" />
            Guardrail applied
          </Badge>
        )}
        {analysis?.confidenceScore != null && (
          <span className="ml-auto text-[10px] font-bold tabular-nums text-slate-500">
            Model confidence: {Math.round(analysis.confidenceScore * 100)}%
          </span>
        )}
        {analysis?.analysisSource === "rules" && analysis.confidenceScore == null && (
          <span className="ml-auto text-[10px] text-slate-600">No ML confidence (rules only)</span>
        )}
      </div>

      {(analyzing || steps.length > 0) && (
        <div className="mt-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">
            <Brain className="h-3 w-3" />
            {analyzing ? "Live reasoning" : "Reasoning chain"}
          </div>
          <ol className="grid gap-1.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-slate-400">
                <span className="shrink-0 font-mono text-violet-500/70">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
            {analyzing && steps.length === 0 && (
              <li className="text-[11px] italic text-slate-500">Initializing Claude clinical reasoning…</li>
            )}
          </ol>
        </div>
      )}

      {extracted && (extracted.unitId || extracted.etaMinutes != null || extracted.symptoms?.length || extracted.chiefComplaint || extracted.vitalSigns) && (
        <div className="mt-3 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-sky-400">
            AI filled from your speech
          </div>
          <dl className="grid gap-1.5 text-[11px]">
            {extracted.unitId && (
              <div>
                <dt className="text-slate-600">Unit</dt>
                <dd className="text-slate-300">{extracted.unitId}</dd>
              </div>
            )}
            {extracted.etaMinutes != null && (
              <div>
                <dt className="text-slate-600">ETA</dt>
                <dd className="text-slate-300">{extracted.etaMinutes} min</dd>
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
                <dd className="font-mono text-sky-300">
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
          Rules baseline score {analysis.rulesBaselineScore} triggered safety guardrail elevation.
        </p>
      )}

      {analysis?.modelId && (
        <p className="mt-2 text-[9px] text-slate-700">Model: {analysis.modelId}</p>
      )}
    </div>
  );
}
