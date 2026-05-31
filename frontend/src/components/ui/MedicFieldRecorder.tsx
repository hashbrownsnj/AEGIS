import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface MedicFieldRecorderProps {
  value: string;
  onChange: (text: string) => void;
  onTranscriptUpdate?: (text: string) => void;
  onRecordingStop?: (text: string) => void;
  onRecordingStart?: () => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  liveExtracting?: boolean;
  aiEnabled?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MedicFieldRecorder({
  value,
  onChange,
  onTranscriptUpdate,
  onRecordingStop,
  onRecordingStart,
  placeholder = "Your words will appear here as you speak…",
  className,
  rows = 4,
  liveExtracting = false,
  aiEnabled = true,
}: MedicFieldRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const recordingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef(value);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    finalRef.current = value;
  }, [value]);

  const stopVolumeMeter = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    setVolume(0);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startVolumeMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const tick = () => {
        if (!analyserRef.current) return;
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        setVolume(Math.min(100, (buf.reduce((a, b) => a + b, 0) / buf.length) * 2.5));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // mic denied
    }
  }, []);

  const SR =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const supported = !!SR;

  const startRecognition = useCallback(() => {
    if (!SR) {
      setError("Speech recognition requires Chrome or Edge.");
      return;
    }
    setError("");
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        event.results[i].isFinal ? (finalChunk += t + " ") : (interimChunk += t);
      }
      if (finalChunk) {
        const base = finalRef.current ? finalRef.current.trimEnd() + " " : "";
        finalRef.current = base + finalChunk.trim();
        onChange(finalRef.current);
        onTranscriptUpdate?.(finalRef.current);
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(`Mic error: ${e.error}`);
    };

    recognition.onend = () => {
      if (recordingRef.current) {
        try {
          recognition.start();
        } catch {
          setTimeout(() => {
            if (recordingRef.current) try { recognition.start(); } catch { /* ignore */ }
          }, 300);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SR, onChange, onTranscriptUpdate]);

  const startRecording = useCallback(() => {
    if (!supported) {
      setError("Speech recognition requires Chrome or Edge.");
      return;
    }
    recordingRef.current = true;
    setRecording(true);
    setElapsed(0);
    onRecordingStart?.();
    startVolumeMeter();
    startRecognition();
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [supported, onRecordingStart, startVolumeMeter, startRecognition, stopTimer]);

  const stopRecording = useCallback(() => {
    recordingRef.current = false;
    setRecording(false);
    setInterim("");
    recognitionRef.current?.stop();
    stopVolumeMeter();
    stopTimer();
    const text = finalRef.current.trim();
    if (text) onRecordingStop?.(text);
  }, [onRecordingStop, stopVolumeMeter, stopTimer]);

  useEffect(() => () => {
    recordingRef.current = false;
    recognitionRef.current?.stop();
    stopVolumeMeter();
    stopTimer();
  }, [stopVolumeMeter, stopTimer]);

  const displayValue = recording && interim ? (value ? value.trimEnd() + " " : "") + interim : value;
  const bars = 14;

  return (
    <div className={cn("grid gap-3", className)}>
      <div
        className={cn(
          "rounded-xl border p-4 transition-all",
          recording ? "border-red-500/40 bg-red-500/8" : "border-slate-800 bg-slate-900/40"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-200">
              {recording ? "Recording — talk naturally" : "Hands-free field capture"}
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              {recording
                ? aiEnabled
                  ? "Describe the patient, vitals, ETA, unit — AI fills the form while you work."
                  : "Speech is being transcribed. Set ANTHROPIC_API_KEY for AI field extraction."
                : 'Hit Record and work normally. Say things like "Medic 4, eight minutes out, 72 male chest pain, pressure 88 over 50."'}
            </p>
          </div>
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={!supported}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
              recording
                ? "bg-red-500 text-white shadow-lg shadow-red-900/30 hover:bg-red-600"
                : "bg-sky-600 text-white shadow-lg shadow-sky-900/30 hover:bg-sky-500",
              !supported && "cursor-not-allowed opacity-40"
            )}
          >
            {recording ? (
              <>
                <Square className="h-4 w-4 fill-current" />
                Stop
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 fill-current" />
                Record
              </>
            )}
          </button>
        </div>

        {recording && (
          <div className="mt-3 flex items-end gap-[3px] rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
            <span className="relative mr-2 flex h-2.5 w-2.5 shrink-0 self-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="mr-3 self-center font-mono text-xs font-bold tabular-nums text-red-400">
              {formatDuration(elapsed)}
            </span>
            {liveExtracting && aiEnabled ? (
              <span className="mr-auto self-center text-[10px] font-bold uppercase tracking-widest text-sky-400">
                Extracting fields…
              </span>
            ) : (
              <span className="mr-auto self-center text-[10px] font-bold uppercase tracking-widest text-red-400">
                Listening
              </span>
            )}
            {Array.from({ length: bars }).map((_, i) => (
              <div
                key={i}
                className={cn("w-1 rounded-sm transition-all duration-75", volume >= ((i + 1) / bars) * 100 ? "bg-red-400" : "bg-slate-700")}
                style={{ height: `${45 + (i / bars) * 55}%` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
          <Mic className="h-3 w-3" />
          Live transcript
        </div>
        <textarea
          className={cn(
            "input w-full resize-none font-mono text-sm leading-relaxed",
            recording && "border-red-500/30 ring-1 ring-red-500/15"
          )}
          rows={rows}
          value={displayValue}
          onChange={(e) => !recording && onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={recording}
        />
      </div>

      {interim && (
        <p className="text-xs italic text-slate-500">
          Hearing: <span className="text-sky-400">{interim}</span>
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!supported && (
        <p className="text-xs text-slate-600">Recording requires Chrome or Edge. Type into the form manually instead.</p>
      )}
    </div>
  );
}
