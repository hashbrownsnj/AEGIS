import { useCallback, useRef } from "react";
import { endpoints } from "@/lib/api";

const MIN_CHARS = 25;
const GROWTH_CHARS = 35;
const DEBOUNCE_MS = 2200;

/** Debounced Claude extraction while medic is still talking — fills form fields live. */
export function useLiveFieldExtraction(
  onExtracted: (extracted: any, thoughts: string[]) => void,
  enabled: boolean
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLenRef = useRef(0);
  const inflightRef = useRef(false);
  const lastTextRef = useRef("");

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const schedule = useCallback(
    (text: string) => {
      if (!enabled) return;
      lastTextRef.current = text;
      const trimmed = text.trim();
      if (trimmed.length < MIN_CHARS) return;
      const growth = trimmed.length - lastLenRef.current;
      if (lastLenRef.current > 0 && growth < GROWTH_CHARS) return;

      cancel();
      timerRef.current = setTimeout(async () => {
        if (inflightRef.current) return;
        inflightRef.current = true;
        try {
          const result = await endpoints.extractReport(trimmed);
          if (result.extracted && lastTextRef.current.trim() === trimmed) {
            lastLenRef.current = trimmed.length;
            onExtracted(result.extracted, result.thoughts ?? []);
          }
        } catch {
          // best-effort during live capture
        } finally {
          inflightRef.current = false;
        }
      }, DEBOUNCE_MS);
    },
    [cancel, enabled, onExtracted]
  );

  const flush = useCallback(async (text: string) => {
    cancel();
    const trimmed = text.trim();
    if (!enabled || trimmed.length < MIN_CHARS) return;
    inflightRef.current = true;
    try {
      const result = await endpoints.extractReport(trimmed);
      if (result.extracted) {
        lastLenRef.current = trimmed.length;
        onExtracted(result.extracted, result.thoughts ?? []);
      }
    } finally {
      inflightRef.current = false;
    }
  }, [cancel, enabled, onExtracted]);

  const reset = useCallback(() => {
    cancel();
    lastLenRef.current = 0;
    lastTextRef.current = "";
  }, [cancel]);

  return { schedule, flush, reset, cancel };
}
