import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { AegisMark } from "@/components/ui/AegisMark";
import { ArrowRight, Lock, Eye, EyeOff, Activity, Navigation, ShieldCheck } from "lucide-react";
import { revealContainer, revealItem } from "@/lib/motion";

const asidePoints = [
  { icon: Activity, title: "ACUITY triage", body: "Severity scored with a transparent reasoning log." },
  { icon: Navigation, title: "Routed by acuity", body: "The right facility and the nearest bed, on a live map." },
  { icon: ShieldCheck, title: "Audited end-to-end", body: "Every action encrypted, logged, and HIPAA-aligned." },
];

const acuity = [
  { c: "var(--critical)", w: "92%", label: "Critical" },
  { c: "var(--emergent)", w: "74%", label: "Emergent" },
  { c: "var(--urgent)", w: "58%", label: "Urgent" },
  { c: "var(--semi-urgent)", w: "40%", label: "Stable" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Mouse-reactive spotlight: feed cursor position into CSS variables.
  function onMove(e: React.MouseEvent) {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={rootRef} className="login-root login-root--split" onMouseMove={onMove}>
      {/* ── Ambient layers ── */}
      <div aria-hidden className="login-bg-layer" />
      <div aria-hidden className="login-aurora" />
      <div aria-hidden className="login-spotlight" />
      <div aria-hidden className="login-bg-orb login-bg-orb-1" />
      <div aria-hidden className="login-bg-orb login-bg-orb-2" />

      {/* ── Back link ── */}
      <Link to="/" className="login-back-link" aria-label="Back to Aegis home">
        <AegisMark className="h-6 w-auto" />
        <span className="font-display text-sm font-semibold text-white/80">Aegis</span>
      </Link>

      <div className="login-split">
        {/* ── Value panel (desktop) ── */}
        <motion.aside
          className="login-aside"
          variants={revealContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div className="login-aside-kicker" variants={revealItem}>
            <span className="hero-kicker-line" />
            Emergency Department Command
          </motion.div>
          <motion.h2 className="login-aside-title" variants={revealItem}>
            Command the chaos.
          </motion.h2>
          <motion.p className="login-aside-sub" variants={revealItem}>
            One operating picture for triage, live patient flow, transport routing, and medication
            safety — calm enough to trust at&nbsp;3&nbsp;a.m.
          </motion.p>

          <motion.ul className="login-aside-points" variants={revealContainer}>
            {asidePoints.map((p) => (
              <motion.li key={p.title} className="login-aside-point" variants={revealItem}>
                <span className="login-aside-icon" aria-hidden>
                  <p.icon className="h-4 w-4 text-amber-400" />
                </span>
                <div>
                  <div className="login-aside-point-title">{p.title}</div>
                  <div className="login-aside-point-body">{p.body}</div>
                </div>
              </motion.li>
            ))}
          </motion.ul>

          {/* tiny animated acuity legend for flair */}
          <motion.div className="login-acuity" variants={revealItem} aria-hidden>
            <div className="login-acuity-head">
              <span className="login-acuity-live" /> Live triage board
            </div>
            {acuity.map((a, i) => (
              <div key={a.label} className="login-acuity-row">
                <span className="login-acuity-label">{a.label}</span>
                <span className="login-acuity-track">
                  <span
                    className="login-acuity-fill"
                    style={{
                      width: a.w,
                      background: `hsl(${a.c})`,
                      animationDelay: `${i * 140}ms`,
                    }}
                  />
                </span>
              </div>
            ))}
          </motion.div>
        </motion.aside>

        {/* ── Sign-in card ── */}
        <motion.main
          className="login-container"
          role="main"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1], delay: 0.1 }}
        >
          <div className="login-brand" aria-hidden>
            <div className="login-mark-glow" />
            <AegisMark className="h-[72px] w-auto relative z-10" animate />
          </div>

          <div className="login-title-group">
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to access the Aegis console</p>
          </div>

          <div className="login-card" role="region" aria-label="Sign in form">
            <div className="login-card-sheen" aria-hidden />
            <div className="login-card-inner">
              <div className="login-form-header">
                <Lock className="h-4 w-4 text-amber-400/70" aria-hidden />
                <span>Secure sign in</span>
              </div>

              <form onSubmit={handleSubmit} noValidate aria-label="Login form">
                <div className="login-fields">
                  <div className="login-field-group">
                    <label htmlFor="login-email" className="login-label">Email address</label>
                    <input
                      id="login-email"
                      className="login-input"
                      type="email"
                      autoComplete="email"
                      placeholder="you@hospital.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      aria-required="true"
                      aria-describedby={error ? "login-error" : undefined}
                    />
                  </div>

                  <div className="login-field-group">
                    <label htmlFor="login-password" className="login-label">Password</label>
                    <div className="login-input-wrap">
                      <input
                        id="login-password"
                        className="login-input login-input-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        aria-required="true"
                      />
                      <button
                        type="button"
                        className="login-eye-btn"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        tabIndex={0}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div id="login-error" role="alert" aria-live="assertive" className="login-error">
                    <span className="login-error-dot" aria-hidden />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="login-submit-btn group" disabled={loading} aria-busy={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="login-spinner" aria-hidden />
                      Signing in…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign in
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>

          <p className="login-disclaimer" aria-label="Safety disclaimer">
            Decision support · does not diagnose, prescribe, or replace clinician judgment
          </p>
        </motion.main>
      </div>
    </div>
  );
}
