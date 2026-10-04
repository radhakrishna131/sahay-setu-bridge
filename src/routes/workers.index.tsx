import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkerCard } from "@/components/site/cards";
import { Empty, FilterSelect, ListSkeleton, PageHeader } from "@/components/site/common";
import { CITIES, TRADES } from "@/lib/constants";
import { seo } from "@/lib/seo";

type S = { q?: string; trade?: string; city?: string; available?: boolean };

export const Route = createFileRoute("/workers/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: (s["q"] as string) || undefined, trade: (s["trade"] as string) || undefined,
    city: (s["city"] as string) || undefined, available: s["available"] === true || s["available"] === "true" || undefined,
  }),
  head: () => seo("Hire skilled workers", "Browse electricians, plumbers, carpenters, welders and other tradespeople by city, skill and daily rate."),
  component: WorkersPage,
});

function WorkersPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/workers/" });
  const set = (patch: Partial<S>) => navigate({ search: (p) => ({ ...p, ...patch }) });
  const q = useQuery({
    queryKey: ["workers", s],
    queryFn: async () => {
      let r = supabase.from("profiles").select("*").eq("account_type", "worker").neq("full_name", "").order("verified", { ascending: false });
      if (s.trade) r = r.eq("trade", s.trade);
      if (s.city) r = r.eq("city", s.city);
      if (s.available) r = r.eq("available", true);
      if (s.q) r = r.or(`full_name.ilike.%${s.q}%,headline.ilike.%${s.q}%,trade.ilike.%${s.q}%`);
      const { data, error } = await r;
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Workers" subtitle="Find tradespeople by skill and location" />
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">Name or skill
            <input defaultValue={s.q} onKeyDown={(e) => e.key === "Enter" && set({ q: (e.target as HTMLInputElement).value || undefined })} placeholder="Press Enter" className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground" />
          </label>
          <FilterSelect label="Trade" value={s.trade ?? ""} onChange={(v) => set({ trade: v || undefined })} options={TRADES} />
          <FilterSelect label="City" value={s.city ?? ""} onChange={(v) => set({ city: v || undefined })} options={CITIES} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.available} onChange={(e) => set({ available: e.target.checked || undefined })} />Available now</label>
        </aside>
        <div className="grid content-start gap-3 lg:grid-cols-2">
          {q.isLoading ? <ListSkeleton /> : q.data!.length === 0 ? <div className="lg:col-span-2"><Empty title="No workers found" body="Try widening your filters." /></div> :
            q.data!.map((w) => <WorkerCard key={w.id} w={w} />)}
        </div>
      </div>
    </div>
  );
}
