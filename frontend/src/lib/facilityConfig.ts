/**
 * Facility configuration — CLIENT-SIDE ONLY.
 *
 * This stores a hospital network in the browser's localStorage so the routing
 * and facility-map features have data to work with WITHOUT any backend change.
 * It is intentionally decoupled from the server: nothing here calls the API.
 *
 * SECURITY NOTE (honest): the "lock" below is a convenience gate for a shared
 * workstation, not real authentication. The salted SHA-256 hash lives in the
 * same browser as the data it guards, so a determined local user can bypass it.
 * Real access control is the app's existing role-based auth. Treat this as a
 * soft cover, not a security boundary — and never store PHI in it.
 */

export type HospitalCapability =
  | "trauma"
  | "stroke"
  | "cardiac"
  | "pediatric"
  | "obstetric"
  | "burn"
  | "psychiatric"
  | "general";

export const CAPABILITY_LABELS: Record<HospitalCapability, string> = {
  trauma: "Trauma center",
  stroke: "Stroke center",
  cardiac: "Cardiac / PCI",
  pediatric: "Pediatric ED",
  obstetric: "Obstetric",
  burn: "Burn unit",
  psychiatric: "Psychiatric",
  general: "General ED",
};

export type Hospital = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  capabilities: HospitalCapability[];
  edBeds?: number;
  diversion?: boolean;
  notes?: string;
};

export type FacilityConfig = {
  networkName: string;
  hospitals: Hospital[];
  /** Optional Google Maps Embed API key — upgrades inline maps to official directions. */
  mapsApiKey?: string;
  /** Soft lock (see SECURITY NOTE). */
  lock?: { salt: string; hash: string };
  updatedAt: string;
};

const KEY = "aegis.facility.v1";

export function loadFacility(): FacilityConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as FacilityConfig;
  } catch {
    /* corrupt or unavailable storage → fall through to default */
  }
  return { networkName: "", hospitals: [], updatedAt: new Date().toISOString() };
}

export function saveFacility(cfg: FacilityConfig): FacilityConfig {
  const next = { ...cfg, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage may be full/disabled; caller still gets the in-memory value */
  }
  return next;
}

export function newHospitalId(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Soft lock helpers (Web Crypto, no dependency) ──────────────────────────

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeLock(password: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(8)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
  const hash = await sha256(`${salt}:${password}`);
  return { salt, hash };
}

export async function verifyLock(lock: FacilityConfig["lock"], password: string): Promise<boolean> {
  if (!lock) return true; // no lock set yet
  return (await sha256(`${lock.salt}:${password}`)) === lock.hash;
}

// ── Geo helpers ────────────────────────────────────────────────────────────

/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Severity → the capability we'd most want at the receiving facility. */
export const SEVERITY_CAPABILITY: Record<string, HospitalCapability | null> = {
  critical: "trauma",
  emergent: "cardiac",
  urgent: "general",
  semi_urgent: "general",
  non_urgent: null,
};

/**
 * Rank hospitals for a transport decision. Capability match for the given
 * severity is weighted first, then proximity (if coordinates are known),
 * then beds. Diverting facilities sink to the bottom. Pure, no side effects.
 */
export function rankHospitals(
  hospitals: Hospital[],
  severity: string,
  origin?: { lat: number; lng: number }
): Array<Hospital & { distanceKm?: number; matches: boolean }> {
  const want = SEVERITY_CAPABILITY[severity] ?? null;
  return hospitals
    .map((h) => {
      const distanceKm =
        origin && h.lat != null && h.lng != null ? haversineKm(origin, { lat: h.lat, lng: h.lng }) : undefined;
      const matches = want ? h.capabilities.includes(want) : true;
      return { ...h, distanceKm, matches };
    })
    .sort((a, b) => {
      if (a.diversion !== b.diversion) return a.diversion ? 1 : -1;
      if (a.matches !== b.matches) return a.matches ? -1 : 1;
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return (b.edBeds ?? 0) - (a.edBeds ?? 0);
    });
}
