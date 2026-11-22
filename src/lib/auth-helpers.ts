import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearAllHistory } from "@/lib/session-history";

export type AccountNotice = "created" | "pending" | "rejected" | "blocked";

export function isNotice(v: unknown): v is AccountNotice {
  return v === "created" || v === "pending" || v === "rejected" || v === "blocked";
}

/** Returns the account status for the signed-in user, or null when no profile exists yet. */
export async function getAccountStatus(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();
  // A failed read is not "unapproved": surface it so the user can retry instead of being signed out.
  if (error) throw error;
  return data?.status ?? null;
}

export async function signOutEverywhere(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
  clearAllHistory();
}
