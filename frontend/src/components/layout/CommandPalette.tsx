import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type Command = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
};

export function CommandPalette({ commands }: { commands: Command[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd/Ctrl-K to toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const onOpen = () => setOpen(true);
    window.addEventListener("aegis:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("aegis:open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.to.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    setActive((a) => Math.max(0, Math.min(a, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = results[active];
      if (c) go(c.to);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[18vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-700 bg-slate-950/95 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-3.5">
          <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to…"
            className="w-full bg-transparent py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
            aria-label="Search destinations"
          />
          <kbd className="shrink-0 rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">ESC</kbd>
        </div>
        <ul className="max-h-72 overflow-auto p-1.5">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center font-mono text-[11px] uppercase tracking-[.16em] text-slate-600">
              No matches
            </li>
          ) : (
            results.map((c, i) => (
              <li key={c.to}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(c.to)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                    active === i ? "bg-sky-500/10 text-sky-200" : "text-slate-300 hover:bg-white/[.04]"
                  )}
                >
                  <c.icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="flex-1">{c.label}</span>
                  {c.hint && <span className="font-mono text-[10px] text-slate-600">{c.hint}</span>}
                  {active === i && <CornerDownLeft className="h-3.5 w-3.5 text-sky-400/70" aria-hidden />}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
