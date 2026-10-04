import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ThumbsUp, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, Empty, ListSkeleton, SaveButton } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/posts/$id")({
  head: () => seo("Discussion", "A community discussion on SAHAY-SETU."),
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const { profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const p = useQuery({ queryKey: ["post", id], queryFn: async () => (await supabase.from("posts").select("*, author:profiles(id, full_name, trade), community:communities(name, slug)").eq("id", id).maybeSingle()).data });
  const comments = useQuery({ queryKey: ["comments", id], queryFn: async () => (await supabase.from("comments").select("*, author:profiles(id, full_name)").eq("post_id", id).order("created_at")).data ?? [] });
  const likes = useQuery({ queryKey: ["likes", id], queryFn: async () => (await supabase.from("post_likes").select("profile_id").eq("post_id", id)).data ?? [] });
  const liked = !!likes.data?.some((l) => l.profile_id === profile?.id);

  const like = useMutation({
    mutationFn: async () => {
      if (liked) await supabase.from("post_likes").delete().match({ post_id: id, profile_id: profile!.id });
      else await supabase.from("post_likes").insert({ post_id: id, profile_id: profile!.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["likes", id] }),
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Write something first");
      const { error } = await supabase.from("comments").insert({ post_id: id, author_id: profile!.id, body: body.trim().slice(0, 2000) });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["comments", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (cid: string) => { await supabase.from("comments").delete().eq("id", cid); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", id] }),
  });

  if (p.isLoading) return <div className="mx-auto max-w-3xl px-4 py-8"><ListSkeleton /></div>;
  if (!p.data) return <div className="mx-auto max-w-3xl px-4 py-8"><Empty title="Post not found" /></div>;
  const post = p.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {post.community && <Link to="/communities/$slug" params={{ slug: post.community.slug }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{post.community.name}</Link>}
      <article className="rounded-md border bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Avatar name={post.author?.full_name} className="h-8 w-8 text-xs" />{post.author?.full_name} · {timeAgo(post.created_at)}</div>
        <h1 className="mt-3 text-xl font-bold">{post.title}</h1>
        <p className="mt-2 whitespace-pre-line leading-relaxed">{post.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button disabled={!profile} onClick={() => like.mutate()} className={cn("flex items-center gap-1.5 rounded border px-2.5 py-1 text-sm", liked && "border-primary text-primary")} aria-pressed={liked}>
            <ThumbsUp className="h-4 w-4" />{likes.data?.length ?? 0}
          </button>
          <SaveButton type="post" id={post.id} />
        </div>
      </article>

      <h2 className="mt-8 font-semibold">{comments.data?.length ?? 0} replies</h2>
      <div className="mt-3 space-y-3">
        {comments.data?.map((c) => (
          <div key={c.id} className="rounded-md border bg-card p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{c.author?.full_name} · {timeAgo(c.created_at)}</span>
              {(c.author?.id === profile?.id || isAdmin) && <button onClick={() => del.mutate(c.id)} aria-label="Delete reply" className="hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
            <p className="mt-1 whitespace-pre-line text-sm">{c.body}</p>
          </div>
        ))}
      </div>
      {profile ? (
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="mt-4">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply" rows={3} aria-label="Reply" />
          <div className="mt-2 flex justify-end"><Button size="sm" disabled={add.isPending}>Reply</Button></div>
        </form>
      ) : <p className="mt-4 text-sm"><Link to="/auth" className="text-primary underline">Sign in</Link> to reply.</p>}
    </div>
  );
}
