import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface RadioDictationProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function RadioDictation({
  value,
  onChange,
  placeholder = "Paramedic report will appear here as you speak…",
  className,
  rows = 5
}: RadioDictationProps) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0);
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef(value);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  // keep finalRef in sync with prop
  useEffect(() => { finalRef.current = value; }, [value]);

  const stopVolumeMeter = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    setVolume(0);
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
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setVolume(Math.min(100, avg * 2.5));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // microphone denied — volume meter won't show, dictation still works
    }
  }, []);

  const SR = typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;
  const supported = !!SR;

  const startListening = useCallback(() => {
    if (!SR) {
      setError("Speech recognition requires Chrome or Edge.");
      return;
    }
    setError("");
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);

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
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") setError(`Mic error: ${e.error}`);
      setListening(false);
      setInterim("");
      stopVolumeMeter();
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
      stopVolumeMeter();
    };

    recognitionRef.current = recognition;
    recognition.start();
    startVolumeMeter();
  }, [SR, onChange, startVolumeMeter, stopVolumeMeter]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
    stopVolumeMeter();
  }, [stopVolumeMeter]);

  const displayValue = listening && interim
    ? (value ? value.trimEnd() + " " : "") + interim
    : value;

  const bars = 12;

  return (
    <div className={cn("grid gap-2", className)}>
      {/* Radio channel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          <Radio className="h-3.5 w-3.5" />
          EMS Radio Channel
        </div>
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={!supported}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all duration-200",
            listening
              ? "border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              : "border-sky-500/30 bg-sky-500/8 text-sky-400 hover:border-sky-500/60 hover:bg-sky-500/15",
            !supported && "cursor-not-allowed opacity-40"
          )}
          title={supported ? (listening ? "Stop" : "Open radio channel") : "Requires Chrome/Edge"}
        >
          {listening ? (
            <>
              <MicOff className="h-3.5 w-3.5" />
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" />
              Listen Live
            </>
          )}
        </button>
      </div>

      {/* Volume visualizer */}
      {listening && (
        <div className="flex items-end gap-[3px] h-7 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1">
          <span className="relative mr-2 flex h-2 w-2 shrink-0 self-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="mr-auto self-center text-[10px] font-bold uppercase tracking-widest text-red-400">
            LIVE
          </span>
          {Array.from({ length: bars }).map((_, i) => {
            const threshold = ((i + 1) / bars) * 100;
            const active = volume >= threshold;
            return (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-sm transition-all duration-75",
                  active ? "bg-red-400" : "bg-slate-700"
                )}
                style={{ height: `${50 + (i / bars) * 50}%` }}
              />
            );
          })}
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          className={cn(
            "input w-full resize-none font-mono text-sm leading-relaxed",
            listening && "border-red-500/30 ring-1 ring-red-500/20"
          )}
          rows={rows}
          value={displayValue}
          onChange={(e) => !listening && onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={listening}
        />
        {listening && (
          <div className="pointer-events-none absolute inset-0 rounded-xl border border-red-500/20" />
        )}
      </div>

      {interim && (
        <p className="text-xs italic text-slate-500">
          Hearing: <span className="text-sky-400">{interim}</span>
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!supported && (
        <p className="text-xs text-slate-600">
          Dictation requires Chrome or Edge. Type manually or upgrade your browser.
        </p>
      )}
    </div>
  );
}
