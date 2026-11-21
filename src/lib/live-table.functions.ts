import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rowToLiveRound, type LiveRound } from "./live-table";
import { PROVIDER_LIST } from "./providers";
import { parseFeedKeyInput } from "./access-rules";
import { syncLiveRounds } from "./live-table.server";

export interface LiveTableData {
  rounds: LiveRound[];
  serverNow: number;
  feed: { lastSuccessAt: number | null; lastError: string | null } | null;
}

/** Lista de provedores (só ids e textos) para o select do admin. */
export const listProviders = createServerFn({ method: "GET" }).handler(async () => PROVIDER_LIST);

export const getLiveTable = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LiveTableData> => {
    const { data: approved } = await context.supabase.rpc("is_approved", {
      _user_id: context.userId,
    });
    if (!approved) throw new Error("Conta não aprovada.");

    await syncLiveRounds().catch((e) => console.error("sync failed", e));

    const [roundsRes, feedRes] = await Promise.all([
      context.supabase
        .from("live_rounds")
        .select(
          "id, settled_at, received_at, outcome, player_dice, banker_dice, player_score, banker_score, multiplier",
        )
        .order("settled_at", { ascending: false })
        .limit(60),
      context.supabase
        .from("live_feed_status")
        .select("last_success_at, last_error")
        .eq("id", 1)
        .maybeSingle(),
    ]);
    if (roundsRes.error) {
      console.error("live_rounds read failed", roundsRes.error);
      throw new Error("Não foi possível ler as rodadas da mesa.");
    }
    const feed = feedRes.data
      ? {
          lastSuccessAt: feedRes.data.last_success_at
            ? Date.parse(feedRes.data.last_success_at)
            : null,
          lastError: (await import("./admin-client.server")).serviceKey()
            ? feedRes.data.last_error
            : "missing_service_key",
        }
      : null;
    return {
      rounds: roundsRes.data.map(rowToLiveRound).reverse(),
      serverNow: Date.now(),
      feed,
    };
  });

/** Admin: salva provedor + chave, testa e reconecta a mesa na hora. */
export const connectLiveTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; provider?: string }) => parseFeedKeyInput(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Apenas o administrador pode trocar a chave.");
    if (!(await import("./admin-client.server")).serviceKey())
      return { ok: false, error: "missing_service_key" };

    const { testFeedKey, saveFeedConfig } = await import("./live-table.server");
    const problem = await testFeedKey(data.key, data.provider);
    if (problem) return { ok: false, error: problem };

    const { getAdminClient } = await import("./admin-client.server");
    const supabaseAdmin = getAdminClient();
    await saveFeedConfig(supabaseAdmin, { provider: data.provider, key: data.key });
    await syncLiveRounds(true);
    return { ok: true, error: null };
  });
