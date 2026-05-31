import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { DrugInteraction, Medication } from "@aegis/shared";
import { endpoints } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { AcuityPanel } from "@/components/ui/AcuityPanel";
import { MedInput } from "@/components/ui/MedInput";
import {
  Badge,
  Card,
  EmptyCard,
  Field,
  SectionHeader,
  Spinner,
} from "@/components/ui/Primitives";
import { cn, formatStatusLabel, priorityTone, statusTone } from "@/lib/utils";
import { UserPlus } from "lucide-react";

const EMPTY_FORM = {
  mrn: "",
  fullName: "",
  age: "",
  sex: "unknown",
  arrivalSource: "walk_in",
  symptoms: "",
  medicalHistory: "",
  allergies: "",
  assignedZone: "",
  heartRate: "",
  systolicBp: "",
  oxygenSaturation: "",
  painScore: "",
};

export default function Patients() {
  const { data, loading, reload } = useAsync(endpoints.patients, []);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationInteractions, setMedicationInteractions] = useState<DrugInteraction[]>([]);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [liveThoughts, setLiveThoughts] = useState<string[]>([]);
  const [triagePreview, setTriagePreview] = useState<any>(null);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    endpoints.aiStatus().then((s) => setAiOnline(s.claudeEnabled)).catch(() => setAiOnline(false));
  }, []);

  if (loading) return <Spinner />;

  function buildPayload() {
    const vitalSigns: Record<string, number> = {};
    if (form.heartRate) vitalSigns.heartRate = Number(form.heartRate);
    if (form.systolicBp) vitalSigns.systolicBp = Number(form.systolicBp);
    if (form.oxygenSaturation) vitalSigns.oxygenSaturation = Number(form.oxygenSaturation);
    if (form.painScore) vitalSigns.painScore = Number(form.painScore);
    return {
      ...form,
      age: Number(form.age),
      symptoms: form.symptoms.split(",").map((s: string) => s.trim()).filter(Boolean),
      medicalHistory: form.medicalHistory.split(",").map((s: string) => s.trim()).filter(Boolean),
      allergies: form.allergies.split(",").map((s: string) => s.trim()).filter(Boolean),
      vitalSigns: Object.keys(vitalSigns).length ? vitalSigns : undefined,
      medications,
      medicationInteractions,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setLiveThoughts([]);
    setTriagePreview(null);
    const payload = buildPayload();
    try {
      await endpoints.createPatientStream(payload, {
        onThought: (text) => setLiveThoughts((prev) => (prev.includes(text) ? prev : [...prev, text])),
        onResult: (data: any) => {
          if (data?.triage) setTriagePreview(data.triage);
          setForm(EMPTY_FORM);
          setMedications([]);
          setMedicationInteractions([]);
          setLiveThoughts([]);
          reload();
        },
        onError: () => reload(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        title="Patient Management"
        subtitle={
          aiOnline
            ? "Register patients — Claude ACUITY triages at intake with live reasoning and rules guardrail."
            : "Register patients — rules-engine triage active (set ANTHROPIC_API_KEY for Claude)."
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        {/* Patients table */}
        {!data?.length ? (
          <EmptyCard title="No patients registered" body="Use the intake form to register the first patient." />
        ) : (
          <Card className="overflow-hidden p-0 self-start">
            <div className="border-b border-slate-800 px-5 py-3.5">
              <h2 className="text-sm font-black text-slate-200">Registered Patients</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">{data.length} record{data.length !== 1 && "s"}</p>
            </div>
            <table className="data-table w-full text-left text-sm">
              <thead className="bg-slate-900/60">
                <tr>
                  <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">MRN</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Patient</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Arrival</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Status</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Triage</th>
                  <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Zone</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p: any) => (
                  <tr key={p._id}>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] text-slate-500">{p.mrn}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <Link
                        className="text-sm font-bold text-sky-400 hover:text-sky-300 hover:underline"
                        to={`/patients/${p._id}`}
                      >
                        {p.fullName}
                      </Link>
                      <div className="text-[11px] text-slate-500">{p.age}y</div>
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-slate-400 capitalize">
                      {p.arrivalSource?.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn("pill", statusTone(p.status))}>{formatStatusLabel(p.status)}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge className={priorityTone(p.triageStatus)}>
                        {p.triageStatus?.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-400">{p.assignedZone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Intake form */}
        <Card className="self-start">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-black text-slate-200">Patient Intake</h2>
            {aiOnline != null && (
              <Badge className={aiOnline ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : "border-slate-600 text-slate-500"}>
                {aiOnline ? "Claude Online" : "Rules Only"}
              </Badge>
            )}
          </div>

          <form className="grid gap-3" onSubmit={submit}>
            <Field label="Medical Record Number" hint="Must be unique — use your hospital's standard format.">
              <input
                className="input font-mono"
                placeholder="AEG-10XXX"
                value={form.mrn}
                onChange={(e) => setForm({ ...form, mrn: e.target.value })}
                required
              />
            </Field>

            <Field label="Full Name">
              <input
                className="input"
                placeholder="First Last"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
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
                  required
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

            <Field label="Arrival Source">
              <select
                className="input"
                value={form.arrivalSource}
                onChange={(e) => setForm({ ...form, arrivalSource: e.target.value })}
              >
                <option value="walk_in">Walk-in</option>
                <option value="ems">EMS</option>
                <option value="transfer">Transfer</option>
                <option value="referral">Referral</option>
              </select>
            </Field>

            <Field label="Presenting Symptoms" hint="Separate with commas">
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="chest pain, shortness of breath…"
                value={form.symptoms}
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              />
            </Field>

            <Field label="Medical History" hint="Separate with commas">
              <input
                className="input"
                placeholder="hypertension, T2DM…"
                value={form.medicalHistory}
                onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
              />
            </Field>

            <Field label="Known Allergies" hint="Separate with commas">
              <input
                className="input"
                placeholder="penicillin, sulfa…"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Heart Rate">
                <input className="input" type="number" placeholder="bpm" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} />
              </Field>
              <Field label="Systolic BP">
                <input className="input" type="number" placeholder="mmHg" value={form.systolicBp} onChange={(e) => setForm({ ...form, systolicBp: e.target.value })} />
              </Field>
              <Field label="SpO₂">
                <input className="input" type="number" placeholder="%" value={form.oxygenSaturation} onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })} />
              </Field>
              <Field label="Pain (0–10)">
                <input className="input" type="number" min={0} max={10} placeholder="—" value={form.painScore} onChange={(e) => setForm({ ...form, painScore: e.target.value })} />
              </Field>
            </div>

            {(submitting || liveThoughts.length > 0 || triagePreview) && (
              <AcuityPanel
                analysis={triagePreview ?? undefined}
                liveThoughts={liveThoughts}
                analyzing={submitting}
                compact
              />
            )}

            <Field label="Current Medications">
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
              {submitting ? "Claude triaging…" : "Register Patient & Run Triage"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
