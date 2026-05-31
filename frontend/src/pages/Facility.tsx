import { useMemo, useState } from "react";
import { Building2, Lock, MapPin, Plus, Save, ShieldAlert, Trash2, Unlock } from "lucide-react";
import { SectionHeader, Card, Badge, Field, EmptyState } from "@/components/ui/Primitives";
import { HospitalMap } from "@/components/ui/HospitalMap";
import {
  loadFacility,
  saveFacility,
  makeLock,
  verifyLock,
  newHospitalId,
  CAPABILITY_LABELS,
  type FacilityConfig,
  type Hospital,
  type HospitalCapability,
} from "@/lib/facilityConfig";
import { cn } from "@/lib/utils";

const ALL_CAPS = Object.keys(CAPABILITY_LABELS) as HospitalCapability[];

function emptyHospital(): Hospital {
  return { id: newHospitalId(), name: "", address: "", capabilities: ["general"] };
}

export default function Facility() {
  const [cfg, setCfg] = useState<FacilityConfig>(() => loadFacility());
  const [unlocked, setUnlocked] = useState<boolean>(() => !loadFacility().lock);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => loadFacility().hospitals[0]?.id ?? null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const selected = useMemo(() => cfg.hospitals.find((h) => h.id === selectedId) ?? null, [cfg.hospitals, selectedId]);

  async function tryUnlock(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (await verifyLock(cfg.lock, pw)) {
      setUnlocked(true);
      setPw("");
    } else {
      setPwError("Incorrect passphrase.");
    }
  }

  function persist(next: FacilityConfig) {
    const saved = saveFacility(next);
    setCfg(saved);
    setSavedAt(saved.updatedAt);
  }

  async function setPassphrase(value: string) {
    const lock = value ? await makeLock(value) : undefined;
    persist({ ...cfg, lock });
  }

  function updateHospital(id: string, patch: Partial<Hospital>) {
    persist({ ...cfg, hospitals: cfg.hospitals.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
  }

  function addHospital() {
    const h = emptyHospital();
    persist({ ...cfg, hospitals: [...cfg.hospitals, h] });
    setSelectedId(h.id);
  }

  function removeHospital(id: string) {
    const rest = cfg.hospitals.filter((h) => h.id !== id);
    persist({ ...cfg, hospitals: rest });
    if (selectedId === id) setSelectedId(rest[0]?.id ?? null);
  }

  // ── Locked view ────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="grid gap-5">
        <SectionHeader title="Facility Setup" subtitle="Protected configuration for your hospital network." />
        <div className="mx-auto w-full max-w-sm">
          <Card>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-sky-500/30 bg-sky-500/10">
                <Lock className="h-4 w-4 text-sky-400" />
              </span>
              <div>
                <div className="text-sm font-bold text-slate-100">Locked</div>
                <div className="text-[11px] text-slate-500">Enter the facility passphrase to edit.</div>
              </div>
            </div>
            <form onSubmit={tryUnlock} className="grid gap-3">
              <input
                className="input"
                type="password"
                autoFocus
                placeholder="Facility passphrase"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              {pwError && <div className="text-[11px] text-red-400">{pwError}</div>}
              <button className="btn btn-primary flex items-center justify-center gap-2" type="submit">
                <Unlock className="h-4 w-4" /> Unlock
              </button>
            </form>
          </Card>
          <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-600">
            <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
            This passphrase is a local cover for shared workstations, not full security. The app's sign-in is the real access control. Don't store patient information here.
          </p>
        </div>
      </div>
    );
  }

  // ── Unlocked editor ──────────────────────────────────────────────────────
  return (
    <div className="grid gap-5">
      <SectionHeader
        title="Facility Setup"
        subtitle="Define your hospital network and capabilities. This drives Transport Routing. Stored locally on this device only."
        action={
          savedAt ? (
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <Save className="mr-1 inline h-3 w-3" /> Saved
            </Badge>
          ) : undefined
        }
      />

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        {/* Left: network + list + security */}
        <div className="grid content-start gap-4">
          <Card>
            <Field label="Network name">
              <input
                className="input"
                placeholder="e.g. Mercy Regional Health"
                value={cfg.networkName}
                onChange={(e) => persist({ ...cfg, networkName: e.target.value })}
              />
            </Field>
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Hospitals</span>
                <button className="btn btn-secondary flex items-center gap-1.5 px-2.5 py-1 text-xs" onClick={addHospital}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              {cfg.hospitals.length === 0 ? (
                <EmptyState title="No hospitals yet" body="Add a hospital to begin." />
              ) : (
                <ul className="grid gap-1.5">
                  {cfg.hospitals.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(h.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                          selectedId === h.id
                            ? "border-sky-500/40 bg-sky-500/10 text-slate-100"
                            : "border-slate-800 text-slate-300 hover:bg-white/[.03]"
                        )}
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <span className="flex-1 truncate">{h.name || "Untitled hospital"}</span>
                        {h.diversion && <span className="h-1.5 w-1.5 rounded-full bg-red-400" title="On diversion" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Security</span>
            </div>
            <Field label={cfg.lock ? "Change / clear passphrase" : "Set a passphrase (optional)"}>
              <input
                className="input"
                type="password"
                placeholder={cfg.lock ? "New passphrase (blank to remove)" : "Passphrase"}
                onBlur={(e) => { void setPassphrase(e.target.value); e.target.value = ""; }}
              />
            </Field>
            <Field label="Google Maps Embed API key (optional)">
              <input
                className="input font-mono text-xs"
                placeholder="Enables inline turn-by-turn directions"
                value={cfg.mapsApiKey ?? ""}
                onChange={(e) => persist({ ...cfg, mapsApiKey: e.target.value || undefined })}
              />
            </Field>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
              Without a key, maps use Google's keyless embed and a deep link. With a key, routes render inline.
            </p>
          </Card>
        </div>

        {/* Right: editor + live map */}
        {selected ? (
          <div className="grid content-start gap-4">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Hospital details</span>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/10"
                  onClick={() => removeHospital(selected.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
              <div className="grid gap-3">
                <Field label="Hospital name (as on Google Maps)">
                  <input className="input" value={selected.name} placeholder="e.g. Mercy Regional Medical Center" onChange={(e) => updateHospital(selected.id, { name: e.target.value })} />
                </Field>
                <Field label="Address">
                  <input className="input" value={selected.address} placeholder="123 Care Blvd, City, ST" onChange={(e) => updateHospital(selected.id, { address: e.target.value })} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Latitude (optional)">
                    <input className="input font-mono tabular-nums" inputMode="decimal" value={selected.lat ?? ""} placeholder="40.349" onChange={(e) => updateHospital(selected.id, { lat: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </Field>
                  <Field label="Longitude (optional)">
                    <input className="input font-mono tabular-nums" inputMode="decimal" value={selected.lng ?? ""} placeholder="-74.652" onChange={(e) => updateHospital(selected.id, { lng: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </Field>
                  <Field label="ED beds (optional)">
                    <input className="input font-mono tabular-nums" type="number" min={0} value={selected.edBeds ?? ""} placeholder="24" onChange={(e) => updateHospital(selected.id, { edBeds: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </Field>
                </div>

                <div>
                  <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Capabilities</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_CAPS.map((c) => {
                      const on = selected.capabilities.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            updateHospital(selected.id, {
                              capabilities: on ? selected.capabilities.filter((x) => x !== c) : [...selected.capabilities, c],
                            })
                          }
                          className={cn("pill transition-colors", on ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-slate-700 text-slate-500 hover:text-slate-300")}
                          aria-pressed={on}
                        >
                          {CAPABILITY_LABELS[c]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-red-500"
                    checked={!!selected.diversion}
                    onChange={(e) => updateHospital(selected.id, { diversion: e.target.checked })}
                  />
                  Currently on diversion (deprioritize in routing)
                </label>
              </div>
            </Card>

            <Card className="p-3.5">
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
                <MapPin className="h-3 w-3" /> Live facility map
              </div>
              {selected.name || selected.address ? (
                <HospitalMap
                  mode="place"
                  query={selected.lat != null && selected.lng != null ? `${selected.lat},${selected.lng}` : `${selected.name} ${selected.address}`}
                  apiKey={cfg.mapsApiKey}
                  height={360}
                  title={selected.name || "Facility"}
                />
              ) : (
                <EmptyState title="Map preview" body="Enter a hospital name or address to render its map." />
              )}
            </Card>
          </div>
        ) : (
          <Card>
            <EmptyState title="No hospital selected" body="Add or select a hospital to edit its details and preview its map." />
          </Card>
        )}
      </div>
    </div>
  );
}
