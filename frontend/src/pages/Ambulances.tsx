import { useCallback, useEffect, useState } from "react";
import type { DrugInteraction, Medication } from "@aegis/shared";
import { endpoints } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { applyExtractedToAmbulanceForm, type AmbulanceFormFields } from "@/lib/applyExtractedFields";
import { useLiveFieldExtraction } from "@/lib/useLiveFieldExtraction";
import { AcuityPanel } from "@/components/ui/AcuityPanel";
import { InteractionPanel, MedInput } from "@/components/ui/MedInput";
import { MedicFieldRecorder } from "@/components/ui/MedicFieldRecorder";
import {
  Badge,
  Card,
  EmptyCard,
  Field,
  SectionHeader,
  Spinner,
} from "@/components/ui/Primitives";
import { cn, priorityTone, urgencyBorderClass } from "@/lib/utils";
import { ChevronDown, ChevronUp, Clock, Radio, Sparkles } from "lucide-react";

function AmbulanceCard({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false);
  const hasInteractions = r.medicationInteractions?.length > 0;
  const urgency = r.analysis?.urgencyLevel;

  const urgencyBg =
    urgency === "critical"
      ? "bg-red-500/5 border-red-500/25"
      : urgency === "emergent"
      ? "bg-orange-500/5 border-orange-500/25"
      : "bg-slate-900/40 border-slate-800/80";

  return (
    <div className={cn("rounded-2xl border p-4 transition-all", urgencyBg, urgencyBorderClass(urgency))}>
      {hasInteractions && (
        <button
          type="button"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-300 transition-colors hover:bg-red-500/15"
          onClick={() => setExpanded((e) => !e)}
        >
          ⚠ Drug Interaction Detected
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 shrink-0 text-sky-400" />
            <b className="text-slate-100">{r.unitId}</b>
            <Badge className={priorityTone(urgency)}>{urgency?.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">{r.patientDescriptor}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-baseline gap-1">
            <Clock className="mb-0.5 h-3 w-3 text-slate-500" />
            <span className="text-2xl font-black tabular-nums text-sky-400">{r.etaMinutes}</span>
            <span className="text-xs font-semibold text-slate-500">min</span>
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">ETA</div>
        </div>
      </div>

      <p className="mt-3 rounded-lg border border-slate-800/60 bg-slate-950/40 p-3 text-[12px] leading-relaxed text-slate-400">
        {r.reportText}
      </p>

      {r.medications?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.medications.map((m: any) => (
            <span key={m.rxcui} className="pill border-sky-500/30 bg-sky-500/8 text-sky-300">
              {m.name}{m.dose ? ` · ${m.dose}` : ""}
            </span>
          ))}
        </div>
      )}

      {expanded && hasInteractions && (
        <div className="mt-3">
          <InteractionPanel interactions={r.medicationInteractions} defaultOpen />
        </div>
      )}

      <div className="mt-4">
        <AcuityPanel analysis={r.analysis} />
        {r.analysis?.suggestedTeams?.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">Teams</div>
            <div className="flex flex-wrap gap-1.5">
              {r.analysis.suggestedTeams.map((t: string) => (
                <span key={t} className="pill border-slate-700/60 text-slate-400">{t}</span>
              ))}
            </div>
          </div>
        )}
        {r.analysis?.equipmentChecklist?.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">Equipment</div>
            <div className="flex flex-wrap gap-1.5">
              {r.analysis.equipmentChecklist.map((e: string) => (
                <span key={e} className="pill border-slate-700/60 text-slate-400">{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM: AmbulanceFormFields = {
  unitId: "",
  etaMinutes: "",
  patientDescriptor: "",
  age: "",
  sex: "unknown",
  structuredSymptoms: "",
  reportText: "",
  heartRate: "",
  systolicBp: "",
  diastolicBp: "",
  oxygenSaturation: "",
  painScore: "",
};

function vitalsFromForm(form: AmbulanceFormFields) {
  const v: Record<string, number> = {};
  if (form.heartRate) v.heartRate = Number(form.heartRate);
  if (form.systolicBp) v.systolicBp = Number(form.systolicBp);
  if (form.diastolicBp) v.diastolicBp = Number(form.diastolicBp);
  if (form.oxygenSaturation) v.oxygenSaturation = Number(form.oxygenSaturation);
  if (form.painScore) v.painScore = Number(form.painScore);
  return Object.keys(v).length ? v : undefined;
}

function AiInput({
  aiFilled,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { aiFilled?: boolean }) {
  return (
    <input
      {...props}
      className={cn(
        "input transition-all",
        aiFilled && "border-violet-500/50 ring-1 ring-violet-500/25 bg-violet-500/5",
        className
      )}
    />
  );
}

export default function Ambulances() {
  const { data, loading, reload } = useAsync(endpoints.ambulances, []);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationInteractions, setMedicationInteractions] = useState<DrugInteraction[]>([]);
  const [form, setForm] = useState<AmbulanceFormFields>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [liveThoughts, setLiveThoughts] = useState<string[]>([]);
  const [extractPreview, setExtractPreview] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    endpoints.aiStatus().then((s) => setAiOnline(s.claudeEnabled)).catch(() => setAiOnline(false));
  }, []);

  const handleExtracted = useCallback((extracted: any, thoughts: string[]) => {
    setExtractPreview(extracted);
    setForm((prev) => {
      const { form: next, touched } = applyExtractedToAmbulanceForm(prev, extracted);
      if (touched.length) {
        setAiFilledFields((s) => new Set([...s, ...touched]));
      }
      return next;
    });
    if (thoughts.length) {
      setLiveThoughts((prev) => {
        const merged = [...prev];
        for (const t of thoughts) if (!merged.includes(t)) merged.push(t);
        return merged;
      });
    }
    setExtracting(false);
  }, []);

  const { schedule, flush, reset, cancel } = useLiveFieldExtraction(handleExtracted, !!aiOnline);

  const handleTranscriptUpdate = useCallback(
    (text: string) => {
      setForm((prev) => ({ ...prev, reportText: text }));
      if (aiOnline) {
        setExtracting(true);
        schedule(text);
      }
    },
    [aiOnline, schedule]
  );

  const handleRecordingStart = useCallback(() => {
    setIsRecording(true);
    setLiveThoughts([]);
    setExtractPreview(null);
    reset();
  }, [reset]);

  const handleRecordingStop = useCallback(
    async (text: string) => {
      setIsRecording(false);
      cancel();
      if (aiOnline && text.trim().length >= 25) {
        setExtracting(true);
        await flush(text);
      }
    },
    [aiOnline, flush, cancel]
  );

  if (loading) return <Spinner />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setLiveThoughts([]);
    try {
      await endpoints.createAmbulanceStream(
        {
          ...form,
          etaMinutes: Number(form.etaMinutes),
          age: form.age ? Number(form.age) : undefined,
          structuredSymptoms: form.structuredSymptoms.split(",").map((s) => s.trim()).filter(Boolean),
          vitals: vitalsFromForm(form),
          transcriptText: form.reportText,
          medications,
          medicationInteractions,
        },
        {
          onThought: (text) => setLiveThoughts((prev) => (prev.includes(text) ? prev : [...prev, text])),
          onResult: () => {
            setForm(EMPTY_FORM);
            setMedications([]);
            setMedicationInteractions([]);
            setExtractPreview(null);
            setLiveThoughts([]);
            setAiFilledFields(new Set());
            reset();
            reload();
          },
          onError: () => reload(),
        }
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        title="Ambulance Pre-Arrival"
        subtitle={
          aiOnline
            ? "Hit Record, work your call — speech becomes text and Claude fills the form in real time."
            : "Hit Record for live transcription. Add ANTHROPIC_API_KEY for AI field extraction."
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_480px]">
        <div className="grid content-start gap-3">
          {!data?.length ? (
            <EmptyCard title="No incoming ambulances" body="Submitted EMS reports will appear here." />
          ) : (
            data.map((r: any) => <AmbulanceCard key={r._id} r={r} />)
          )}
        </div>

        <Card className="self-start">
          <div className="mb-4 flex items-center gap-2">
            <Radio className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-black text-slate-200">Submit EMS Report</h2>
            {aiOnline != null && (
              <Badge className={aiOnline ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : "border-slate-600 text-slate-500"}>
                {aiOnline ? "Claude Online" : "Rules Only"}
              </Badge>
            )}
          </div>

          <form className="grid gap-3" onSubmit={submit}>
            {/* Record first — medic workflow */}
            <MedicFieldRecorder
              value={form.reportText}
              onChange={(text) => setForm({ ...form, reportText: text })}
              onTranscriptUpdate={handleTranscriptUpdate}
              onRecordingStart={handleRecordingStart}
              onRecordingStop={handleRecordingStop}
              liveExtracting={extracting && isRecording}
              aiEnabled={!!aiOnline}
              rows={3}
            />

            {(extracting || extractPreview || liveThoughts.length > 0 || (submitting && liveThoughts.length > 0)) && (
              <AcuityPanel
                analysis={extractPreview ? { extractedFields: extractPreview } : undefined}
                liveThoughts={liveThoughts}
                analyzing={extracting || submitting}
                compact
              />
            )}

            {aiFilledFields.size > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-violet-500/25 bg-violet-500/8 px-3 py-2 text-[11px] text-violet-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>
                  AI filled {aiFilledFields.size} field{aiFilledFields.size !== 1 ? "s" : ""} from your speech — review before submit.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit ID" hint={aiFilledFields.has("unitId") ? "AI filled" : undefined}>
                <AiInput
                  aiFilled={aiFilledFields.has("unitId")}
                  placeholder="Medic 4"
                  value={form.unitId}
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                  required
                />
              </Field>
              <Field label="ETA (min)" hint={aiFilledFields.has("etaMinutes") ? "AI filled" : undefined}>
                <AiInput
                  aiFilled={aiFilledFields.has("etaMinutes")}
                  type="number"
                  min={0}
                  placeholder="8"
                  value={form.etaMinutes}
                  onChange={(e) => setForm({ ...form, etaMinutes: e.target.value })}
                  required
                />
              </Field>
            </div>

            <Field label="Patient Descriptor" hint={aiFilledFields.has("patientDescriptor") ? "AI filled" : undefined}>
              <AiInput
                aiFilled={aiFilledFields.has("patientDescriptor")}
                placeholder="72yo male, chest pain"
                value={form.patientDescriptor}
                onChange={(e) => setForm({ ...form, patientDescriptor: e.target.value })}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Age" hint={aiFilledFields.has("age") ? "AI filled" : undefined}>
                <AiInput aiFilled={aiFilledFields.has("age")} type="number" min={0} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </Field>
              <Field label="Sex" hint={aiFilledFields.has("sex") ? "AI filled" : undefined}>
                <select
                  className={cn("input", aiFilledFields.has("sex") && "border-violet-500/50 ring-1 ring-violet-500/25 bg-violet-500/5")}
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}
                >
                  <option value="unknown">Unknown</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="intersex">Intersex</option>
                </select>
              </Field>
            </div>

            <Field label="Symptoms" hint={aiFilledFields.has("structuredSymptoms") ? "AI filled" : "Separate with commas"}>
              <AiInput
                aiFilled={aiFilledFields.has("structuredSymptoms")}
                placeholder="chest pain, diaphoresis, dyspnea"
                value={form.structuredSymptoms}
                onChange={(e) => setForm({ ...form, structuredSymptoms: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Heart Rate" hint={aiFilledFields.has("heartRate") ? "AI filled" : undefined}>
                <AiInput aiFilled={aiFilledFields.has("heartRate")} type="number" placeholder="bpm" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} />
              </Field>
              <Field label="Systolic BP" hint={aiFilledFields.has("systolicBp") ? "AI filled" : undefined}>
                <AiInput aiFilled={aiFilledFields.has("systolicBp")} type="number" placeholder="mmHg" value={form.systolicBp} onChange={(e) => setForm({ ...form, systolicBp: e.target.value })} />
              </Field>
              <Field label="SpO₂" hint={aiFilledFields.has("oxygenSaturation") ? "AI filled" : undefined}>
                <AiInput aiFilled={aiFilledFields.has("oxygenSaturation")} type="number" placeholder="%" value={form.oxygenSaturation} onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })} />
              </Field>
              <Field label="Pain (0–10)" hint={aiFilledFields.has("painScore") ? "AI filled" : undefined}>
                <AiInput aiFilled={aiFilledFields.has("painScore")} type="number" min={0} max={10} value={form.painScore} onChange={(e) => setForm({ ...form, painScore: e.target.value })} />
              </Field>
            </div>

            <Field label="Known Medications (optional)">
              <MedInput
                value={medications}
                onChange={(meds, ixs) => {
                  setMedications(meds);
                  setMedicationInteractions(ixs);
                }}
              />
            </Field>

            <button className="btn btn-primary mt-1 flex items-center justify-center gap-2" type="submit" disabled={submitting || isRecording}>
              {submitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isRecording ? "Stop recording first" : submitting ? "Claude analyzing…" : "Submit & Analyze"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
