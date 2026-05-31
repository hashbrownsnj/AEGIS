import { useCallback, useEffect, useRef, useState } from "react";
import type { DrugInteraction, Medication } from "@aegis/shared";
import { endpoints } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertOctagon, AlertTriangle, ChevronDown, ChevronUp, Info, Loader2, Pill, ShieldCheck, X } from "lucide-react";

type Props = {
  value: Medication[];
  onChange: (meds: Medication[], interactions: DrugInteraction[]) => void;
  disabled?: boolean;
  /** Use public RxNav API directly (for unauthenticated intake page) */
  publicMode?: boolean;
};

const severityStyles: Record<DrugInteraction["severity"], string> = {
  contraindicated: "border-red-500/40 bg-red-500/10 text-red-400",
  major: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  moderate: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  minor: "border-slate-500/40 bg-slate-500/10 text-slate-400"
};

const severityRank: Record<DrugInteraction["severity"], number> = {
  contraindicated: 4,
  major: 3,
  moderate: 2,
  minor: 1,
};

const severityMeta: Record<DrugInteraction["severity"], { label: string; Icon: typeof AlertOctagon; dot: string }> = {
  contraindicated: { label: "Contraindicated", Icon: AlertOctagon, dot: "bg-red-500" },
  major: { label: "Major", Icon: AlertTriangle, dot: "bg-orange-500" },
  moderate: { label: "Moderate", Icon: AlertTriangle, dot: "bg-amber-400" },
  minor: { label: "Minor", Icon: Info, dot: "bg-slate-400" },
};

function sortInteractions(list: DrugInteraction[]) {
  return [...list].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
}

