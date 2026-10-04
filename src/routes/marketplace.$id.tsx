import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, Chip, Empty, ListSkeleton, SaveButton, Verified } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/constants";
import { openConversation } from "@/lib/messaging";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/marketplace/$id")({
  head: () => seo("Equipment listing", "Price, deposit, condition and rental requests."),
  component: ToolDetail,
});

function ToolDetail() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [note, setNote] = useState("");

  const t = useQuery({ queryKey: ["tool", id], queryFn: async () => (await supabase.from("tool_listings").select("*, owner:profiles!tool_listings_owner_id_fkey(*)").eq("id", id).maybeSingle()).data });

  const rent = useMutation({
    mutationFn: async () => {
      if (end < start) throw new Error("End date must be after start date");
      const { error } = await supabase.from("rentals").insert({ listing_id: id, renter_id: profile!.id, start_date: start, end_date: end, note: note.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Request sent to the owner"); setNote(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function message() {
    if (!profile) return navigate({ to: "/auth" });
    navigate({ to: "/messages", search: { c: await openConversation(profile.id, t.data!.owner_id) } });
  }

  if (t.isLoading) return <div className="mx-auto max-w-4xl px-4 py-8"><ListSkeleton rows={2} /></div>;
  if (!t.data) return <div className="mx-auto max-w-4xl px-4 py-8"><Empty title="Listing not found" /></div>;
  const l = t.data;
  const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
  const isOwner = profile?.id === l.owner_id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/marketplace" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Marketplace</Link>
      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <article>
          <div className="flex items-start justify-between"><Chip>{l.listing_type === "rent" ? "For rent" : "For sale"}</Chip><SaveButton type="tool" id={l.id} /></div>
          <h1 className="mt-2 text-2xl font-bold">{l.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{l.city} · {l.category}</p>
          <dl className="mt-6 grid grid-cols-3 gap-3 rounded-md border bg-card p-4 text-sm">
            <div><dt className="text-muted-foreground">Price</dt><dd className="font-semibold">{inr(l.price)}{l.price_unit !== "once" && `/${l.price_unit}`}</dd></div>
            <div><dt className="text-muted-foreground">Deposit</dt><dd className="font-semibold">{inr(l.deposit)}</dd></div>
            <div><dt className="text-muted-foreground">Condition</dt><dd className="font-semibold capitalize">{l.condition?.replace("_", " ")}</dd></div>
          </dl>
          <h2 className="mt-6 font-semibold">Description</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed">{l.description}</p>
        </article>
        <aside className="space-y-4">
          {!isOwner && l.listing_type === "rent" && l.available && (
            <div className="rounded-md border bg-card p-4">
              {!profile ? <><p className="text-sm">Sign in to request this rental.</p><Button asChild className="mt-3 w-full"><Link to="/auth">Sign in</Link></Button></> : <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label htmlFor="s">From</Label><Input id="s" type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" /></div>
                  <div><Label htmlFor="e">To</Label><Input id="e" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" /></div>
                </div>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the owner" className="mt-2" rows={2} maxLength={500} />
                <p className="mt-2 text-sm">Estimate: <strong>{inr(days * l.price)}</strong> for {days} day{days > 1 && "s"} + {inr(l.deposit)} deposit</p>
                <Button className="mt-3 w-full" disabled={rent.isPending} onClick={() => rent.mutate()}>Request rental</Button>
                <p className="mt-2 text-xs text-muted-foreground">Payment is arranged directly with the owner.</p>
              </>}
            </div>
          )}
          {isOwner && <div className="rounded-md border bg-card p-4 text-sm">This is your listing. Requests appear in your <Link to="/dashboard" className="text-primary underline">dashboard</Link>.</div>}
          {l.owner && (
            <div className="rounded-md border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Listed by</p>
              <Link to="/workers/$id" params={{ id: l.owner.id }} className="mt-2 flex items-center gap-3"><Avatar name={l.owner.full_name} /><span className="text-sm font-semibold">{l.owner.full_name} {l.owner.verified && <Verified />}</span></Link>
              {!isOwner && <Button variant="outline" className="mt-3 w-full" onClick={message}>Message owner</Button>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
