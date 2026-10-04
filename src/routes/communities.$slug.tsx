import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, Empty, ListSkeleton } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/communities/$slug")({
  head: () => seo("Community", "Discussions and work leads from people in the trade."),
  component: CommunityPage,
});

function CommunityPage() {
  const { slug } = Route.useParams();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const c = useQuery({ queryKey: ["community", slug], queryFn: async () => (await supabase.from("communities").select("*").eq("slug", slug).maybeSingle()).data });
  const cid = c.data?.id;
  const posts = useQuery({
    queryKey: ["posts", cid], enabled: !!cid,
    queryFn: async () => (await supabase.from("posts").select("*, author:profiles(full_name, trade), comments(count), post_likes(count)").eq("community_id", cid!).order("created_at", { ascending: false })).data ?? [],
  });
  const member = useQuery({
    queryKey: ["member", cid, profile?.id], enabled: !!cid && !!profile,
    queryFn: async () => !!(await supabase.from("community_members").select("profile_id").eq("community_id", cid!).eq("profile_id", profile!.id).maybeSingle()).data,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (member.data) await supabase.from("community_members").delete().match({ community_id: cid!, profile_id: profile!.id });
      else await supabase.from("community_members").insert({ community_id: cid!, profile_id: profile!.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["member", cid] }); qc.invalidateQueries({ queryKey: ["communities"] }); },
  });
  const post = useMutation({
    mutationFn: async () => {
      if (title.trim().length < 4 || body.trim().length < 4) throw new Error("Add a title and some detail");
      const { error } = await supabase.from("posts").insert({ community_id: cid!, author_id: profile!.id, title: title.trim().slice(0, 160), body: body.trim().slice(0, 5000) });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setBody(""); toast.success("Posted"); qc.invalidateQueries({ queryKey: ["posts", cid] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (c.isLoading) return <div className="mx-auto max-w-3xl px-4 py-8"><ListSkeleton /></div>;
  if (!c.data) return <div className="mx-auto max-w-3xl px-4 py-8"><Empty title="Community not found" /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/communities" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Communities</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div><h1 className="text-2xl font-bold">{c.data.name}</h1><p className="mt-1 text-sm text-muted-foreground">{c.data.description}</p></div>
        {profile ? <Button variant={member.data ? "outline" : "default"} onClick={() => toggle.mutate()}>{member.data ? "Leave" : "Join"}</Button> : <Button asChild><Link to="/auth">Sign in to join</Link></Button>}
      </div>

      {profile && (
        <form onSubmit={(e) => { e.preventDefault(); post.mutate(); }} className="mt-6 rounded-md border bg-card p-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ask a question or share a lead" maxLength={160} aria-label="Post title" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details…" rows={3} className="mt-2" aria-label="Post body" />
          <div className="mt-2 flex justify-end"><Button size="sm" disabled={post.isPending}>Post</Button></div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {posts.isLoading ? <ListSkeleton /> : posts.data!.length === 0 ? <Empty title="No posts yet" body="Start the first discussion." /> : posts.data!.map((p) => (
          <Link key={p.id} to="/posts/$id" params={{ id: p.id }} className="block rounded-md border bg-card p-4 hover:border-primary/40">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Avatar name={p.author?.full_name} className="h-6 w-6 text-[10px]" />{p.author?.full_name} · {timeAgo(p.created_at)}</div>
            <h2 className="mt-2 font-semibold">{p.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{(p.post_likes as unknown as { count: number }[])[0]?.count ?? 0}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{(p.comments as unknown as { count: number }[])[0]?.count ?? 0}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
