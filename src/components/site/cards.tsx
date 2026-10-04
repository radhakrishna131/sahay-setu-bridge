import { Link } from "@tanstack/react-router";
import { MapPin, Briefcase } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { JOB_TYPES, inr, payRange, timeAgo } from "@/lib/constants";
import { Avatar, Chip, SaveButton, SampleTag, Verified } from "./common";

export function JobCard({ job }: { job: Tables<"jobs"> }) {
  return (
    <Link to="/jobs/$id" params={{ id: job.id }} className="group block rounded-md border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold group-hover:text-primary">{job.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
        </div>
        <SaveButton type="job" id={job.id} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold">{payRange(job.pay_min, job.pay_max, job.pay_unit)}</span>
        <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{job.city}</span>
        <span className="flex items-center gap-1 text-muted-foreground"><Briefcase className="h-3.5 w-3.5" />{JOB_TYPES[job.job_type] ?? job.job_type}</span>
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(job.created_at)}</span>
      </div>
    </Link>
  );
}

export function WorkerCard({ w }: { w: Tables<"profiles"> }) {
  return (
    <Link to="/workers/$id" params={{ id: w.id }} className="group flex gap-3 rounded-md border bg-card p-4 transition-colors hover:border-primary/40">
      <Avatar name={w.full_name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold group-hover:text-primary">{w.full_name} {w.verified && <Verified />}</h3>
            <p className="text-sm text-muted-foreground">{w.trade} · {w.city}</p>
          </div>
          <SaveButton type="worker" id={w.id} />
        </div>
        <p className="mt-2 line-clamp-2 text-sm">{w.headline}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold">{inr(w.daily_rate)}/day</span>
          <span className="text-muted-foreground">{w.experience_years} yrs exp</span>
          {w.available && <span className="text-success">● Available</span>}
          {w.is_sample && <SampleTag />}
        </div>
      </div>
    </Link>
  );
}

export function ToolCard({ t }: { t: Tables<"tool_listings"> }) {
  return (
    <Link to="/marketplace/$id" params={{ id: t.id }} className="group flex flex-col rounded-md border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <Chip>{t.listing_type === "rent" ? "For rent" : "For sale"}</Chip>
        <SaveButton type="tool" id={t.id} />
      </div>
      <h3 className="mt-2 font-semibold group-hover:text-primary">{t.title}</h3>
      <p className="text-sm text-muted-foreground">{t.category} · {t.city}</p>
      <div className="mt-auto flex items-baseline justify-between pt-3">
        <span className="font-semibold">{inr(t.price)}{t.price_unit !== "once" && <span className="text-sm font-normal text-muted-foreground">/{t.price_unit}</span>}</span>
        {!t.available && <span className="text-xs text-muted-foreground">Unavailable</span>}
      </div>
    </Link>
  );
}
