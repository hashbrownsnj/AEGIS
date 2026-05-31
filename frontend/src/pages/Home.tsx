import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Activity, ArrowRight, Navigation, Pill, Radio, ShieldCheck, Zap, Lock, Eye, Brain,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AegisMark } from "@/components/ui/AegisMark";
import { IntroLoader } from "@/components/ui/IntroLoader";
import { revealContainer, revealItem, fadeUp } from "@/lib/motion";

// Three.js is heavy — load it in its own chunk so first paint stays instant.
const Caduceus3D = lazy(() =>
  import("@/components/ui/Caduceus3D").then((m) => ({ default: m.Caduceus3D }))
);

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

const flow = [
  { n: "01", icon: Radio, label: "Pre-arrival", note: "EMS call captured & structured" },
  { n: "02", icon: Brain, label: "ACUITY triage", note: "Severity scored with reasoning" },
  { n: "03", icon: Navigation, label: "Routing", note: "Right facility, nearest bed" },
  { n: "04", icon: Activity, label: "Live flow", note: "One picture, every clinician" },
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

  // Play the boot intro once per session.
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    const seen = sessionStorage.getItem("aegis-intro-seen");
    if (!seen) setShowIntro(true);
  }, []);
  function finishIntro() {
    sessionStorage.setItem("aegis-intro-seen", "1");
    setShowIntro(false);
  }

  // Hero parallax for the 3D object.
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 0.82]);
  const orbOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="home-root min-h-screen text-slate-100 overflow-x-hidden">
      {showIntro && <IntroLoader onDone={finishIntro} />}

      {/* ── Ambient background layers ── */}
      <div aria-hidden className="home-bg-layer" />
      <div aria-hidden className="home-aurora" />

      {/* ── Floating nav bar ── */}
      <motion.header
        className="home-nav"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: showIntro ? 0.2 : 0, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <nav className="home-nav-inner" role="navigation" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Aegis home">
            <AegisMark className="h-7 w-auto" />
            <span className="font-display text-xl font-semibold tracking-tight text-white">Aegis</span>
          </Link>

          <div className="hidden md:flex items-center gap-1 text-[13px]">
            <a href="#how" className="home-nav-link">How it works</a>
            <span className="text-white/20 mx-1">|</span>
            <a href="#capabilities" className="home-nav-link">Capabilities</a>
            <span className="text-white/20 mx-1">|</span>
            <a href="#trust" className="home-nav-link">Security</a>
          </div>

          <Link to={enterTo} className="home-nav-cta group inline-flex items-center gap-2" aria-label={enterLabel}>
            {enterLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </nav>
      </motion.header>

      {/* ── Hero ── */}
      <section ref={heroRef} className="home-hero" aria-labelledby="hero-heading">
        {/* 3D caduceus centerpiece */}
        <motion.div
          aria-hidden
          className="hero-orb-container"
          style={{ y: orbY, scale: orbScale, opacity: orbOpacity }}
        >
          <Suspense fallback={<div className="hero-canvas hero-canvas-fallback" />}>
            <Caduceus3D className="hero-canvas" />
          </Suspense>
        </motion.div>

        <motion.div
          className="hero-content"
          variants={revealContainer}
          initial="hidden"
          animate="show"
          transition={{ delayChildren: showIntro ? 0.35 : 0.1 }}
        >
          <motion.div className="hero-kicker" variants={revealItem} aria-hidden>
            <span className="hero-kicker-line" />
            Emergency Department Command
          </motion.div>
          <motion.h1 id="hero-heading" className="hero-heading" variants={revealItem}>
            The calm at the
            <span className="hero-heading-accent block"> center of the storm.</span>
          </motion.h1>
          <motion.p className="hero-body" variants={revealItem}>
            Aegis is the single operating picture for an emergency department — triage, live patient
            flow, pre-arrival capture, transport routing, and medication safety in one quiet,
            legible console built to be trusted at 3&nbsp;a.m.
          </motion.p>

          <motion.div className="hero-actions" variants={revealItem}>
            <Link to={enterTo} className="btn-hero-primary group inline-flex items-center gap-2.5">
              {enterLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
            </Link>
            <a href="#how" className="btn-hero-ghost group inline-flex items-center gap-2">
              See how it works
            </a>
          </motion.div>
          <motion.span className="hero-disclaimer block mt-5" variants={revealItem} aria-label="Decision support disclaimer">
            Decision support · does not diagnose
          </motion.span>
        </motion.div>

        <div className="hero-scroll-hint" aria-hidden>
          <span className="hero-scroll-dot" />
        </div>
      </section>

      {/* ── Hairline divider ── */}
      <div className="section-divider" aria-hidden />

      {/* ── Trust strip ── */}
      <motion.section
        id="trust"
        className="trust-strip"
        aria-label="Trust and security indicators"
        variants={revealContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
      >
        {trustItems.map((item) => (
          <motion.div key={item.label} className="trust-item" variants={revealItem}>
            <item.icon className="h-3.5 w-3.5 text-amber-400/80" aria-hidden />
            <span>{item.label}</span>
          </motion.div>
        ))}
      </motion.section>

      {/* ── How it works (the product explained) ── */}
      <section id="how" className="how-section" aria-labelledby="how-heading">
        <motion.div
          className="section-label"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          aria-hidden
        >
          <span className="section-label-line" />
          From the call to the bed
        </motion.div>
        <motion.h2
          id="how-heading"
          className="section-heading"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
        >
          A patient's whole journey, on one screen.
        </motion.h2>

        <motion.ol
          className="flow-grid"
          variants={revealContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          {flow.map((f, i) => (
            <motion.li key={f.label} className="flow-step" variants={revealItem}>
              <div className="flow-step-top">
                <span className="flow-num">{f.n}</span>
                <f.icon className="h-4 w-4 text-amber-400/80" aria-hidden />
              </div>
              <h3 className="flow-label">{f.label}</h3>
              <p className="flow-note">{f.note}</p>
              {i < flow.length - 1 && <span className="flow-connector" aria-hidden />}
            </motion.li>
          ))}
        </motion.ol>
      </section>

      {/* ── Section divider ── */}
      <div className="section-divider" aria-hidden />

      {/* ── Capabilities ── */}
      <section id="capabilities" className="capabilities-section" aria-labelledby="capabilities-heading">
        <motion.div
          className="section-label"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          aria-hidden
        >
          <span className="section-label-line" />
          Platform capabilities
        </motion.div>
        <motion.h2
          id="capabilities-heading"
          className="section-heading"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
        >
          One console. Every critical system.
        </motion.h2>

        <motion.div
          className="capabilities-grid"
          role="list"
          variants={revealContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {capabilities.map((c) => (
            <motion.article
              key={c.title}
              className="capability-card"
              role="listitem"
              variants={revealItem}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <div className="capability-icon-wrap" aria-hidden>
                <c.icon className="h-4.5 w-4.5 text-amber-400" />
              </div>
              <div>
                <div className="capability-kicker" aria-hidden>{c.kicker}</div>
                <h3 className="capability-title">{c.title}</h3>
                <p className="capability-body">{c.body}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* ── Section divider ── */}
      <div className="section-divider" aria-hidden />

      {/* ── CTA band ── */}
      <section id="cta" className="cta-section" aria-labelledby="cta-heading">
        <motion.div
          className="cta-card"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="cta-glow" aria-hidden />
          <ShieldCheck className="mx-auto h-8 w-8 text-amber-400/80 mb-5" aria-hidden />
          <h2 id="cta-heading" className="cta-heading">
            One picture.<br />Every clinician on the same page.
          </h2>
          <p className="cta-body">
            From triage to discharge, Aegis keeps the whole team oriented — no paper, no phone tag, no guessing.
          </p>
          <Link to={enterTo} className="btn-hero-primary group inline-flex items-center gap-2.5 mt-8">
            {enterLabel}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
          </Link>
        </motion.div>
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
