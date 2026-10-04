import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Briefcase, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, Chip, Empty, ListSkeleton, SaveButton, Verified } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { JOB_TYPES, payRange, timeAgo } from "@/lib/constants";
import { openConversation } from "@/lib/messaging";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/jobs/$id")({
  head: () => seo("Job details", "Pay, location, requirements and how to apply."),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const job = useQuery({
    queryKey: ["job", id],
    queryFn: async () => (await supabase.from("jobs").select("*, poster:profiles!jobs_posted_by_fkey(*)").eq("id", id).maybeSingle()).data,
  });
  const mine = useQuery({
    queryKey: ["my-app", id, profile?.id],
    enabled: !!profile,
    queryFn: async () => (await supabase.from("applications").select("*").eq("job_id", id).eq("applicant_id", profile!.id).maybeSingle()).data,
  });

  const apply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("applications").insert({ job_id: id, applicant_id: profile!.id, cover_note: note.trim().slice(0, 1000) || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Application sent"); qc.invalidateQueries({ queryKey: ["my-app", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function message() {
    if (!profile) { navigate({ to: "/auth" }); return; }
    const c = await openConversation(profile.id, job.data!.posted_by);
    navigate({ to: "/messages", search: { c } });
  }

  if (job.isLoading) return <div className="mx-auto max-w-4xl px-4 py-8"><ListSkeleton rows={3} /></div>;
  if (!job.data) return <div className="mx-auto max-w-4xl px-4 py-8"><Empty title="Job not found" body="It may have been removed." /></div>;
  const j = job.data;
  const isOwner = profile?.id === j.posted_by;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/jobs" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All jobs</Link>
      <div className="grid gap-8 md:grid-cols-[1fr_280px]">
        <article>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{j.title}</h1>
              <p className="mt-1 text-muted-foreground">{j.company}</p>
            </div>
            <SaveButton type="job" id={j.id} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <span className="font-semibold">{payRange(j.pay_min, j.pay_max, j.pay_unit)}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{j.city}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><Briefcase className="h-4 w-4" />{JOB_TYPES[j.job_type]}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-4 w-4" />Posted {timeAgo(j.created_at)}</span>
          </div>
          {j.status !== "open" && <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm">This job is no longer accepting applications.</p>}
          <h2 className="mt-8 font-semibold">About the work</h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{j.description}</p>
          <h2 className="mt-6 font-semibold">Requirements</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>Trade: {j.trade}</li>
            <li>Minimum experience: {j.experience_min ? `${j.experience_min} years` : "None — training given"}</li>
          </ul>
          {j.skills.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{j.skills.map((s) => <Chip key={s}>{s}</Chip>)}</div>}
        </article>

        <aside className="space-y-4">
          <div className="rounded-md border bg-card p-4">
            {isOwner ? (
              <><p className="text-sm">You posted this job.</p><Button asChild className="mt-3 w-full"><Link to="/dashboard">Review applications</Link></Button></>
            ) : mine.data ? (
              <><p className="text-sm font-semibold">Application {mine.data.status}</p><p className="mt-1 text-xs text-muted-foreground">Sent {timeAgo(mine.data.created_at)}. You'll get a notification when it changes.</p></>
            ) : !profile ? (
              <><p className="text-sm">Sign in to apply for this job.</p><Button asChild className="mt-3 w-full"><Link to="/auth">Sign in to apply</Link></Button></>
            ) : j.status === "open" ? (
              <>
                <label htmlFor="note" className="text-sm font-medium">Short note (optional)</label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={4} className="mt-1.5" placeholder="Your experience with similar work, when you can start…" />
                <Button className="mt-3 w-full" onClick={() => apply.mutate()} disabled={apply.isPending}>{apply.isPending ? "Sending…" : "Apply now"}</Button>
              </>
            ) : null}
          </div>
          {j.poster && (
            <div className="rounded-md border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Posted by</p>
              <div className="mt-2 flex items-center gap-3">
                <Avatar name={j.poster.full_name} />
                <div><p className="text-sm font-semibold">{j.poster.full_name} {j.poster.verified && <Verified />}</p><p className="text-xs text-muted-foreground">{j.poster.city}</p></div>
              </div>
              {!isOwner && <Button variant="outline" className="mt-3 w-full" onClick={message}>Message employer</Button>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
