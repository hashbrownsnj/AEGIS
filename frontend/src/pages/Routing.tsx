import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Crosshair, Loader2, Navigation, Settings as SettingsIcon } from "lucide-react";
import { SectionHeader, Card, Badge, EmptyState } from "@/components/ui/Primitives";
import { HospitalMap } from "@/components/ui/HospitalMap";
import {
  loadFacility,
  rankHospitals,
  CAPABILITY_LABELS,
  SEVERITY_CAPABILITY,
  type FacilityConfig,
} from "@/lib/facilityConfig";
import { cn, priorityTone } from "@/lib/utils";

const SEVERITIES = ["critical", "emergent", "urgent", "semi_urgent", "non_urgent"] as const;

type Coords = { lat: number; lng: number };

export default function Routing() {
  const [facility] = useState<FacilityConfig>(() => loadFacility());
  const [severity, setSeverity] = useState<string>("emergent");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeoError("This browser can't share location.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setGeoError(err.code === err.PERMISSION_DENIED ? "Location permission denied." : "Couldn't get location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  }

  // Offer location on first mount (non-blocking; user can decline).
  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ranked = useMemo(
    () => rankHospitals(facility.hospitals, severity, coords ?? undefined),
    [facility.hospitals, severity, coords]
  );
  const best = ranked[0];
  const wantCap = SEVERITY_CAPABILITY[severity];

  const originStr = coords ? `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}` : null;
  const destStr = best ? (best.lat != null && best.lng != null ? `${best.lat},${best.lng}` : `${best.name} ${best.address}`) : null;

  return (
    <div className="grid gap-5">
      <SectionHeader
        title="Transport Routing"
        subtitle="Choose a destination by acuity and live location. Decision support for transport only — it does not dispatch, diagnose, or replace medical direction."
        action={
          <button className="btn btn-secondary flex items-center gap-2" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            {coords ? "Re-locate" : "Use my location"}
          </button>
        }
      />

      {facility.hospitals.length === 0 ? (
        <Card>
          <EmptyState
            title="No facilities configured"
            body="Add your hospital network in Facility Setup so routing has destinations to rank."
          />
          <div className="mt-3 flex justify-center">
            <Link to="/facility" className="btn btn-primary flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" /> Configure facilities
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          {/* Controls + ranked list */}
          <div className="grid content-start gap-4">
            <Card>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
                Patient acuity
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={cn("pill transition-colors", severity === s ? priorityTone(s) : "border-slate-700 text-slate-500 hover:text-slate-300")}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] text-slate-500">
                {wantCap
                  ? <>Prioritizing facilities with a <span className="text-slate-300">{CAPABILITY_LABELS[wantCap].toLowerCase()}</span> capability, then proximity.</>
                  : "Prioritizing the nearest facility."}
              </p>
              {geoError && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-[11px] text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {geoError} Ranking by capability and beds instead.
                </div>
              )}
            </Card>

            <div className="grid gap-2">
              {ranked.map((h, i) => (
                <Card key={h.id} className={cn("p-3.5", i === 0 && "border-sky-500/40 ring-1 ring-sky-500/20")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Navigation className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden />}
                        <span className="truncate font-semibold text-slate-100">{h.name}</span>
                        {i === 0 && <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-300">Recommended</Badge>}
                        {h.diversion && <Badge className="border-red-500/30 bg-red-500/10 text-red-300">On diversion</Badge>}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">{h.address}</div>
                    </div>
                    {h.distanceKm != null && (
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-base font-semibold tabular-nums text-slate-200">{h.distanceKm.toFixed(1)}</div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-slate-600">km</div>
                      </div>
                    )}
                  </div>
                  {h.capabilities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {h.capabilities.map((c) => (
                        <span
                          key={c}
                          className={cn(
                            "pill text-[10px]",
                            wantCap === c ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-slate-700/60 text-slate-500"
                          )}
                        >
                          {CAPABILITY_LABELS[c]}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Map */}
          <Card className="self-start p-3.5">
            {best && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
                    {originStr ? "Route to recommended" : "Recommended destination"}
                  </div>
                  <div className="mt-0.5 font-semibold text-slate-100">{best.name}</div>
                </div>
                {coords && (
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Location locked</Badge>
                )}
              </div>
            )}
            {best && originStr && destStr ? (
              <HospitalMap mode="directions" origin={originStr} destination={destStr} apiKey={facility.mapsApiKey} height={460} title={`Route to ${best.name}`} />
            ) : best ? (
              <HospitalMap mode="place" query={`${best.name} ${best.address}`} apiKey={facility.mapsApiKey} height={460} title={best.name} />
            ) : null}
            {!facility.mapsApiKey && (
              <p className="mt-2 text-[10px] text-slate-600">
                Inline map uses the keyless embed. Add a Google Maps Embed API key in Facility Setup for turn-by-turn directions inline.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