export function MedInput({ value, onChange, disabled, publicMode }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; rxcui: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const mapSeverity = (raw?: string): DrugInteraction["severity"] => {
    const s = (raw ?? "").toLowerCase();
    if (s.includes("contraindicated")) return "contraindicated";
    if (s.includes("major")) return "major";
    if (s.includes("moderate")) return "moderate";
    return "minor";
  };

  const checkPublicInteractions = async (rxcuis: string[]): Promise<DrugInteraction[]> => {
    if (rxcuis.length < 2) return [];
    const res = await fetch(`https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join("+")}`);
    if (!res.ok) return [];
    const data = await res.json();
    const interactions: DrugInteraction[] = [];
    for (const group of data.interactionTypeGroup ?? []) {
      for (const type of group.interactionType ?? []) {
        for (const pair of type.interactionPair ?? []) {
          const concepts = pair.interactionConcept ?? [];
          interactions.push({
            drug1: concepts[0]?.sourceConceptItem?.name ?? "Unknown",
            drug2: concepts[1]?.sourceConceptItem?.name ?? "Unknown",
            severity: mapSeverity(pair.severity),
            description: pair.description ?? "Interaction detected"
          });
        }
      }
    }
    return interactions;
  };

  const runInteractionCheck = useCallback(async (meds: Medication[]) => {
    if (meds.length < 2) {
      setInteractions([]);
      onChange(meds, []);
      return;
    }
    try {
      const found = publicMode
        ? await checkPublicInteractions(meds.map((m) => m.rxcui))
        : await endpoints.checkInteractions(meds.map((m) => m.rxcui));
      setInteractions(found);
      onChange(meds, found);
    } catch {
      setInteractions([]);
      onChange(meds, []);
    }
  }, [onChange, publicMode]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      endpoints.searchDrugs(query)
        .then((r) => { setResults(r); setShowDropdown(true); })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function addDrug(drug: { name: string; rxcui: string }) {
    if (value.some((m) => m.rxcui === drug.rxcui)) return;
    const next = [...value, { rxcui: drug.rxcui, name: drug.name }];
    setQuery("");
    setShowDropdown(false);
    runInteractionCheck(next);
  }

  function removeDrug(rxcui: string) {
    const next = value.filter((m) => m.rxcui !== rxcui);
    runInteractionCheck(next);
  }

  function updateField(rxcui: string, field: "dose" | "frequency", val: string) {
    const next = value.map((m) => m.rxcui === rxcui ? { ...m, [field]: val } : m);
    onChange(next, interactions);
  }

  return (
    <div className="grid gap-3" ref={containerRef}>
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
        <Pill className="h-3 w-3" aria-hidden />
        Medication reconciliation
      </div>
      <div className="relative">
        <input
          className="input"
          placeholder="Search medications (RxNorm)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          disabled={disabled}
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" aria-label="Searching" />}
        {showDropdown && results.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
            {results.map((r) => (
              <li key={r.rxcui}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-sky-500/10"
                  onClick={() => addDrug(r)}
                >
                  <span className="font-semibold text-slate-200">{r.name}</span>
                  <span className="font-mono text-xs text-slate-500">{r.rxcui}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((med) => (
            <div key={med.rxcui} className="grid gap-2 rounded-xl border border-slate-800 p-3">
              <span className="pill border-sky-500/30 bg-sky-500/10 text-sky-300">
                {med.name}
                {med.dose ? ` · ${med.dose}` : ""}
                {!disabled && (
                  <button type="button" onClick={() => removeDrug(med.rxcui)} className="rounded-full p-0.5 hover:bg-sky-500/20" aria-label="Remove">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input text-xs"
                  placeholder="Dose (optional)"
                  value={med.dose ?? ""}
                  onChange={(e) => updateField(med.rxcui, "dose", e.target.value)}
                  disabled={disabled}
                />
                <input
                  className="input text-xs"
                  placeholder="Frequency (optional)"
                  value={med.frequency ?? ""}
                  onChange={(e) => updateField(med.rxcui, "frequency", e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length >= 2 && interactions.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3.5 py-2.5 text-[12px] text-emerald-300">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          No interactions returned for this combination. Always confirm with a pharmacist before administration.
        </div>
      )}

      {interactions.length > 0 && (
        <InteractionReport interactions={interactions} open={panelOpen} onToggle={() => setPanelOpen((o) => !o)} />
      )}
    </div>
  );
}

/**
 * InteractionReport — the shared, credible interaction renderer.
 * Presentation only: severity-ranked, summarized, sourced, and bounded by a
 * lawful disclaimer. It surfaces reference data; it does not advise dosing,
 * diagnose, or assert that any combination is "safe."
 */
function InteractionReport({
  interactions,
  open,
  onToggle,
}: {
  interactions: DrugInteraction[];
  open: boolean;
  onToggle: () => void;
}) {
  const sorted = sortInteractions(interactions);
  const counts = sorted.reduce<Record<string, number>>((acc, ix) => {
    acc[ix.severity] = (acc[ix.severity] ?? 0) + 1;
    return acc;
  }, {});
  const top = sorted[0]?.severity ?? "minor";
  const topMeta = severityMeta[top];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
      {/* Summary banner — highest severity present */}
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border", severityStyles[top])}>
          <topMeta.Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            {interactions.length} interaction{interactions.length === 1 ? "" : "s"}
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", severityStyles[top])}>
              {topMeta.label} max
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {(["contraindicated", "major", "moderate", "minor"] as const)
              .filter((s) => counts[s])
              .map((s) => (
                <span key={s} className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums text-slate-400">
                  <span className={cn("h-1.5 w-1.5 rounded-full", severityMeta[s].dot)} />
                  {counts[s]} {severityMeta[s].label.toLowerCase()}
                </span>
              ))}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {open && (
        <div className="border-t border-slate-800/80">
          <ul className="grid gap-2 p-3">
            {sorted.map((ix, i) => {
              const meta = severityMeta[ix.severity];
              return (
                <li key={i} className={cn("rounded-lg border p-3", severityStyles[ix.severity])}>
                  <div className="flex items-center gap-2">
                    <meta.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="text-[10px] font-bold uppercase tracking-wide">{meta.label}</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-100">
                    {ix.drug1} <span className="text-slate-500">+</span> {ix.drug2}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-300/90">{ix.description}</p>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 px-4 py-2.5">
            <span className="font-mono text-[9px] uppercase tracking-[.16em] text-slate-600">
              Source · NIH RxNav / RxNorm
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Info className="h-3 w-3" aria-hidden />
              Informational only — not dosing guidance or diagnosis. Verify with a pharmacist.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function InteractionPanel({ interactions, defaultOpen = true }: { interactions: DrugInteraction[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!interactions.length) return null;
  return <InteractionReport interactions={interactions} open={open} onToggle={() => setOpen((o) => !o)} />;
}

export function severityBadgeClass(severity: DrugInteraction["severity"]) {
  return severityStyles[severity];
}
