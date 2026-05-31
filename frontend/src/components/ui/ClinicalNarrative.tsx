import { FileText } from "lucide-react";

/**
 * ClinicalNarrative — presentation-only readable formatting for free-text
 * EMS/clinical report strings. Does NOT alter the underlying text or data;
 * it only improves legibility: comfortable measure, generous leading, and
 * subtle emphasis on clinically salient tokens (vitals, units, meds).
 */

// Tokens worth visually anchoring in a wall of narrative text.
const VITAL_PATTERN =
  /(\b\d{2,3}\/\d{2,3}\b|\b\d{2,3}\s?(?:bpm|mmHg|%|°[CF]|mg|mcg|mL|L\/min)\b|\bSpO2\b|\bSpO₂\b|\bGCS\s?\d{1,2}\b|\bBP\b|\bHR\b|\bRR\b|\bO2\b|\b\d{1,2}\/10\b)/gi;

function highlight(line: string, keyBase: string) {
  const parts = line.split(VITAL_PATTERN);
  return parts.map((part, i) =>
    VITAL_PATTERN.test(part) ? (
      <mark
        key={`${keyBase}-${i}`}
        className="rounded bg-sky-500/10 px-1 font-mono text-[0.92em] tabular-nums text-sky-200"
      >
        {part}
      </mark>
    ) : (
      <span key={`${keyBase}-${i}`}>{part}</span>
    )
  );
}

export function ClinicalNarrative({
  text,
  label = "EMS Narrative",
  className,
}: {
  text?: string | null;
  label?: string;
  className?: string;
}) {
  const clean = (text ?? "").trim();
  if (!clean) return null;

  // Split into readable sentences/lines without mutating wording.
  const lines = clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])|\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <figure className={className}>
      <figcaption className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[.2em] text-slate-500">
        <FileText className="h-3 w-3" aria-hidden />
        {label}
      </figcaption>
      <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-3.5">
        <div className="max-w-[62ch] space-y-1.5 text-[13.5px] leading-[1.7] text-slate-200">
          {lines.map((line, i) => (
            <p key={i} className="text-pretty">
              {highlight(line, `l${i}`)}
            </p>
          ))}
        </div>
      </div>
    </figure>
  );
}
