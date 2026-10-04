import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { CITIES, TRADES } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => seo("Edit profile", "Update your professional profile."),
  component: EditProfile,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  account_type: z.enum(["worker", "employer"]),
  company_name: z.string().trim().max(100).optional(),
  headline: z.string().trim().max(120).optional(),
  trade: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().trim().max(1500).optional(),
  experience_years: z.coerce.number().int().min(0).max(60),
  daily_rate: z.coerce.number().int().min(0).max(100000),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid Indian mobile number").or(z.literal("")).optional(),
  skills: z.string().max(400).optional(),
  available: z.boolean(),
});
type F = z.infer<typeof schema>;

function EditProfile() {
  const { profile, refreshProfile } = useAuth();
  const form = useForm<F>({ resolver: zodResolver(schema) as never });
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = form;

  useEffect(() => {
    if (profile) reset({
      full_name: profile.full_name, account_type: profile.account_type, company_name: profile.company_name ?? "",
      headline: profile.headline ?? "", trade: profile.trade ?? "", city: profile.city ?? "", bio: profile.bio ?? "",
      experience_years: profile.experience_years ?? 0, daily_rate: profile.daily_rate ?? 0, phone: profile.phone ?? "",
      skills: profile.skills.join(", "), available: profile.available,
    });
  }, [profile, reset]);

  async function onSubmit(v: F) {
    const { error } = await supabase.from("profiles").update({
      full_name: v.full_name, account_type: v.account_type, available: v.available,
      headline: v.headline || null, trade: v.trade || null, city: v.city || null, bio: v.bio || null,
      experience_years: v.experience_years,
      company_name: v.company_name || null, phone: v.phone || null, daily_rate: v.daily_rate || null,
      skills: (v.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 15),
      updated_at: new Date().toISOString(),
    }).eq("id", profile!.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    refreshProfile();
  }

  if (!profile) return null;
  const isWorker = watch("account_type") === "worker";
  const Err = ({ k }: { k: keyof F }) => errors[k] ? <p className="mt-1 text-xs text-destructive">{String(errors[k]?.message)}</p> : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader title="Edit profile" action={<Button asChild variant="outline" size="sm"><Link to="/workers/$id" params={{ id: profile.id }}>View public profile</Link></Button>} />
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="full_name">Full name</Label><Input id="full_name" {...register("full_name")} className="mt-1" /><Err k="full_name" /></div>
          <div><Label htmlFor="account_type">Account type</Label>
            <select id="account_type" {...register("account_type")} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"><option value="worker">Worker</option><option value="employer">Employer</option></select>
          </div>
        </div>
        {!isWorker && <div><Label htmlFor="company_name">Business name</Label><Input id="company_name" {...register("company_name")} className="mt-1" /></div>}
        <div><Label htmlFor="headline">Headline</Label><Input id="headline" placeholder={isWorker ? "e.g. Licensed electrician — residential wiring" : "e.g. Residential builder"} {...register("headline")} className="mt-1" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {isWorker && <div><Label htmlFor="trade">Trade</Label><select id="trade" {...register("trade")} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"><option value="">Select</option>{TRADES.map((t) => <option key={t}>{t}</option>)}</select></div>}
          <div><Label htmlFor="city">City</Label><select id="city" {...register("city")} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"><option value="">Select</option>{CITIES.map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        {isWorker && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="experience_years">Years of experience</Label><Input id="experience_years" type="number" min={0} {...register("experience_years")} className="mt-1" /><Err k="experience_years" /></div>
            <div><Label htmlFor="daily_rate">Daily rate (₹)</Label><Input id="daily_rate" type="number" min={0} {...register("daily_rate")} className="mt-1" /><Err k="daily_rate" /></div>
          </div>
        )}
        {isWorker && <div><Label htmlFor="skills">Skills</Label><Input id="skills" placeholder="Comma separated, e.g. House wiring, Earthing" {...register("skills")} className="mt-1" /></div>}
        <div><Label htmlFor="bio">About</Label><Textarea id="bio" rows={5} {...register("bio")} className="mt-1" /></div>
        <div><Label htmlFor="phone">Mobile number</Label><Input id="phone" placeholder="98xxxxxxxx" {...register("phone")} className="mt-1" /><Err k="phone" /><p className="mt-1 text-xs text-muted-foreground">Not shown publicly.</p></div>
        {isWorker && <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("available")} />I'm available for work</label>}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save profile"}</Button>
      </form>
    </div>
  );
}
