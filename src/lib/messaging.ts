import { supabase } from "@/integrations/supabase/client";

/** Find or create a 1:1 conversation between two profiles; returns its id. */
export async function openConversation(me: string, other: string) {
  const [a, b] = [me, other].sort() as [string, string];
  const { data: existing } = await supabase.from("conversations").select("id").eq("profile_a", a).eq("profile_b", b).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("conversations").insert({ profile_a: a, profile_b: b }).select("id").single();
  if (error) throw error;
  return data.id;
}
