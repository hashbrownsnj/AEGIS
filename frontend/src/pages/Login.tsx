import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { AegisMark } from "@/components/ui/AegisMark";
import { ArrowRight, Lock, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="login-root">
      {/* ── Ambient glow layers ── */}
      <div aria-hidden className="login-bg-layer" />
      <div aria-hidden className="login-bg-orb login-bg-orb-1" />
      <div aria-hidden className="login-bg-orb login-bg-orb-2" />

      {/* ── Nav link back home ── */}
      <Link to="/" className="login-back-link" aria-label="Back to Aegis home">
        <AegisMark className="h-6 w-auto" />
        <span className="font-display text-sm font-semibold text-white/80">Aegis</span>
      </Link>

      {/* ── Login card ── */}
      <main className="login-container" role="main">
        {/* Brand mark */}
        <div className="login-brand" aria-hidden>
          <div className="login-mark-glow" />
          <AegisMark
            className="h-[72px] w-auto relative z-10"
            animate
          />
        </div>

        <div className="login-title-group">
          <h1 className="login-title">Emergency Department Command</h1>
          <p className="login-subtitle">Sign in to access the Aegis console</p>
        </div>

        {/* Glass card */}
        <div className="login-card" role="region" aria-label="Sign in form">
          <div className="login-card-inner">
            {/* Form header */}
            <div className="login-form-header">
              <Lock className="h-4 w-4 text-amber-400/70" aria-hidden />
              <span>Secure sign in</span>
            </div>

            <form onSubmit={handleSubmit} noValidate aria-label="Login form">
              <div className="login-fields">
                {/* Email */}
                <div className="login-field-group">
                  <label htmlFor="login-email" className="login-label">
                    Email address
                  </label>
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

                {/* Password */}
                <div className="login-field-group">
                  <label htmlFor="login-password" className="login-label">
                    Password
                  </label>
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
                      {showPassword
                        ? <EyeOff className="h-4 w-4" aria-hidden />
                        : <Eye className="h-4 w-4" aria-hidden />
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  id="login-error"
                  role="alert"
                  aria-live="assertive"
                  className="login-error"
                >
                  <span className="login-error-dot" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="login-submit-btn group"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="login-spinner" aria-hidden />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign in
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="login-disclaimer" aria-label="Safety disclaimer">
          Decision support · does not diagnose, prescribe, or replace clinician judgment
        </p>
      </main>
    </div>
  );
}
