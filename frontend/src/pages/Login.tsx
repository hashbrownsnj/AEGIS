import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Wordmark */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-sky-400" aria-hidden>
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-2xl font-black tracking-tight text-slate-100">AEGIS</span>
          </div>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500">
            Emergency Department Intelligence
          </p>
        </div>

        {/* Card */}
        <div className="card rounded-2xl p-7">
          <h1 className="mb-1 text-base font-black text-slate-100">Sign in</h1>
          <p className="mb-6 text-xs text-slate-500">Enter your credentials to access the dashboard.</p>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[.1em] text-slate-500">
              Email
              <input
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[.1em] text-slate-500">
              Password
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </label>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary mt-1 w-full"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-600">
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  );
}
