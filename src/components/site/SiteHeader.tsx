import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, Bookmark, LogOut, Menu, MessageSquare, Search, User, LayoutDashboard, Shield } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/constants";

const NAV = [
  { to: "/jobs", label: "Jobs" },
  { to: "/workers", label: "Workers" },
  { to: "/marketplace", label: "Tools & Rentals" },
  { to: "/communities", label: "Communities" },
] as const;

export function SiteHeader() {
  const { session, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const unread = useQuery({
    queryKey: ["unread", profile?.id],
    enabled: !!profile,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { q } });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetTitle className="mb-4"><Logo /></SheetTitle>
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm hover:bg-muted" activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="rounded px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-semibold" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <form onSubmit={submit} className="ml-auto hidden max-w-xs flex-1 lg:block" role="search">
          <label className="relative block">
            <span className="sr-only">Search</span>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs, workers, tools…" className="h-9 w-full rounded-md border bg-card pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Button asChild variant="ghost" size="icon" className="lg:hidden" aria-label="Search"><Link to="/search" search={{ q: "" }}><Search className="h-4 w-4" /></Link></Button>
          {session ? (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Messages"><Link to="/messages" search={{}}><MessageSquare className="h-4 w-4" /></Link></Button>
              <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Link to="/notifications">
                  <Bell className="h-4 w-4" />
                  {!!unread.data && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />}
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground" aria-label="Account menu">
                  {initials(profile?.full_name)}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">{profile?.full_name || session.user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4" />Edit profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/saved"><Bookmark className="mr-2 h-4 w-4" />Saved</Link></DropdownMenuItem>
                  {isAdmin && <DropdownMenuItem asChild><Link to="/admin"><Shield className="mr-2 h-4 w-4" />Admin</Link></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/auth" search={{ mode: "signup" }}>Join free</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
