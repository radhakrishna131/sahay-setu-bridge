import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, Empty } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (s: Record<string, unknown>): { c?: string | undefined } => (typeof s["c"] === "string" ? { c: s["c"] } : {}),
  head: () => seo("Messages", "Conversations with employers and workers."),
  component: Messages,
});

function Messages() {
  const { c } = Route.useSearch();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const pid = profile?.id;

  const convs = useQuery({
    queryKey: ["convs", pid], enabled: !!pid,
    queryFn: async () => (await supabase.from("conversations").select("*, a:profiles!conversations_profile_a_fkey(id,full_name,trade), b:profiles!conversations_profile_b_fkey(id,full_name,trade)").order("last_message_at", { ascending: false })).data ?? [],
  });
  const msgs = useQuery({
    queryKey: ["msgs", c], enabled: !!c,
    queryFn: async () => (await supabase.from("messages").select("*").eq("conversation_id", c!).order("created_at")).data ?? [],
  });

  useEffect(() => {
    if (!c) return;
    const ch = supabase.channel(`conv-${c}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${c}` }, () => qc.invalidateQueries({ queryKey: ["msgs", c] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [c, qc]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.data]);

  const send = useMutation({
    mutationFn: async () => {
      const body = text.trim().slice(0, 2000);
      if (!body) return;
      const { error } = await supabase.from("messages").insert({ conversation_id: c!, sender_id: pid!, body });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["msgs", c] }); qc.invalidateQueries({ queryKey: ["convs"] }); },
  });

  const other = (cv: NonNullable<typeof convs.data>[number]) => (cv.profile_a === pid ? cv.b : cv.a);
  const active = convs.data?.find((x) => x.id === c);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid h-[calc(100vh-9rem)] min-h-[420px] overflow-hidden rounded-md border bg-card md:grid-cols-[280px_1fr]">
        <aside className={cn("overflow-y-auto border-r", c && "hidden md:block")}>
          <h1 className="border-b px-4 py-3 font-semibold">Messages</h1>
          {!convs.data?.length ? <p className="p-4 text-sm text-muted-foreground">No conversations yet. Use “Message” on a job, profile or listing.</p> :
            convs.data.map((cv) => {
              const o = other(cv);
              return (
                <Link key={cv.id} to="/messages" search={{ c: cv.id }} className={cn("flex items-center gap-3 border-b px-4 py-3 hover:bg-muted/50", cv.id === c && "bg-accent/50")}>
                  <Avatar name={o?.full_name} className="h-9 w-9 text-xs" />
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{o?.full_name}</p><p className="text-xs text-muted-foreground">{timeAgo(cv.last_message_at)}</p></div>
                </Link>
              );
            })}
        </aside>
        <section className={cn("flex min-h-0 flex-col", !c && "hidden md:flex")}>
          {!c || !active ? <div className="m-auto p-6"><Empty title="Select a conversation" /></div> : <>
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <button className="md:hidden" onClick={() => navigate({ to: "/messages", search: {} })} aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
              <Link to="/workers/$id" params={{ id: other(active)!.id }} className="font-semibold hover:text-primary">{other(active)?.full_name}</Link>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {msgs.data?.length === 0 && <p className="text-center text-sm text-muted-foreground">Say hello 👋</p>}
              {msgs.data?.map((m) => (
                <div key={m.id} className={cn("max-w-[75%] rounded-lg px-3 py-2 text-sm", m.sender_id === pid ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className="mt-0.5 text-[10px] opacity-70">{timeAgo(m.created_at)}</p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send.mutate(); }} className="flex gap-2 border-t p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" aria-label="Message" className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              <Button type="submit" size="icon" className="h-10 w-10" disabled={send.isPending || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
            </form>
          </>}
        </section>
      </div>
    </div>
  );
}
