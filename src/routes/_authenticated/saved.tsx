import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { JobCard, ToolCard, WorkerCard } from "@/components/site/cards";
import { Empty, ListSkeleton, PageHeader } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => seo("Saved", "Jobs, workers, tools and posts you saved."),
  component: Saved,
});

function Saved() {
  const { profile } = useAuth();
  const q = useQuery({
    queryKey: ["saved-full", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const items = (await supabase.from("saved_items").select("*")).data ?? [];
      const ids = (t: string) => items.filter((i) => i.item_type === t).map((i) => i.item_id);
      const none = ["00000000-0000-0000-0000-000000000000"];
      const pick = (a: string[]) => (a.length ? a : none);
      const [jobs, workers, tools, posts] = await Promise.all([
        supabase.from("jobs").select("*").in("id", pick(ids("job"))),
        supabase.from("profiles").select("*").in("id", pick(ids("worker"))),
        supabase.from("tool_listings").select("*").in("id", pick(ids("tool"))),
        supabase.from("posts").select("id,title,body").in("id", pick(ids("post"))),
      ]);
      return { jobs: jobs.data ?? [], workers: workers.data ?? [], tools: tools.data ?? [], posts: posts.data ?? [], total: items.length };
    },
  });
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Saved" subtitle="Things you bookmarked to come back to" />
      <div className="mt-6 space-y-8">
        {q.isLoading || !q.data ? <ListSkeleton /> : q.data.total === 0 ? <Empty title="Nothing saved yet" body="Use the bookmark icon on any job, worker, tool or post." action={<Link to="/jobs" className="text-sm text-primary underline">Browse jobs</Link>} /> : <>
          {!!q.data.jobs.length && <G t="Jobs">{q.data.jobs.map((j) => <JobCard key={j.id} job={j} />)}</G>}
          {!!q.data.workers.length && <G t="Workers">{q.data.workers.map((w) => <WorkerCard key={w.id} w={w} />)}</G>}
          {!!q.data.tools.length && <G t="Equipment">{q.data.tools.map((t) => <ToolCard key={t.id} t={t} />)}</G>}
          {!!q.data.posts.length && <G t="Posts">{q.data.posts.map((p) => <Link key={p.id} to="/posts/$id" params={{ id: p.id }} className="block rounded-md border bg-card p-4 hover:border-primary/40"><p className="font-semibold">{p.title}</p><p className="line-clamp-1 text-sm text-muted-foreground">{p.body}</p></Link>)}</G>}
        </>}
      </div>
    </div>
  );
}
const G = ({ t, children }: { t: string; children: React.ReactNode }) => <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t}</h2><div className="grid gap-3 md:grid-cols-2">{children}</div></section>;
