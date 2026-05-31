import type { ExtractedReportFields } from "@aegis/shared";

export type AmbulanceFormFields = {
  unitId: string;
  etaMinutes: string;
  patientDescriptor: string;
  age: string;
  sex: string;
  structuredSymptoms: string;
  reportText: string;
  heartRate: string;
  systolicBp: string;
  diastolicBp: string;
  oxygenSaturation: string;
  painScore: string;
};

/** Merge Claude-extracted fields into the ambulance form; returns touched field keys for UI highlights. */
export function applyExtractedToAmbulanceForm(
  prev: AmbulanceFormFields,
  extracted: ExtractedReportFields
): { form: AmbulanceFormFields; touched: string[] } {
  const touched: string[] = [];
  const next = { ...prev };

  if (extracted.unitId && !prev.unitId) {
    next.unitId = extracted.unitId;
    touched.push("unitId");
  }
  if (extracted.etaMinutes != null && !prev.etaMinutes) {
    next.etaMinutes = String(extracted.etaMinutes);
    touched.push("etaMinutes");
  }

  const descriptor =
    extracted.patientDescriptor ??
    (extracted.chiefComplaint && extracted.age
      ? `${extracted.age}yo ${extracted.sex === "female" ? "female" : extracted.sex === "male" ? "male" : "patient"}, ${extracted.chiefComplaint}`
      : extracted.chiefComplaint);

  if (descriptor && !prev.patientDescriptor) {
    next.patientDescriptor = descriptor;
    touched.push("patientDescriptor");
  }

  if (extracted.age != null && !prev.age) {
    next.age = String(extracted.age);
    touched.push("age");
  }
  if (extracted.sex && extracted.sex !== "unknown" && prev.sex === "unknown") {
    next.sex = extracted.sex;
    touched.push("sex");
  }
  if (extracted.symptoms?.length) {
    const merged = [...new Set([...prev.structuredSymptoms.split(",").map((s) => s.trim()).filter(Boolean), ...extracted.symptoms])];
    if (merged.join(", ") !== prev.structuredSymptoms) {
      next.structuredSymptoms = merged.join(", ");
      touched.push("structuredSymptoms");
    }
  }

  const v = extracted.vitalSigns ?? {};
  const vitalMap: Array<[keyof AmbulanceFormFields, number | undefined]> = [
    ["heartRate", v.heartRate],
    ["systolicBp", v.systolicBp],
    ["diastolicBp", v.diastolicBp],
    ["oxygenSaturation", v.oxygenSaturation],
    ["painScore", v.painScore],
  ];
  for (const [key, val] of vitalMap) {
    if (val != null && !prev[key]) {
      next[key] = String(val);
      touched.push(key);
    }
  }

  return { form: next, touched };
}

export function buildPatientDescriptor(extracted: ExtractedReportFields): string | undefined {
  if (extracted.patientDescriptor) return extracted.patientDescriptor;
  const parts: string[] = [];
  if (extracted.age) parts.push(`${extracted.age}yo`);
  if (extracted.sex && extracted.sex !== "unknown") parts.push(extracted.sex);
  if (extracted.chiefComplaint) parts.push(extracted.chiefComplaint);
  return parts.length ? parts.join(" ") : undefined;
}
