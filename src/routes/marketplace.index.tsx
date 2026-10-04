import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/site/cards";
import { Empty, FilterSelect, ListSkeleton, PageHeader } from "@/components/site/common";
import { CITIES, TOOL_CATEGORIES } from "@/lib/constants";
import { seo } from "@/lib/seo";

type S = { q?: string; category?: string; city?: string; kind?: string };

export const Route = createFileRoute("/marketplace/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: (s["q"] as string) || undefined, category: (s["category"] as string) || undefined,
    city: (s["city"] as string) || undefined, kind: (s["kind"] as string) || undefined,
  }),
  head: () => seo("Tools & equipment rentals", "Rent or buy power tools, welding machines, scaffolding and site equipment from workers near you."),
  component: Market,
});

function Market() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/marketplace/" });
  const set = (patch: Partial<S>) => navigate({ search: (p) => ({ ...p, ...patch }) });
  const q = useQuery({
    queryKey: ["tools", s],
    queryFn: async () => {
      let r = supabase.from("tool_listings").select("*").order("created_at", { ascending: false });
      if (s.category) r = r.eq("category", s.category);
      if (s.city) r = r.eq("city", s.city);
      if (s.kind) r = r.eq("listing_type", s.kind);
      if (s.q) r = r.or(`title.ilike.%${s.q}%,description.ilike.%${s.q}%`);
      return (await r).data ?? [];
    },
  });
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Tools & Rentals" subtitle="Equipment listed by workers and businesses" action={<Button asChild><Link to="/list-tool">List equipment</Link></Button>} />
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">Keyword
            <input defaultValue={s.q} onKeyDown={(e) => e.key === "Enter" && set({ q: (e.target as HTMLInputElement).value || undefined })} placeholder="Press Enter" className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground" />
          </label>
          <FilterSelect label="Category" value={s.category ?? ""} onChange={(v) => set({ category: v || undefined })} options={TOOL_CATEGORIES} />
          <FilterSelect label="City" value={s.city ?? ""} onChange={(v) => set({ city: v || undefined })} options={CITIES} />
          <label className="block text-xs font-medium text-muted-foreground">Listing
            <select value={s.kind ?? ""} onChange={(e) => set({ kind: e.target.value || undefined })} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground">
              <option value="">All</option><option value="rent">For rent</option><option value="sell">For sale</option>
            </select>
          </label>
        </aside>
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {q.isLoading ? <div className="sm:col-span-3"><ListSkeleton /></div> : q.data!.length === 0 ? <div className="sm:col-span-3"><Empty title="Nothing listed here yet" body="Be the first to list equipment in this category." /></div> :
            q.data!.map((t) => <ToolCard key={t.id} t={t} />)}
        </div>
      </div>
    </div>
  );
}
