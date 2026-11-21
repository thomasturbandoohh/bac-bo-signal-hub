import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearAllHistory } from "@/lib/session-history";

export type AccountNotice = "created" | "pending" | "rejected" | "blocked";

export function isNotice(v: unknown): v is AccountNotice {
  return v === "created" || v === "pending" || v === "rejected" || v === "blocked";
}

/** Returns the account status for the signed-in user, or null when no profile exists yet. */
export async function getAccountStatus(userId: string) {
  const { data } = await supabase.from("profiles").select("status").eq("id", userId).maybeSingle();
  return data?.status ?? null;
}

export async function signOutEverywhere(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
  clearAllHistory();
}
