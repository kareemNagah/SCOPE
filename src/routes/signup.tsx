import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MeshBackground } from "@/components/scope/MeshBackground";
import { ScopeLogo } from "@/components/scope/ScopeLogo";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your SCOPE account" },
      { name: "description", content: "Start refracting your brand with SCOPE Studio." },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MeshBackground />
      <div className="relative grid min-h-screen lg:grid-cols-2">
        <div className="hidden flex-col justify-between p-10 lg:flex">
          <Link to="/"><ScopeLogo /></Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Join the studio</p>
            <h1 className="mt-2 font-display text-5xl text-foreground leading-[1.05]">
              One brief in.<br /><span className="text-gradient-brand">A full spectrum out.</span>
            </h1>
            <p className="mt-3 max-w-md text-[15px] text-muted-foreground">
              Strategy, identity, personas, ad copy, vector logos — generated, editable, exportable.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">© 2026 SCOPE Studio</p>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-10">
          <div className="glass w-full max-w-md rounded-3xl p-8">
            <div className="lg:hidden mb-6"><ScopeLogo /></div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Get started</p>
            <h2 className="mt-1 font-display text-3xl text-foreground">Create your account</h2>

            <button
              onClick={() => toast("Auth coming soon", { description: "Google OAuth will be wired with Lovable Cloud." })}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-white transition"
            >
              <GoogleIcon /> Sign up with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); toast("Auth coming soon", { description: `Account for ${form.email || "you"} will be created once Lovable Cloud is enabled.` }); }}
              className="space-y-3"
            >
              {[
                { k: "name", label: "Name", type: "text", placeholder: "Your name" },
                { k: "email", label: "Email", type: "email", placeholder: "you@studio.com" },
                { k: "password", label: "Password", type: "password", placeholder: "Min 8 characters" },
              ].map((f) => (
                <div key={f.k}>
                  <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/80">{f.label}</label>
                  <input
                    type={f.type}
                    required
                    value={form[f.k as keyof typeof form]}
                    onChange={set(f.k as keyof typeof form)}
                    placeholder={f.placeholder}
                    className="mt-1 w-full rounded-lg border border-border bg-white/80 px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                </div>
              ))}
              <button type="submit" className="bg-gradient-cta mt-1 w-full rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] hover:brightness-105 transition">
                Create account
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
