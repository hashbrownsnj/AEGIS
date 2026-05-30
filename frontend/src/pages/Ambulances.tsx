import { useState } from "react";
import type { DrugInteraction, Medication } from "@aegis/shared";
import { endpoints } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { InteractionPanel, MedInput } from "@/components/ui/MedInput";
import { RadioDictation } from "@/components/ui/RadioDictation";
import {
  Badge,
  Card,
  EmptyCard,
  Field,
  SectionHeader,
  Spinner,
} from "@/components/ui/Primitives";
import { cn, priorityTone, urgencyBorderClass } from "@/lib/utils";
import { ChevronDown, ChevronUp, Clock, Radio } from "lucide-react";

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

      <div className="mt-4 rounded-xl border border-slate-800/60 bg-slate-950/50 p-3.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          <b className="text-xs font-bold uppercase tracking-widest text-slate-400">ACUITY Preparation</b>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{r.analysis?.rationale}</p>

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

const EMPTY_FORM = {
  unitId: "",
  etaMinutes: "",
  patientDescriptor: "",
  age: "",
  sex: "unknown",
  structuredSymptoms: "",
  reportText: "",
};

export default function Ambulances() {
  const { data, loading, reload } = useAsync(endpoints.ambulances, []);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationInteractions, setMedicationInteractions] = useState<DrugInteraction[]>([]);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await endpoints.createAmbulance({
        ...form,
        etaMinutes: Number(form.etaMinutes),
        age: Number(form.age),
        structuredSymptoms: form.structuredSymptoms
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        medications,
        medicationInteractions,
      });
      setForm(EMPTY_FORM);
      setMedications([]);
      setMedicationInteractions([]);
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        title="Ambulance Pre-Arrival"
        subtitle="EMS reports with real-time ACUITY analysis and medication intelligence. Use the radio listener to transcribe incoming calls."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        {/* Reports list */}
        <div className="grid content-start gap-3">
          {!data?.length ? (
            <EmptyCard title="No incoming ambulances" body="Submitted EMS reports will appear here." />
          ) : (
            data.map((r: any) => <AmbulanceCard key={r._id} r={r} />)
          )}
        </div>

        {/* Submit form */}
        <Card className="self-start">
          <div className="mb-4 flex items-center gap-2">
            <Radio className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-black text-slate-200">Submit EMS Report</h2>
          </div>

          <form className="grid gap-3" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit ID">
                <input
                  className="input"
                  placeholder="Medic 4"
                  value={form.unitId}
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                  required
                />
              </Field>
              <Field label="ETA (min)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="8"
                  value={form.etaMinutes}
                  onChange={(e) => setForm({ ...form, etaMinutes: e.target.value })}
                  required
                />
              </Field>
            </div>

            <Field label="Patient Descriptor">
              <input
                className="input"
                placeholder="72yo male, chest pain"
                value={form.patientDescriptor}
                onChange={(e) => setForm({ ...form, patientDescriptor: e.target.value })}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="—"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </Field>
              <Field label="Sex">
                <select
                  className="input"
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

            <Field label="Symptoms" hint="Separate with commas">
              <input
                className="input"
                placeholder="chest pain, diaphoresis, dyspnea"
                value={form.structuredSymptoms}
                onChange={(e) => setForm({ ...form, structuredSymptoms: e.target.value })}
              />
            </Field>

            {/* Radio dictation */}
            <Field label="Paramedic Report / Radio Transcript">
              <RadioDictation
                value={form.reportText}
                onChange={(text) => setForm({ ...form, reportText: text })}
                placeholder="Dictate or type the paramedic radio report here…"
                rows={5}
              />
            </Field>

            <Field label="Known Medications (optional)">
              <MedInput
                value={medications}
                onChange={(meds, ixs) => {
                  setMedications(meds);
                  setMedicationInteractions(ixs);
                }}
              />
            </Field>

            <button
              className="btn btn-primary mt-1 flex items-center justify-center gap-2"
              type="submit"
              disabled={submitting}
            >
              {submitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitting ? "Analyzing…" : "Submit & Analyze"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
