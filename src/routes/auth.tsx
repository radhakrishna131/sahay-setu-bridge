import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: s["mode"] === "signup" ? ("signup" as const) : undefined }),
  head: () => seo("Sign in or join", "Sign in to SAHAY-SETU or create a free worker or employer account."),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  full_name: z.string().trim().max(80).optional(),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const [signup, setSignup] = useState(mode === "signup");
  const [type, setType] = useState<"worker" | "employer">("worker");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (session) navigate({ to: "/dashboard" }); }, [session, navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: f.get("email"), password: f.get("password"), full_name: f.get("full_name") ?? undefined });
    if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? "Check your details");
    setBusy(true);
    const { email, password, full_name } = parsed.data;
    if (signup) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name, account_type: type } },
      });
      if (error) setErr(error.message);
      else if (!data.session) toast.success("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setErr(r.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-2xl font-bold">{signup ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{signup ? "Free for workers and employers." : "Sign in to continue."}</p>

      <Button variant="outline" className="mt-6 w-full" onClick={google}>Continue with Google</Button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {signup && (
          <>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">I am</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["worker", "employer"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t}
                    className={`rounded-md border px-3 py-2 text-sm ${type === t ? "border-primary bg-accent font-semibold text-accent-foreground" : "bg-card"}`}>
                    {t === "worker" ? "Looking for work" : "Hiring"}
                  </button>
                ))}
              </div>
            </fieldset>
            <div><Label htmlFor="full_name">{type === "employer" ? "Business or your name" : "Full name"}</Label><Input id="full_name" name="full_name" className="mt-1" required /></div>
          </>
        )}
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" className="mt-1" required /></div>
        <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} className="mt-1" required /></div>
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {signup ? "Already have an account?" : "New here?"}{" "}
        <button className="font-medium text-primary hover:underline" onClick={() => { setSignup(!signup); setErr(null); }}>{signup ? "Sign in" : "Create an account"}</button>
      </p>
    </div>
  );
}
