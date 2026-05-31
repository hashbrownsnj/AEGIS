import { Link } from "react-router-dom";
import { Activity, ArrowRight, Navigation, Pill, Radio, ShieldCheck, Zap, Lock, Eye } from "lucide-react";
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

const trustItems = [
  { icon: Lock, label: "Encrypted at rest" },
  { icon: Eye, label: "Full audit trail" },
  { icon: ShieldCheck, label: "HIPAA-aligned" },
  { icon: Zap, label: "Sub-100ms triage" },
];

export default function Home() {
  const { user } = useAuth();
  const enterTo = user ? "/dashboard" : "/login";
  const enterLabel = user ? "Enter console" : "Sign in";

  return (
    <div className="home-root min-h-screen text-slate-100 overflow-x-hidden">

      {/* ── Ambient background layers ── */}
      <div aria-hidden className="home-bg-layer" />

      {/* ── Floating nav bar ── */}
      <header className="home-nav">
        <nav className="home-nav-inner" role="navigation" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Aegis home">
            <AegisMark className="h-7 w-auto" />
            <span className="font-display text-xl font-semibold tracking-tight text-white">Aegis</span>
          </Link>

          <div className="hidden md:flex items-center gap-1 text-[13px]">
            <a href="#capabilities" className="home-nav-link">Capabilities</a>
            <span className="text-white/20 mx-1">|</span>
            <a href="#trust" className="home-nav-link">Security</a>
            <span className="text-white/20 mx-1">|</span>
            <a href="#cta" className="home-nav-link">About</a>
          </div>

          <Link
            to={enterTo}
            className="home-nav-cta group inline-flex items-center gap-2"
            aria-label={enterLabel}
          >
            {enterLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </nav>
      </header>

      {/* ── Hero section ── */}
      <section className="home-hero" aria-labelledby="hero-heading">
        {/* Hero 3D object — abstract revolving ring shape made in pure CSS/SVG */}
        <div aria-hidden className="hero-orb-container">
          <div className="hero-orb">
            <div className="hero-orb-ring hero-orb-ring-1" />
            <div className="hero-orb-ring hero-orb-ring-2" />
            <div className="hero-orb-ring hero-orb-ring-3" />
            <div className="hero-orb-glow" />
          </div>
        </div>

        <div className="hero-content animate-fade-in-up">
          <div className="hero-kicker" aria-hidden>
            <span className="hero-kicker-line" />
            Emergency Department Command
          </div>
          <h1 id="hero-heading" className="hero-heading">
            The calm at the
            <span className="hero-heading-accent block"> center of the storm.</span>
          </h1>
          <p className="hero-body">
            Aegis is the operating picture for an emergency department — triage, live patient flow,
            pre-arrival, transport routing, and medication safety in one quiet, legible console
            built to be trusted at 3&nbsp;a.m.
          </p>

          <div className="hero-actions">
            <Link
              to={enterTo}
              className="btn-hero-primary group inline-flex items-center gap-2.5"
            >
              {enterLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
            </Link>
            <span className="hero-disclaimer" aria-label="Decision support disclaimer">
              Decision support · does not diagnose
            </span>
          </div>
        </div>
      </section>

      {/* ── Hairline divider ── */}
      <div className="section-divider" aria-hidden />

      {/* ── Trust strip ── */}
      <section id="trust" className="trust-strip" aria-label="Trust and security indicators">
        {trustItems.map((item) => (
          <div key={item.label} className="trust-item">
            <item.icon className="h-3.5 w-3.5 text-amber-400/80" aria-hidden />
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      {/* ── Capabilities ── */}
      <section id="capabilities" className="capabilities-section" aria-labelledby="capabilities-heading">
        <div className="section-label" aria-hidden>
          <span className="section-label-line" />
          Platform capabilities
        </div>
        <h2 id="capabilities-heading" className="section-heading">
          One console. Every critical system.
        </h2>

        <div className="capabilities-grid" role="list">
          {capabilities.map((c, i) => (
            <article
              key={c.title}
              className="capability-card animate-fade-in-up"
              style={{ animationDelay: `${100 + i * 80}ms` }}
              role="listitem"
            >
              <div className="capability-icon-wrap" aria-hidden>
                <c.icon className="h-4.5 w-4.5 text-amber-400" />
              </div>
              <div>
                <div className="capability-kicker" aria-hidden>{c.kicker}</div>
                <h3 className="capability-title">{c.title}</h3>
                <p className="capability-body">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Section divider ── */}
      <div className="section-divider" aria-hidden />

      {/* ── CTA band ── */}
      <section id="cta" className="cta-section" aria-labelledby="cta-heading">
        <div className="cta-card">
          <div className="cta-glow" aria-hidden />
          <ShieldCheck className="mx-auto h-8 w-8 text-amber-400/80 mb-5" aria-hidden />
          <h2 id="cta-heading" className="cta-heading">
            One picture.<br />Every clinician on the same page.
          </h2>
          <p className="cta-body">
            From triage to discharge, Aegis keeps the whole team oriented — no paper, no phone tag, no guessing.
          </p>
          <Link
            to={enterTo}
            className="btn-hero-primary group inline-flex items-center gap-2.5 mt-8"
          >
            {enterLabel}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="home-footer" role="contentinfo">
        <div className="home-footer-inner">
          <div className="flex items-center gap-2.5">
            <AegisMark className="h-5 w-auto" />
            <span className="font-display text-sm font-semibold text-slate-300">Aegis</span>
          </div>
          <p className="footer-disclaimer">
            Clinical decision support · does not diagnose, prescribe, or replace clinician judgment
          </p>
          <p className="footer-copy text-slate-600 font-mono text-[10px]">
            © {new Date().getFullYear()} Aegis
          </p>
        </div>
      </footer>
    </div>
  );
}
