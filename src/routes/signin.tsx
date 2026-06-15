import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { MeshBackground } from "@/components/scope/MeshBackground";
import { ScopeLogo } from "@/components/scope/ScopeLogo";
import { WovenLightHero } from "@/components/ui/woven-light-hero";
import { api } from "@/lib/api";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — SCOPE" },
      { name: "description", content: "Sign in to your SCOPE Studio." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await api.signin(email, password);
      toast.success("Welcome back!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MeshBackground />
      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden lg:block relative overflow-hidden h-full">
          <div className="absolute top-8 left-8 z-20">
            <Link to="/"><ScopeLogo /></Link>
          </div>
          <WovenLightHero
            title="Refract your brand."
            primaryCtaLabel="Explore Studio"
            onPrimaryCtaClick={() => navigate({ to: "/" })}
          />
        </div>

        {/* Form */}
        <div className="flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md rounded-3xl p-8 bg-white border border-slate-200 shadow-lg">
            <div className="lg:hidden mb-6"><ScopeLogo /></div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Welcome back</p>
            <h2 className="mt-1 font-display text-3xl text-foreground">Sign in</h2>

            <button
              onClick={() => toast("Google OAuth coming soon", { description: "Configure OAuth credentials to enable." })}
              className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-white"
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="signin-email" className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/80">Email</label>
                <input
                  id="signin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  className="mt-1 w-full rounded-lg border border-border bg-white/80 px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-foreground/40"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="signin-password" className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/80">Password</label>
                  <button type="button" onClick={() => toast("Password reset coming soon")} className="cursor-pointer text-[11px] text-muted-foreground transition-colors duration-200 hover:text-foreground">Forgot?</button>
                </div>
                <div className="relative mt-1">
                  <input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-white/80 px-3 py-2 pr-10 text-sm outline-none transition-colors duration-200 focus:border-foreground/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-cta mt-1 w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition-all duration-200 hover:brightness-105 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-5 text-center text-[13px] text-muted-foreground">
              New here? <Link to="/signup" className="text-foreground underline-offset-2 hover:underline">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2c-2 1.4-4.5 2.3-7.3 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.3 5.2c-.4.4 6.7-4.9 6.7-14.8 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
