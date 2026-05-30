import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card rounded-2xl p-5", className)} {...props} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.07em]",
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[.1em] text-slate-500">
      <span>{label}</span>
      {children}
      {hint && <span className="text-[11px] font-normal normal-case tracking-normal text-slate-600">{hint}</span>}
    </label>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/20 p-8 text-center">
      <h3 className="text-sm font-bold text-slate-400">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

export function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <EmptyState title={title} body={body} />
    </Card>
  );
}

export function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20" role="status">
      <svg
        className="h-7 w-7 animate-spin text-sky-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-xs font-medium text-slate-500">Loading…</span>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  trend,
  accent = "sky",
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "flat";
  accent?: "red" | "orange" | "sky" | "green" | "slate";
}) {
  const TrendIcon =
    trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : ArrowRight;
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-slate-500";

  return (
    <Card className={cn("stat-accent-" + accent)}>
      <div className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-500">{label}</div>
      <div className="mt-3 flex items-end gap-2">
        <div className="text-[2rem] font-black leading-none tracking-tight text-slate-100 tabular-nums">
          {value}
        </div>
        {trend && <TrendIcon className={cn("mb-0.5 h-4 w-4 shrink-0", trendColor)} />}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-slate-500">{sub}</div>}
    </Card>
  );
}

export function StatusDot({ status }: { status: "live" | "warn" | "off" }) {
  const colors = {
    live: "bg-emerald-400",
    warn: "bg-amber-400",
    off: "bg-slate-500",
  };

  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {status === "live" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            colors.live
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", colors[status])} />
    </span>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-100">{title}</h1>
        {subtitle && (
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-slate-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
