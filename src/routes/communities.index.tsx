import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ListSkeleton, PageHeader } from "@/components/site/common";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/communities/")({
  head: () => seo("Trade communities", "Discuss techniques, prices and work leads with others in your trade."),
  component: Communities,
});

function Communities() {
  const q = useQuery({
    queryKey: ["communities"],
    queryFn: async () => (await supabase.from("communities").select("*, community_members(count), posts(count)").order("name")).data ?? [],
  });
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Communities" subtitle="Groups for each trade — ask questions, share leads, help each other." />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {q.isLoading ? <ListSkeleton /> : q.data!.map((c) => (
          <Link key={c.id} to="/communities/$slug" params={{ slug: c.slug }} className="group rounded-md border bg-card p-5 hover:border-primary/40">
            <h2 className="font-semibold group-hover:text-primary">{c.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{(c.community_members as unknown as { count: number }[])[0]?.count ?? 0} members</span>
              <span>{(c.posts as unknown as { count: number }[])[0]?.count ?? 0} posts</span>
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
