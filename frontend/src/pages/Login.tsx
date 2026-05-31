import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { AegisMark } from "@/components/ui/AegisMark";

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
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-atmosphere relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* single, intentional brand glow behind the mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[26%] h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.14) 0%, transparent 68%)" }}
      />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-9 flex flex-col items-center text-center">
          <Link to="/" aria-label="Aegis home">
            <AegisMark className="h-[84px] w-auto drop-shadow-[0_6px_24px_rgba(56,189,248,0.25)]" animate />
          </Link>
          <h1 className="mt-5 font-display text-[2.75rem] font-semibold leading-none tracking-[-0.02em] text-white">
            Aegis
          </h1>
          <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[.3em] text-slate-500">
            Emergency Department Command
          </p>
        </div>

        {/* Card */}
        <div className="card rounded-2xl p-7">
          <h2 className="font-display text-lg font-medium tracking-tight text-slate-100">Sign in</h2>
          <p className="mb-6 mt-1 text-xs text-slate-500">Enter your credentials to access the console.</p>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">
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

            <label className="grid gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">
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
              <div className="flex items-center gap-2.5 rounded-lg border border-red-500/25 bg-red-500/8 px-3.5 py-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" aria-hidden />
                <span className="text-xs text-red-400">{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary mt-1 w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[.18em] text-slate-600">
          Decision support · does not diagnose
        </p>
      </div>
    </div>
  );
}
