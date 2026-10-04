import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, PageHeader } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => seo("Admin", "Moderation tools."),
  component: Admin,
});

function Admin() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ["adm-users"], enabled: isAdmin, queryFn: async () => (await supabase.from("profiles").select("*").not("user_id", "is", null).order("created_at", { ascending: false })).data ?? [] });
  const posts = useQuery({ queryKey: ["adm-posts"], enabled: isAdmin, queryFn: async () => (await supabase.from("posts").select("*, author:profiles!posts_author_id_fkey(full_name)").order("created_at", { ascending: false }).limit(50)).data ?? [] });
  const jobs = useQuery({ queryKey: ["adm-jobs"], enabled: isAdmin, queryFn: async () => (await supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [] });

  const verify = useMutation({ mutationFn: async ({ id, v }: { id: string; v: boolean }) => { await supabase.from("profiles").update({ verified: v }).eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-users"] }) });
  const delPost = useMutation({ mutationFn: async (id: string) => { await supabase.from("posts").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-posts"] }) });
  const delJob = useMutation({ mutationFn: async (id: string) => { await supabase.from("jobs").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-jobs"] }) });

  if (!isAdmin) return <div className="mx-auto max-w-3xl px-4 py-12"><Empty title="Admins only" body="Your account doesn't have moderation access." /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Admin" subtitle="Verify members and moderate content" />
      <Tabs defaultValue="users" className="mt-6">
        <TabsList><TabsTrigger value="users">Members</TabsTrigger><TabsTrigger value="posts">Posts</TabsTrigger><TabsTrigger value="jobs">Jobs</TabsTrigger></TabsList>
        <TabsContent value="users" className="mt-4 divide-y rounded-md border bg-card">
          {users.data?.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <div className="flex-1"><Link to="/workers/$id" params={{ id: u.id }} className="font-medium">{u.full_name}</Link><p className="text-xs text-muted-foreground">{u.account_type} · {u.trade ?? "—"} · {u.city ?? "—"}</p></div>
              <Button size="sm" variant={u.verified ? "outline" : "default"} onClick={() => verify.mutate({ id: u.id, v: !u.verified })}>{u.verified ? "Unverify" : "Verify"}</Button>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="posts" className="mt-4 divide-y rounded-md border bg-card">
          {posts.data?.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="flex-1"><Link to="/posts/$id" params={{ id: p.id }} className="font-medium">{p.title}</Link><p className="text-xs text-muted-foreground">{p.author?.full_name} · {timeAgo(p.created_at)}</p></div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm("Remove post?") && delPost.mutate(p.id)}>Remove</Button>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="jobs" className="mt-4 divide-y rounded-md border bg-card">
          {jobs.data?.map((j) => (
            <div key={j.id} className="flex items-center gap-3 p-3">
              <div className="flex-1"><Link to="/jobs/$id" params={{ id: j.id }} className="font-medium">{j.title}</Link><p className="text-xs text-muted-foreground">{j.company} · {j.status}</p></div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm("Remove job?") && delJob.mutate(j.id)}>Remove</Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
