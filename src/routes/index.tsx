import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { JobCard, ToolCard, WorkerCard } from "@/components/site/cards";
import { ListSkeleton } from "@/components/site/common";
import { TRADES } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("Jobs, skilled workers and tool rentals", "Find trade work, hire verified electricians, plumbers, welders and more, rent equipment and join trade communities across South India."),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const jobs = useQuery({ queryKey: ["home-jobs"], queryFn: async () => (await supabase.from("jobs").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(4)).data ?? [] });
  const workers = useQuery({ queryKey: ["home-workers"], queryFn: async () => (await supabase.from("profiles").select("*").eq("account_type", "worker").order("verified", { ascending: false }).limit(4)).data ?? [] });
  const tools = useQuery({ queryKey: ["home-tools"], queryFn: async () => (await supabase.from("tool_listings").select("*").eq("available", true).limit(3)).data ?? [] });

  return (
    <>
      <section className="border-b bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
            <p className="text-sm font-semibold text-primary">Work. Connect. Grow.</p>
            <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Steady work for skilled hands, and the right hands for every job.</h1>
            <p className="mt-4 max-w-lg text-muted-foreground">SAHAY-SETU connects electricians, plumbers, welders, masons and other tradespeople with employers, tools and each other.</p>
            <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/search", search: { q } }); }} className="mt-7 flex max-w-lg gap-2" role="search">
              <label className="relative flex-1">
                <span className="sr-only">Search</span>
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “welder Visakhapatnam”" className="h-10 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              <Button type="submit" className="h-10">Search</Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {TRADES.slice(0, 6).map((t) => (
                <Link key={t} to="/jobs" search={{ trade: t }} className="rounded-full border bg-card px-3 py-1 text-xs hover:border-primary hover:text-primary">{t}</Link>
              ))}
            </div>
          </div>
          <div className="grid content-center gap-3">
            {[
              { n: "1", t: "Create your profile", d: "List your trade, skills, rate and city." },
              { n: "2", t: "Discover opportunities", d: "Browse open jobs and equipment near you." },
              { n: "3", t: "Connect", d: "Apply, message employers, join trade groups." },
              { n: "4", t: "Grow your work", d: "Build a record of jobs and a network you can rely on." },
            ].map((s) => (
              <div key={s.n} className="flex gap-3 rounded-md border bg-card p-3.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{s.n}</span>
                <div><p className="text-sm font-semibold">{s.t}</p><p className="text-sm text-muted-foreground">{s.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section title="Recently posted jobs" to="/jobs" cta="All jobs">
        {jobs.isLoading ? <ListSkeleton rows={2} /> : <div className="grid gap-3 md:grid-cols-2">{jobs.data?.map((j) => <JobCard key={j.id} job={j} />)}</div>}
      </Section>
      <Section title="Skilled workers" to="/workers" cta="Browse workers">
        {workers.isLoading ? <ListSkeleton rows={2} /> : <div className="grid gap-3 md:grid-cols-2">{workers.data?.map((w) => <WorkerCard key={w.id} w={w} />)}</div>}
      </Section>
      <Section title="Tools & equipment" to="/marketplace" cta="Open marketplace">
        {tools.isLoading ? <ListSkeleton rows={1} /> : <div className="grid gap-3 sm:grid-cols-3">{tools.data?.map((t) => <ToolCard key={t.id} t={t} />)}</div>}
      </Section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="flex flex-col items-start justify-between gap-4 rounded-md border bg-card p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">Hiring for a site or workshop?</h2>
            <p className="text-sm text-muted-foreground">Post a job in a couple of minutes and review applications in your dashboard.</p>
          </div>
          <Button asChild><Link to="/post-job">Post a job</Link></Button>
        </div>
      </section>
    </>
  );
}

function Section({ title, to, cta, children }: { title: string; to: "/jobs" | "/workers" | "/marketplace"; cta: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto mt-12 max-w-6xl px-4">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link to={to} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">{cta}<ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      {children}
    </section>
  );
}
