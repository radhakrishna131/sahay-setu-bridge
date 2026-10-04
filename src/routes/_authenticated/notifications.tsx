import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Empty, ListSkeleton, PageHeader } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => seo("Notifications", "Updates on your applications, rentals and messages."),
  component: Notifications,
});

function Notifications() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications", profile?.id], enabled: !!profile, queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [] });
  const markAll = useMutation({
    mutationFn: async () => { await supabase.from("notifications").update({ read: true }).eq("read", false); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread"] }); },
  });
  const markOne = (id: string) => supabase.from("notifications").update({ read: true }).eq("id", id).then(() => qc.invalidateQueries({ queryKey: ["unread"] }));
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Notifications" action={!!q.data?.some((n) => !n.read) && <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>Mark all read</Button>} />
      <div className="mt-6 divide-y rounded-md border bg-card">
        {q.isLoading ? <div className="p-4"><ListSkeleton rows={3} /></div> : !q.data?.length ? <div className="p-2"><Empty title="You're all caught up" body="Application updates, rental requests and messages will show here." /></div> :
          q.data.map((n) => (
            <a key={n.id} href={n.link ?? "#"} onClick={() => markOne(n.id)} className={`flex gap-3 p-4 hover:bg-muted/50 ${n.read ? "" : "bg-accent/40"}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
              <div className="flex-1"><p className="text-sm font-semibold">{n.title}</p>{n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}</div>
              <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
            </a>
          ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Looking for something else? Go to your <Link to="/dashboard" className="underline">dashboard</Link>.</p>
    </div>
  );
}
