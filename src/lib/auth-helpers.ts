import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearAllHistory } from "@/lib/session-history";

export type AccountNotice = "created" | "confirm" | "pending" | "rejected" | "blocked";

export function isNotice(v: unknown): v is AccountNotice {
  return (
    v === "created" || v === "confirm" || v === "pending" || v === "rejected" || v === "blocked"
  );
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

/** Shown when Supabase's built-in e-mail sender hits its hourly limit on sign-up. */
export const EMAIL_RATE_LIMIT_MESSAGE =
  "O limite de envio de e-mails do Supabase foi atingido. Para liberar o cadastro, desative a confirmação de e-mail (Confirm email) no painel do Supabase em Authentication → Providers → Email, ou aguarde cerca de 1 hora.";

/** Sign-up error text: a clear note for the e-mail rate limit, otherwise Supabase's exact message. */
export function signUpErrorMessage(error: {
  message: string;
  status?: number | undefined;
  code?: string | undefined;
}): string {
  const m = error.message.toLowerCase();
  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    m.includes("email rate limit exceeded") ||
    m.includes("rate limit")
  ) {
    return EMAIL_RATE_LIMIT_MESSAGE;
  }
  return `Não foi possível criar a conta: ${error.message}`;
}
