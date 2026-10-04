import type { ReactNode } from "react";
import { Bookmark, BookmarkCheck, BadgeCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed bg-card px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-md border bg-card" />
      ))}
    </div>
  );
}

export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground", className)}>
      {initials(name)}
    </div>
  );
}

export function Verified() {
  return <BadgeCheck className="inline h-4 w-4 text-primary" aria-label="Verified" />;
}

export function SampleTag() {
  return <span className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">sample</span>;
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{children}</span>;
}

export function SaveButton({ type, id }: { type: "job" | "worker" | "tool" | "post"; id: string }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ["saved", profile?.id];
  const saved = useQuery({
    queryKey: key,
    enabled: !!profile,
    queryFn: async () => (await supabase.from("saved_items").select("item_type,item_id")).data ?? [],
  });
  const isSaved = !!saved.data?.some((s) => s.item_type === type && s.item_id === id);
  const m = useMutation({
    mutationFn: async () => {
      if (isSaved) await supabase.from("saved_items").delete().match({ item_type: type, item_id: id });
      else {
        const { error } = await supabase.from("saved_items").insert({ profile_id: profile!.id, item_type: type, item_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success(isSaved ? "Removed from saved" : "Saved");
    },
  });
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!profile) { navigate({ to: "/auth" }); return; }
        m.mutate();
      }}
      className={cn("rounded p-1.5 transition-colors hover:bg-muted", isSaved ? "text-primary" : "text-muted-foreground")}
      aria-label={isSaved ? "Remove from saved" : "Save"}
      aria-pressed={isSaved}
    >
      {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
    </button>
  );
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground">
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
