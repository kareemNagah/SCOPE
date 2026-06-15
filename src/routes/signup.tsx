import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { MeshBackground } from "@/components/scope/MeshBackground";
import { ScopeLogo } from "@/components/scope/ScopeLogo";
import { WovenLightHero } from "@/components/ui/woven-light-hero";
import { api } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your SCOPE account" },
      { name: "description", content: "Start refracting your brand with SCOPE Studio." },
    ],
  }),
  component: SignUpPage,
});

/** Password strength rules evaluated in real-time. */
function usePasswordStrength(password: string) {
  return useMemo(() => {
    const rules = [
      { label: "At least 6 characters", met: password.length >= 6 },
      { label: "Contains a number", met: /\d/.test(password) },
      { label: "Contains uppercase", met: /[A-Z]/.test(password) },
    ];
    const score = rules.filter((r) => r.met).length;
    const label = score === 0 ? "" : score === 1 ? "Weak" : score === 2 ? "Fair" : "Strong";
    const color = score <= 1 ? "bg-red-400" : score === 2 ? "bg-amber-400" : "bg-emerald-400";
    return { rules, score, label, color };
  }, [password]);
}

/** Common email typo suggestions. */
function suggestEmailFix(email: string): string | null {
  const typos: Record<string, string> = {
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gnail.com": "gmail.com",
    "hotmal.com": "hotmail.com",
    "yaho.com": "yahoo.com",
    "outlok.com": "outlook.com",
  };
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain && typos[domain]) {
    return email.replace(domain, typos[domain]);
  }
  return null;
}

function SignUpPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const navigate = useNavigate();
  const strength = usePasswordStrength(form.password);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const emailSuggestion = emailTouched ? suggestEmailFix(form.email) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.signup(form.name, form.email, form.password);
      toast.success("Account created! Welcome to SCOPE.");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MeshBackground />
      <div className="relative grid min-h-screen lg:grid-cols-2">
        <div className="hidden lg:block relative overflow-hidden h-full">
          <div className="absolute top-8 left-8 z-20">
            <Link to="/"><ScopeLogo /></Link>
          </div>
          <WovenLightHero
            title="One brief in. A full spectrum out."
            primaryCtaLabel="Explore Studio"
            onPrimaryCtaClick={() => navigate({ to: "/" })}
          />
        </div>

        <div className="flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md rounded-3xl p-8 bg-white border border-slate-200 shadow-lg">
            <div className="lg:hidden mb-6"><ScopeLogo /></div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Get started</p>
            <h2 className="mt-1 font-display text-3xl text-foreground">Create your account</h2>

            <button
              onClick={() => toast("Google OAuth coming soon", { description: "Configure OAuth credentials to enable." })}
              className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-white"
            >
              <GoogleIcon /> Sign up with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name */}
              <div>
                <label htmlFor="signup-name" className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/80">Name</label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Your name"
                  className="mt-1 w-full rounded-lg border border-border bg-white/80 px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-foreground/40"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/80">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={set("email")}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@studio.com"
                  className="mt-1 w-full rounded-lg border border-border bg-white/80 px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-foreground/40"
                />
                {emailSuggestion && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Did you mean{" "}
                    <button
                      type="button"
                      className="cursor-pointer font-semibold underline underline-offset-2"
                      onClick={() => {
                        setForm((f) => ({ ...f, email: emailSuggestion }));
                        setEmailTouched(false);
                      }}
                    >
                      {emailSuggestion}
                    </button>
                    ?
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/80">Password</label>
                <div className="relative mt-1">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Min 6 characters"
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

                {/* Strength meter */}
                {form.password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-1.5 flex-1 gap-0.5 overflow-hidden rounded-full bg-slate-100">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                              i < strength.score ? strength.color : "bg-transparent"
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[10px] font-medium ${
                        strength.score <= 1 ? "text-red-500" : strength.score === 2 ? "text-amber-500" : "text-emerald-500"
                      }`}>
                        {strength.label}
                      </span>
                    </div>
                    <ul className="space-y-0.5">
                      {strength.rules.map((rule) => (
                        <li
                          key={rule.label}
                          className={`flex items-center gap-1.5 text-[10px] transition-colors duration-200 ${
                            rule.met ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          {rule.met ? <Check size={10} /> : <X size={10} />}
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || strength.score < 1}
                className="bg-gradient-cta mt-1 w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition-all duration-200 hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p className="mt-5 text-center text-[13px] text-muted-foreground">
              Already have an account? <Link to="/signin" className="text-foreground underline-offset-2 hover:underline">Sign in</Link>
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
