import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { CITIES, JOB_TYPES, TRADES } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/post-job")({
  head: () => seo("Post a job", "Hire skilled workers near you."),
  component: PostJob,
});

const schema = z.object({
  title: z.string().trim().min(5, "Give the job a clear title").max(120),
  company: z.string().trim().max(100).optional(),
  trade: z.string().min(1, "Choose a trade"),
  city: z.string().min(1, "Choose a city"),
  job_type: z.string(),
  pay_unit: z.enum(["day", "month", "hour"]),
  pay_min: z.coerce.number().int().positive("Enter pay"),
  pay_max: z.coerce.number().int().positive("Enter pay"),
  experience_min: z.coerce.number().int().min(0).max(40),
  skills: z.string().max(300).optional(),
  description: z.string().trim().min(30, "Describe the work in at least 30 characters").max(4000),
}).refine((v) => v.pay_max >= v.pay_min, { path: ["pay_max"], message: "Max must be at least min" });
type F = z.infer<typeof schema>;

function PostJob() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema) as never,
    defaultValues: { job_type: "full_time", pay_unit: "day", experience_min: 0, company: profile?.company_name ?? "" },
  });
  async function onSubmit(v: F) {
    const { data, error } = await supabase.from("jobs").insert({
      ...v, company: v.company || profile!.company_name || profile!.full_name, posted_by: profile!.id,
      skills: (v.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Job posted");
    navigate({ to: "/jobs/$id", params: { id: data.id } });
  }
  const Err = ({ k }: { k: keyof F }) => errors[k] ? <p className="mt-1 text-xs text-destructive">{String(errors[k]?.message)}</p> : null;
  const sel = "mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm";
  if (!profile) return null;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader title="Post a job" subtitle="Clear pay and location get more relevant applicants." />
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <div><Label htmlFor="title">Job title</Label><Input id="title" placeholder="e.g. Site electrician for G+4 apartment" {...register("title")} className="mt-1" /><Err k="title" /></div>
        <div><Label htmlFor="company">Business name</Label><Input id="company" {...register("company")} className="mt-1" /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><Label htmlFor="trade">Trade</Label><select id="trade" {...register("trade")} className={sel}><option value="">Select</option>{TRADES.map((t) => <option key={t}>{t}</option>)}</select><Err k="trade" /></div>
          <div><Label htmlFor="city">City</Label><select id="city" {...register("city")} className={sel}><option value="">Select</option>{CITIES.map((t) => <option key={t}>{t}</option>)}</select><Err k="city" /></div>
          <div><Label htmlFor="job_type">Type</Label><select id="job_type" {...register("job_type")} className={sel}>{Object.entries(JOB_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><Label htmlFor="pay_min">Pay from (₹)</Label><Input id="pay_min" type="number" {...register("pay_min")} className="mt-1" /><Err k="pay_min" /></div>
          <div><Label htmlFor="pay_max">Pay up to (₹)</Label><Input id="pay_max" type="number" {...register("pay_max")} className="mt-1" /><Err k="pay_max" /></div>
          <div><Label htmlFor="pay_unit">Per</Label><select id="pay_unit" {...register("pay_unit")} className={sel}><option value="day">Day</option><option value="month">Month</option><option value="hour">Hour</option></select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="experience_min">Minimum experience (years)</Label><Input id="experience_min" type="number" {...register("experience_min")} className="mt-1" /></div>
          <div><Label htmlFor="skills">Skills</Label><Input id="skills" placeholder="Comma separated" {...register("skills")} className="mt-1" /></div>
        </div>
        <div><Label htmlFor="description">Description</Label><Textarea id="description" rows={7} placeholder="Work involved, site location, timings, what you provide…" {...register("description")} className="mt-1" /><Err k="description" /></div>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Posting…" : "Post job"}</Button>
      </form>
    </div>
  );
}
