import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { TRIAGE_LEVELS } from "@aegis/shared";
import { endpoints } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import {
  Badge,
  Card,
  EmptyCard,
  EmptyState,
  Field,
  SectionHeader,
  SkeletonRows,
} from "@/components/ui/Primitives";
import { acuityRank, cn, priorityTone, triageAccent } from "@/lib/utils";

const filters = ["All", ...TRIAGE_LEVELS] as const;

type SortKey = "position" | "acuity" | "wait";
type SortState = { key: SortKey; dir: "asc" | "desc" };

function chiefComplaint(patient: any): string {
  const s = patient?.symptoms;
  if (Array.isArray(s) && s.length) return s.slice(0, 3).join(", ");
  return "—";
}

function waitedClock(fromISO: string | undefined, now: number): string | null {
  if (!fromISO) return null;
  const ms = now - new Date(fromISO).getTime();
  if (!isFinite(ms) || ms < 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function Queue() {
  const { data, error, loading, reload } = useAsync(endpoints.queue, []);
  const [selected, setSelected] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [score, setScore] = useState<number | "">("");
  const [filter, setFilter] = useState<string>("All");
  const [recalculating, setRecalculating] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "position", dir: "asc" });
  const [focusIdx, setFocusIdx] = useState(0);

  // Live clock for ticking wait times.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Track new arrivals to flash their row once.
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoadDone = useRef(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!data) return;
    const ids = (data as any[]).map((e) => e._id);
    if (!firstLoadDone.current) {
      // First load: seed seen-set, play the staggered reveal, no flash.
      ids.forEach((id) => seenIds.current.add(id));
      firstLoadDone.current = true;
      const t = setTimeout(() => setRevealed(true), 600);
      return () => clearTimeout(t);
    }
    const fresh = ids.filter((id) => !seenIds.current.has(id));
    if (fresh.length) {
      ids.forEach((id) => seenIds.current.add(id));
      setFlashIds(new Set(fresh));
      const t = setTimeout(() => setFlashIds(new Set()), 1600);
      return () => clearTimeout(t);
    }
  }, [data]);

  const filtered = useMemo(
    () =>
      (data ?? []).filter((e: any) =>
        filter === "All" ? true : e.patient?.triageStatus === filter
      ),
    [data, filter]
  );

  const rows = useMemo(() => {
    const list = [...filtered];
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a: any, b: any) => {
      if (sort.key === "acuity") {
        return (acuityRank(b.patient?.triageStatus) - acuityRank(a.patient?.triageStatus)) * dir
          || (a.position - b.position);
      }
      if (sort.key === "wait") {
        return ((b.estimatedWaitMinutes ?? 0) - (a.estimatedWaitMinutes ?? 0)) * dir
          || (a.position - b.position);
      }
      return (a.position - b.position) * dir;
    });
    return list;
  }, [filtered, sort]);

  // Keep keyboard focus index in range as rows change.
  useEffect(() => {
    setFocusIdx((i) => Math.max(0, Math.min(i, rows.length - 1)));
  }, [rows.length]);

  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  function selectRow(e: any) {
    setSelected(e);
    setScore(e.priorityScore ?? "");
  }

  function onKeyDown(ev: React.KeyboardEvent) {
    if (!rows.length) return;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setFocusIdx((i) => {
        const next = Math.min(i + 1, rows.length - 1);
        rowRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setFocusIdx((i) => {
        const next = Math.max(i - 1, 0);
        rowRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      const e = rows[focusIdx];
      if (e) selectRow(e);
    }
  }

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  }

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      await endpoints.reorder();
      await reload();
    } finally {
      setRecalculating(false);
    }
  }

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => {
    const active = sort.key === sortKey;
    return (
      <button
        type="button"
        onClick={() => toggleSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 font-mono uppercase tracking-[.14em] transition-colors",
          active ? "text-slate-300" : "text-slate-500 hover:text-slate-300"
        )}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        {active &&
          (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    );
  };

  return (
    <div className="grid gap-5">
      <SectionHeader
        title="Live Queue"
        subtitle="Ranking combines ACUITY urgency, wait time, arrival source, workflow state, and audited manual overrides. Decision support — it does not diagnose or replace clinician judgment."
        action={
          <button className="btn btn-primary flex items-center gap-2" onClick={handleRecalculate} disabled={recalculating}>
            {recalculating && <Loader2 className="h-4 w-4 animate-spin" />}
            {recalculating ? "Recalculating…" : "Recalculate queue"}
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-2.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-[.12em] text-red-300">Queue feed error</span>
          <span className="text-xs text-red-400/80">{error}</span>
        </div>
      )}

      {/* Filters + acuity legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "pill transition-colors",
                filter === f
                  ? f === "All"
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-400"
                    : priorityTone(f)
                  : "border-slate-700 text-slate-500 hover:text-slate-300"
              )}
            >
              {f === "All" ? "All" : f.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-hidden>
          {TRIAGE_LEVELS.map((lvl) => (
            <span key={lvl} className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.12em] text-slate-500">
              <span className="h-2 w-2 rounded-sm" style={{ background: triageAccent(lvl) }} />
              {lvl.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        {loading ? (
          <Card className="overflow-hidden p-0">
            <SkeletonRows rows={7} label="Loading queue…" />
          </Card>
        ) : !rows.length ? (
          <EmptyCard title="Queue empty" body="No patients match this filter. New arrivals appear here once registered and triaged." />
        ) : (
          <Card className="overflow-hidden p-0">
            <div
              className="max-h-[70vh] overflow-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-500/60"
              tabIndex={0}
              role="grid"
              aria-label="Live patient queue. Use up and down arrows to move, enter to inspect."
              onKeyDown={onKeyDown}
            >
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                  <tr className="border-b border-slate-800 text-[10px]">
                    <th className="py-2.5 pl-4 pr-2"><SortHeader label="Pos" sortKey="position" /></th>
                    <th className="px-3 py-2.5 font-mono uppercase tracking-[.14em] text-slate-500">Patient</th>
                    <th className="px-3 py-2.5"><SortHeader label="Acuity" sortKey="acuity" /></th>
                    <th className="px-3 py-2.5 font-mono uppercase tracking-[.14em] text-slate-500">Chief complaint</th>
                    <th className="px-3 py-2.5 font-mono uppercase tracking-[.14em] text-slate-500">Zone</th>
                    <th className="px-3 py-2.5 pr-4"><SortHeader label="Wait" sortKey="wait" /></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e: any, idx: number) => {
                    const level = e.patient?.triageStatus;
                    const isSelected = selected?._id === e._id;
                    const isFocused = focusIdx === idx;
                    const waited = waitedClock(e.patient?.createdAt, now);
                    return (
                      <tr
                        key={e._id}
                        ref={(el) => { rowRefs.current[idx] = el; }}
                        role="row"
                        aria-selected={isSelected}
                        className={cn(
                          "cursor-pointer border-b border-slate-800/60 transition-colors",
                          !revealed && "row-reveal",
                          flashIds.has(e._id) && "row-flash",
                          isSelected ? "bg-sky-500/[.07]" : isFocused ? "bg-white/[.04]" : "hover:bg-white/[.025]"
                        )}
                        style={!revealed ? { animationDelay: `${Math.min(idx, 12) * 35}ms` } : undefined}
                        onClick={() => { setFocusIdx(idx); selectRow(e); }}
                      >
                        {/* Pos + acuity rail */}
                        <td
                          className="py-3 pl-4 pr-2 align-middle"
                          style={{ boxShadow: `inset 3px 0 0 ${triageAccent(level)}` }}
                        >
                          <span className="font-mono text-base font-semibold tabular-nums text-slate-300">
                            {e.position}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="px-3 py-3 align-middle">
                          <div className="font-semibold text-slate-200">{e.patient?.fullName}</div>
                          <div className="font-mono text-[11px] tabular-nums text-slate-500">{e.patient?.mrn}</div>
                        </td>

                        {/* Acuity: label + numeric score */}
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <Badge className={priorityTone(level)}>{level?.replace(/_/g, " ") ?? "pending"}</Badge>
                            <span className="font-mono text-xs tabular-nums text-slate-500">
                              {e.priorityScore ?? "—"}
                            </span>
                          </div>
                        </td>

                        {/* Chief complaint + movement reason */}
                        <td className="max-w-[16rem] px-3 py-3 align-middle">
                          <div className="truncate text-[13px] text-slate-300">{chiefComplaint(e.patient)}</div>
                          {e.movementReason && (
                            <div className="truncate text-[11px] text-slate-600">{e.movementReason}</div>
                          )}
                        </td>

                        {/* Zone */}
                        <td className="px-3 py-3 align-middle text-[13px] text-slate-400">
                          {e.assignedZone || e.patient?.assignedZone || "—"}
                        </td>

                        {/* Live-ticking wait */}
                        <td className="px-3 py-3 pr-4 align-middle">
                          <div className="font-mono text-[13px] font-semibold tabular-nums text-slate-200">
                            {waited ?? `${e.estimatedWaitMinutes}m`}
                          </div>
                          <div className="font-mono text-[10px] tabular-nums text-slate-600">
                            ~{e.estimatedWaitMinutes}m est
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800/80 px-4 py-2 font-mono text-[10px] uppercase tracking-[.16em] text-slate-600">
              <span className="tabular-nums">{rows.length} in queue</span>
              <span>↑↓ navigate · enter inspect</span>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-slate-400">Manual override</h2>
          {!selected ? (
            <div className="mt-4">
              <EmptyState
                title="No patient selected"
                body="Select a queue row to inspect movement logic or perform an authorized, audited override."
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              <div>
                <div className="font-semibold text-slate-200">{selected.patient?.fullName}</div>
                <div className="font-mono text-[11px] tabular-nums text-slate-500">{selected.patient?.mrn}</div>
                <p className="mt-1 text-xs text-slate-500">Overrides are logged to the audit trail and require an operational reason.</p>
              </div>
              <Field label="Priority score">
                <input
                  className="input font-mono tabular-nums"
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </Field>
              <Field label="Reason">
                <textarea
                  className="input min-h-36"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Required: describe the clinical or operational reason for this override."
                />
              </Field>
              <button
                className="btn btn-primary"
                disabled={score === "" || !reason.trim()}
                onClick={() =>
                  endpoints.override({
                    queueEntryId: selected._id,
                    priorityScore: Number(score),
                    reason
                  }).then(() => {
                    setReason("");
                    reload();
                  })
                }
              >
                Apply override
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
