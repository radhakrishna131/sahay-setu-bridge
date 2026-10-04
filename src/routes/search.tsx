import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { JobCard, ToolCard, WorkerCard } from "@/components/site/cards";
import { Empty, ListSkeleton } from "@/components/site/common";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"] : "" }),
  head: () => seo("Search", "Search jobs, workers, equipment and community posts."),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [v, setV] = useState(q);
  const term = q.trim().replace(/[%,()]/g, " ");
  const r = useQuery({
    queryKey: ["search", term],
    enabled: term.length > 1,
    queryFn: async () => {
      const like = `%${term}%`;
      const [jobs, workers, tools, posts] = await Promise.all([
        supabase.from("jobs").select("*").eq("status", "open").or(`title.ilike.${like},trade.ilike.${like},city.ilike.${like},description.ilike.${like}`).limit(6),
        supabase.from("profiles").select("*").eq("account_type", "worker").or(`full_name.ilike.${like},trade.ilike.${like},city.ilike.${like},headline.ilike.${like}`).limit(6),
        supabase.from("tool_listings").select("*").or(`title.ilike.${like},category.ilike.${like},city.ilike.${like}`).limit(6),
        supabase.from("posts").select("id,title,body").or(`title.ilike.${like},body.ilike.${like}`).limit(6),
      ]);
      return { jobs: jobs.data ?? [], workers: workers.data ?? [], tools: tools.data ?? [], posts: posts.data ?? [] };
    },
  });
  const total = r.data ? r.data.jobs.length + r.data.workers.length + r.data.tools.length + r.data.posts.length : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/search", search: { q: v } }); }} className="flex gap-2" role="search">
        <input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="Search jobs, workers, tools, posts" aria-label="Search" className="h-10 flex-1 rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
        <Button type="submit" className="h-10">Search</Button>
      </form>
      {term.length < 2 ? <p className="mt-8 text-sm text-muted-foreground">Type at least two characters — a trade, a city, or a tool.</p> :
        r.isLoading ? <div className="mt-8"><ListSkeleton /></div> :
        total === 0 ? <div className="mt-8"><Empty title={`No results for “${q}”`} body="Try a trade name like “plumber” or a city like “Guntur”." /></div> : (
        <div className="mt-8 space-y-10">
          {!!r.data!.jobs.length && <Group title="Jobs">{r.data!.jobs.map((j) => <JobCard key={j.id} job={j} />)}</Group>}
          {!!r.data!.workers.length && <Group title="Workers">{r.data!.workers.map((w) => <WorkerCard key={w.id} w={w} />)}</Group>}
          {!!r.data!.tools.length && <Group title="Tools & equipment">{r.data!.tools.map((t) => <ToolCard key={t.id} t={t} />)}</Group>}
          {!!r.data!.posts.length && <Group title="Community posts">{r.data!.posts.map((p) => (
            <Link key={p.id} to="/posts/$id" params={{ id: p.id }} className="block rounded-md border bg-card p-4 hover:border-primary/40"><p className="font-semibold">{p.title}</p><p className="line-clamp-1 text-sm text-muted-foreground">{p.body}</p></Link>
          ))}</Group>}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2><div className="grid gap-3 md:grid-cols-2">{children}</div></section>;
}
