import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, PageHeader } from "@/components/site/common";
import { useAuth, type Profile } from "@/lib/auth";
import { inr, timeAgo } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => seo("Dashboard", "Your applications, jobs, rentals and listings."),
  component: Dashboard,
});

function completion(p: Profile) {
  const checks = p.account_type === "worker"
    ? [p.full_name, p.headline, p.trade, p.city, p.bio, p.daily_rate, p.skills.length, p.phone]
    : [p.full_name, p.company_name, p.city, p.bio, p.phone];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const statusStyle: Record<string, string> = {
  submitted: "bg-secondary", shortlisted: "bg-accent text-accent-foreground", hired: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive", requested: "bg-secondary", approved: "bg-success/15 text-success", declined: "bg-destructive/10 text-destructive",
};
const Status = ({ s }: { s: string }) => <span className={`rounded px-2 py-0.5 text-xs capitalize ${statusStyle[s] ?? "bg-secondary"}`}>{s}</span>;

function Dashboard() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const pid = profile?.id;

  const myApps = useQuery({ queryKey: ["dash-apps", pid], enabled: !!pid, queryFn: async () => (await supabase.from("applications").select("*, job:jobs(id,title,company,city)").eq("applicant_id", pid!).order("created_at", { ascending: false })).data ?? [] });
  const myJobs = useQuery({ queryKey: ["dash-jobs", pid], enabled: !!pid, queryFn: async () => (await supabase.from("jobs").select("*, applications(*, applicant:profiles(id,full_name,trade,experience_years))").eq("posted_by", pid!).order("created_at", { ascending: false })).data ?? [] });
  const myRentals = useQuery({ queryKey: ["dash-rentals", pid], enabled: !!pid, queryFn: async () => (await supabase.from("rentals").select("*, listing:tool_listings(id,title,price,owner_id), renter:profiles(id,full_name)").order("created_at", { ascending: false })).data ?? [] });
  const myTools = useQuery({ queryKey: ["dash-tools", pid], enabled: !!pid, queryFn: async () => (await supabase.from("tool_listings").select("*").eq("owner_id", pid!)).data ?? [] });

  const setApp = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("applications").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dash-jobs"] }); toast.success("Updated"); },
  });
  const setJob = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { await supabase.from("jobs").update({ status }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dash-jobs"] }),
  });
  const setRental = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { await supabase.from("rentals").update({ status }).eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dash-rentals"] }); toast.success("Updated"); },
  });
  const toggleTool = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => { await supabase.from("tool_listings").update({ available }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dash-tools"] }),
  });
  const delTool = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tool_listings").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dash-tools"] }),
  });

  if (!profile) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground">Loading your account…</div>;
  const pct = completion(profile);
  const incoming = myRentals.data?.filter((r) => r.listing?.owner_id === pid) ?? [];
  const outgoing = myRentals.data?.filter((r) => r.renter_id === pid) ?? [];
  const isEmployer = profile.account_type === "employer";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title={`Hello, ${profile.full_name.split(" ")[0] || "there"}`} subtitle={isEmployer ? "Manage your jobs and applicants" : "Track your applications and rentals"}
        action={<div className="flex gap-2"><Button asChild variant="outline"><Link to="/list-tool">List equipment</Link></Button><Button asChild><Link to={isEmployer ? "/post-job" : "/jobs"}>{isEmployer ? "Post a job" : "Find jobs"}</Link></Button></div>} />

      {pct < 100 && (
        <div className="mt-6 flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-semibold">Your profile is {pct}% complete</p>
            <div className="mt-2 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${pct}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">Complete profiles show up higher for employers searching your trade.</p>
          </div>
          <Button asChild size="sm" variant="outline"><Link to="/profile">Complete profile</Link></Button>
        </div>
      )}

      <Tabs defaultValue={isEmployer ? "jobs" : "apps"} className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="apps">My applications</TabsTrigger>
          <TabsTrigger value="jobs">Jobs I posted</TabsTrigger>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
          <TabsTrigger value="tools">My listings</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="mt-4 space-y-2">
          {!myApps.data?.length ? <Empty title="No applications yet" body="When you apply for jobs they'll appear here with their status." action={<Button asChild size="sm"><Link to="/jobs">Browse jobs</Link></Button>} /> :
            myApps.data.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border bg-card p-3">
                <div>{a.job && <Link to="/jobs/$id" params={{ id: a.job.id }} className="font-medium hover:text-primary">{a.job.title}</Link>}<p className="text-xs text-muted-foreground">{a.job?.company} · {a.job?.city} · applied {timeAgo(a.created_at)}</p></div>
                <Status s={a.status} />
              </div>
            ))}
        </TabsContent>

        <TabsContent value="jobs" className="mt-4 space-y-4">
          {!myJobs.data?.length ? <Empty title="You haven't posted any jobs" action={<Button asChild size="sm"><Link to="/post-job">Post a job</Link></Button>} /> :
            myJobs.data.map((j) => (
              <div key={j.id} className="rounded-md border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                  <div><Link to="/jobs/$id" params={{ id: j.id }} className="font-semibold hover:text-primary">{j.title}</Link><p className="text-xs text-muted-foreground">{j.applications.length} applicants · {j.status}</p></div>
                  <Button size="sm" variant="outline" onClick={() => setJob.mutate({ id: j.id, status: j.status === "open" ? "closed" : "open" })}>{j.status === "open" ? "Close job" : "Reopen"}</Button>
                </div>
                {j.applications.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No applications yet.</p> : (
                  <ul className="divide-y">
                    {j.applications.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          {a.applicant && <Link to="/workers/$id" params={{ id: a.applicant.id }} className="font-medium hover:text-primary">{a.applicant.full_name}</Link>}
                          <p className="text-xs text-muted-foreground">{a.applicant?.trade} · {a.applicant?.experience_years} yrs</p>
                          {a.cover_note && <p className="mt-1 text-sm">“{a.cover_note}”</p>}
                        </div>
                        <Status s={a.status} />
                        <select aria-label="Change status" value={a.status} onChange={(e) => setApp.mutate({ id: a.id, status: e.target.value })} className="h-8 rounded border bg-card px-2 text-xs">
                          {["submitted", "shortlisted", "hired", "rejected"].map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </TabsContent>

        <TabsContent value="rentals" className="mt-4 space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Requests for my equipment</h3>
            {!incoming.length ? <p className="text-sm text-muted-foreground">None yet.</p> : incoming.map((r) => (
              <div key={r.id} className="mb-2 flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
                <div className="flex-1"><p className="font-medium">{r.listing?.title}</p><p className="text-xs text-muted-foreground">{r.renter?.full_name} · {r.start_date} → {r.end_date}{r.note && ` · “${r.note}”`}</p></div>
                <Status s={r.status} />
                {r.status === "requested" && <><Button size="sm" onClick={() => setRental.mutate({ id: r.id, status: "approved" })}>Approve</Button><Button size="sm" variant="outline" onClick={() => setRental.mutate({ id: r.id, status: "declined" })}>Decline</Button></>}
              </div>
            ))}
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">My rental requests</h3>
            {!outgoing.length ? <p className="text-sm text-muted-foreground">You haven't requested any equipment.</p> : outgoing.map((r) => (
              <div key={r.id} className="mb-2 flex items-center gap-3 rounded-md border bg-card p-3">
                <div className="flex-1">{r.listing && <Link to="/marketplace/$id" params={{ id: r.listing.id }} className="font-medium hover:text-primary">{r.listing.title}</Link>}<p className="text-xs text-muted-foreground">{r.start_date} → {r.end_date}</p></div>
                <Status s={r.status} />
              </div>
            ))}
          </section>
        </TabsContent>

        <TabsContent value="tools" className="mt-4 space-y-2">
          {!myTools.data?.length ? <Empty title="No equipment listed" action={<Button asChild size="sm"><Link to="/list-tool">List equipment</Link></Button>} /> : myTools.data.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
              <div className="flex-1"><Link to="/marketplace/$id" params={{ id: t.id }} className="font-medium hover:text-primary">{t.title}</Link><p className="text-xs text-muted-foreground">{inr(t.price)}/{t.price_unit} · {t.city}</p></div>
              <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={t.available} onChange={(e) => toggleTool.mutate({ id: t.id, available: e.target.checked })} />Available</label>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm("Delete this listing?") && delTool.mutate(t.id)}>Delete</Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
