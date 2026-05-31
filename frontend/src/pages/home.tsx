import { Link } from "react-router-dom";
import { Activity, ArrowRight, Navigation, Pill, Radio, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AegisMark } from "@/components/ui/AegisMark";

const capabilities = [
  {
    icon: Activity,
    kicker: "Triage",
    title: "Acuity, reasoned",
    body: "Every arrival is scored with a transparent clinical reasoning log and a deterministic safety guardrail — never a black box.",
  },
  {
    icon: Radio,
    kicker: "Pre-arrival",
    title: "The call, transcribed",
    body: "EMS dictation becomes structured fields in real time, so the receiving team reads a clean narrative instead of static.",
  },
  {
    icon: Navigation,
    kicker: "Transport",
    title: "Routed by acuity",
    body: "Match a patient's severity to the right facility and the nearest location, with the route on a live map.",
  },
  {
    icon: Pill,
    kicker: "Medication",
    title: "Reconciled, sourced",
    body: "Interaction checks ranked by severity and sourced to NIH RxNav — informational, never a substitute for the pharmacist.",
  },
];

export default function Home() {
  const { user } = useAuth();
  const enterTo = user ? "/dashboard" : "/login";
  const enterLabel = user ? "Enter console" : "Sign in";

  return (
    <div className="app-atmosphere min-h-screen text-slate-200">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <AegisMark className="h-7 w-auto" />
          <span className="font-display text-xl font-semibold tracking-tight text-slate-100">Aegis</span>
        </Link>
        <Link
          to={enterTo}
          className="group inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-1.5 text-[13px] font-medium text-slate-300 transition-colors hover:border-sky-500/50 hover:text-white"
        >
          {enterLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.34em] text-sky-400/80">
            <span className="h-px w-8 bg-sky-500/50" />
            Emergency Department Command
          </div>
          <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.02em] text-white">
            The calm at the
            <span className="block italic text-sky-300">center of the storm.</span>
          </h1>
          <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-slate-400">
            Aegis is the operating picture for an emergency department — triage, live patient flow,
            pre-arrival, transport routing, and medication safety in one quiet, legible console built
            to be trusted at 3 a.m.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to={enterTo} className="btn btn-primary group flex items-center gap-2 px-5">
              {enterLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[.18em] text-slate-600">
              Decision support · does not diagnose
            </span>
          </div>
        </div>

        {/* Oversized mark, set off to the right as an editorial element */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 top-10 hidden w-[42%] opacity-[0.12] lg:block"
        >
          <AegisMark className="w-full" />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <div className="hairline" />
      </div>

      {/* Capabilities */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-x-12 gap-y-12 md:grid-cols-2">
          {capabilities.map((c, i) => (
            <article
              key={c.title}
              className="animate-fade-in-up flex gap-5"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-900/60">
                <c.icon className="h-4.5 w-4.5 text-sky-400" aria-hidden />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[.24em] text-slate-500">{c.kicker}</div>
                <h3 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-slate-100">{c.title}</h3>
                <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-slate-400">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Closing band */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/30 px-8 py-14 text-center sm:px-16">
          <ShieldCheck className="mx-auto h-7 w-7 text-sky-400/80" aria-hidden />
          <h2 className="mx-auto mt-5 max-w-2xl font-display text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-tight tracking-tight text-white">
            One picture. Every clinician on the same page.
          </h2>
          <div className="mt-8">
            <Link to={enterTo} className="btn btn-primary group inline-flex items-center gap-2 px-6">
              {enterLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <AegisMark className="h-5 w-auto" />
            <span className="font-display text-sm font-semibold text-slate-300">Aegis</span>
          </div>
          <p className="text-center font-mono text-[10px] uppercase tracking-[.18em] text-slate-600">
            Clinical decision support · does not diagnose, prescribe, or replace clinician judgment
          </p>
        </div>
      </footer>
    </div>
  );
}
