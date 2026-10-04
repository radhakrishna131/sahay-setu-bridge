import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

type AuthCtx = {
  session: Session | null;
  ready: boolean;
  profile: Profile | null;
  isAdmin: boolean;
  refreshProfile: () => void;
};

const Ctx = createContext<AuthCtx>({ session: null, ready: false, profile: null, isAdmin: false, refreshProfile: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") qc.invalidateQueries();
      if (event === "SIGNED_OUT") qc.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const uid = session?.user.id;
  const profileQ = useQuery({
    queryKey: ["me", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", uid!).maybeSingle();
      return data;
    },
  });
  const adminQ = useQuery({
    queryKey: ["me-admin", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid!);
      return (data ?? []).some((r) => r.role === "admin");
    },
  });

  return (
    <Ctx.Provider
      value={{
        session,
        ready,
        profile: uid ? profileQ.data ?? null : null,
        isAdmin: !!adminQ.data,
        refreshProfile: () => qc.invalidateQueries({ queryKey: ["me", uid] }),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
