import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/site/cards";
import { Empty, FilterSelect, ListSkeleton, PageHeader } from "@/components/site/common";
import { CITIES, JOB_TYPES, TRADES } from "@/lib/constants";
import { seo } from "@/lib/seo";

type S = { q?: string | undefined; trade?: string | undefined; city?: string | undefined; type?: string | undefined };

export const Route = createFileRoute("/jobs/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: (s["q"] as string) || undefined, trade: (s["trade"] as string) || undefined,
    city: (s["city"] as string) || undefined, type: (s["type"] as string) || undefined,
  }),
  head: () => seo("Find trade jobs", "Open jobs for electricians, plumbers, welders, masons, drivers and more, with pay shown upfront."),
  component: JobsPage,
});

function JobsPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/jobs/" });
  const set = (patch: Partial<S>) => navigate({ search: (p) => ({ ...p, ...patch }) });
  const q = useQuery({
    queryKey: ["jobs", s],
    queryFn: async () => {
      let r = supabase.from("jobs").select("*").eq("status", "open").order("created_at", { ascending: false });
      if (s.trade) r = r.eq("trade", s.trade);
      if (s.city) r = r.eq("city", s.city);
      if (s.type) r = r.eq("job_type", s.type);
      if (s.q) r = r.or(`title.ilike.%${s.q}%,description.ilike.%${s.q}%,company.ilike.%${s.q}%`);
      const { data, error } = await r;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Jobs" subtitle={q.data ? `${q.data.length} open positions` : "Loading…"} action={<Button asChild><Link to="/post-job">Post a job</Link></Button>} />
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">Keyword
            <input defaultValue={s.q} onKeyDown={(e) => e.key === "Enter" && set({ q: (e.target as HTMLInputElement).value || undefined })} placeholder="Press Enter" className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground" />
          </label>
          <FilterSelect label="Trade" value={s.trade ?? ""} onChange={(v) => set({ trade: v || undefined })} options={TRADES} />
          <FilterSelect label="City" value={s.city ?? ""} onChange={(v) => set({ city: v || undefined })} options={CITIES} />
          <label className="block text-xs font-medium text-muted-foreground">Type
            <select value={s.type ?? ""} onChange={(e) => set({ type: e.target.value || undefined })} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground">
              <option value="">All</option>
              {Object.entries(JOB_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {(s.q || s.trade || s.city || s.type) && <button onClick={() => navigate({ search: {} })} className="text-sm text-primary hover:underline">Clear filters</button>}
        </aside>
        <div className="space-y-3">
          {q.isLoading ? <ListSkeleton /> : q.error ? <Empty title="Couldn't load jobs" body="Please try again in a moment." /> :
            q.data!.length === 0 ? <Empty title="No jobs match these filters" body="Try another city or trade, or clear the filters." /> :
            q.data!.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      </div>
    </div>
  );
}
