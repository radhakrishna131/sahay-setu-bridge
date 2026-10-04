import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, Chip, Empty, ListSkeleton, SampleTag, SaveButton, Verified } from "@/components/site/common";
import { ToolCard } from "@/components/site/cards";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/constants";
import { openConversation } from "@/lib/messaging";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/workers/$id")({
  head: () => seo("Worker profile", "Skills, experience, rate and availability."),
  component: WorkerProfile,
});

function WorkerProfile() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const w = useQuery({ queryKey: ["profile", id], queryFn: async () => (await supabase.from("profiles").select("*").eq("id", id).maybeSingle()).data });
  const tools = useQuery({ queryKey: ["profile-tools", id], queryFn: async () => (await supabase.from("tool_listings").select("*").eq("owner_id", id)).data ?? [] });

  async function message() {
    if (!profile) { navigate({ to: "/auth" }); return; }
    const c = await openConversation(profile.id, id);
    navigate({ to: "/messages", search: { c } });
  }

  if (w.isLoading) return <div className="mx-auto max-w-4xl px-4 py-8"><ListSkeleton rows={2} /></div>;
  if (!w.data) return <div className="mx-auto max-w-4xl px-4 py-8"><Empty title="Profile not found" /></div>;
  const p = w.data;
  const isMe = profile?.id === p.id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/workers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All workers</Link>
      <div className="flex flex-col gap-5 rounded-md border bg-card p-6 sm:flex-row sm:items-start">
        <Avatar name={p.full_name} className="h-16 w-16 text-lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{p.company_name || p.full_name}</h1>{p.verified && <Verified />}{p.is_sample && <SampleTag />}
          </div>
          <p className="text-muted-foreground">{p.headline}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{p.city || "Location not set"}{p.trade && ` · ${p.trade}`}</p>
          {p.account_type === "worker" && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span><strong>{inr(p.daily_rate)}</strong>/day</span>
              <span><strong>{p.experience_years}</strong> yrs experience</span>
              <span className={p.available ? "text-success" : "text-muted-foreground"}>{p.available ? "Available for work" : "Not available"}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {isMe ? <Button asChild variant="outline"><Link to="/profile">Edit profile</Link></Button> : <>
            <Button onClick={message}>Message</Button>
            <SaveButton type="worker" id={p.id} />
          </>}
        </div>
      </div>
      {p.bio && <section className="mt-6"><h2 className="font-semibold">About</h2><p className="mt-2 whitespace-pre-line leading-relaxed">{p.bio}</p></section>}
      {p.skills.length > 0 && <section className="mt-6"><h2 className="font-semibold">Skills</h2><div className="mt-2 flex flex-wrap gap-1.5">{p.skills.map((s) => <Chip key={s}>{s}</Chip>)}</div></section>}
      {!!tools.data?.length && <section className="mt-8"><h2 className="font-semibold">Equipment listed</h2><div className="mt-3 grid gap-3 sm:grid-cols-3">{tools.data.map((t) => <ToolCard key={t.id} t={t} />)}</div></section>}
    </div>
  );
}
