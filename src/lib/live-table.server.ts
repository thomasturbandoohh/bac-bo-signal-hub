import { getProvider, isProviderId, type ProviderId } from "./providers";

/** No máximo um pedido ao provedor por este intervalo (compartilhado entre todos os usuários). */
const SYNC_INTERVAL_MS = 2_000;
/** Mais antigo que isto → recomeça pela página recente em vez de recuperar rodada a rodada. */
const CATCH_UP_MS = 30 * 60_000;
const KEEP_DAYS = 3;
const MAX_PAGES = 3;

const CONFIG_BUCKET = "app-config";
const CONFIG_PATH = "live-feed.json";
/** Arquivo antigo (só LynxMetrics) — ainda lido por compatibilidade. */
const LEGACY_KEY_PATH = "lynxmetrics.json";

type Admin = ReturnType<typeof import("./admin-client.server").getAdminClient>;

export interface FeedConfig {
  provider: ProviderId;
  key: string;
}

/** Lê provedor + chave salvos no painel (ou env de fallback). */
export async function readFeedConfig(admin: Admin): Promise<FeedConfig | null> {
  // Formato novo
  const { data: modern } = await admin.storage.from(CONFIG_BUCKET).download(CONFIG_PATH);
  if (modern) {
    try {
      const parsed = JSON.parse(await modern.text()) as { provider?: string; key?: string };
      if (parsed.key && parsed.key.length >= 8) {
        return {
          provider: isProviderId(parsed.provider ?? "")
            ? (parsed.provider as ProviderId)
            : "lynxmetrics",
          key: parsed.key,
        };
      }
    } catch {
      /* ignore */
    }
  }

  // Formato antigo (só chave LynxMetrics)
  const { data: legacy } = await admin.storage.from(CONFIG_BUCKET).download(LEGACY_KEY_PATH);
  if (legacy) {
    try {
      const key = (JSON.parse(await legacy.text()) as { key?: string }).key;
      if (key) return { provider: "lynxmetrics", key };
    } catch {
      /* ignore */
    }
  }

  const envKey =
    process.env["LYNXMETRICS_API_KEY"] || process.env["UDC_LYNXMETRICS_API_KEY"] || null;
  if (envKey) return { provider: "lynxmetrics", key: envKey };
  return null;
}

/** @deprecated use readFeedConfig */
export async function readFeedKey(admin: Admin): Promise<string | null> {
  return (await readFeedConfig(admin))?.key ?? null;
}

export async function saveFeedConfig(admin: Admin, config: FeedConfig): Promise<void> {
  await admin.storage.createBucket(CONFIG_BUCKET, { public: false }).catch(() => undefined);
  const { error } = await admin.storage
    .from(CONFIG_BUCKET)
    .upload(CONFIG_PATH, new Blob([JSON.stringify(config)], { type: "application/json" }), {
      upsert: true,
    });
  if (error) throw new Error(`storage:${error.message}`);
}

/** @deprecated use saveFeedConfig */
export async function saveFeedKey(admin: Admin, key: string): Promise<void> {
  await saveFeedConfig(admin, { provider: "lynxmetrics", key });
}

export async function testFeedKey(key: string, providerId?: string): Promise<string | null> {
  const provider = getProvider(providerId);
  return provider.testKey(key);
}

let pausedUntil = 0;

/**
 * Puxa rodadas novas do provedor ativo e grava no banco.
 * Limitado pelo banco: muitos usuários ao mesmo tempo = só 1 chamada ao provedor por intervalo.
 */
export async function syncLiveRounds(force = false): Promise<void> {
  if (!(await import("./admin-client.server")).serviceKey()) return;
  if (!force && Date.now() < pausedUntil) return;

  const { getAdminClient } = await import("./admin-client.server");
  const supabaseAdmin = getAdminClient();
  // Global pause set by the admin (robot_settings.api_paused): no provider calls for anyone.
  // An explicit reconnect by the admin (force) still runs once to test the new key.
  if (!force) {
    const { data: settings } = await supabaseAdmin
      .from("robot_settings")
      .select("api_paused")
      .eq("id", 1)
      .maybeSingle();
    if (settings?.api_paused) return;
  }
  const { data: claimed, error: claimError } = await supabaseAdmin.rpc("claim_live_feed_sync", {
    _min_interval_ms: force ? 0 : SYNC_INTERVAL_MS,
  });
  if (claimError) {
    console.error("claim_live_feed_sync failed", claimError);
    return;
  }
  if (!claimed) return;

  const setStatus = (patch: { last_success_at?: string; last_error: string | null }) =>
    supabaseAdmin
      .from("live_feed_status")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", 1);

  try {
    const config = await readFeedConfig(supabaseAdmin);
    if (!config) throw new Error("missing_credentials");

    const provider = getProvider(config.provider);

    const { data: last } = await supabaseAdmin
      .from("live_rounds")
      .select("id, settled_at")
      .order("settled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let cursor = last && Date.now() - Date.parse(last.settled_at) < CATCH_UP_MS ? last.id : null;

    for (let page = 0; page < MAX_PAGES; page++) {
      let result;
      try {
        result = await provider.fetchPage(config.key, cursor);
      } catch (e) {
        const err = e as Error & { retryAfter?: number };
        if (err.retryAfter) {
          pausedUntil = Date.now() + err.retryAfter * 1000;
        }
        throw e;
      }

      if (result.rows.length) {
        const { error } = await supabaseAdmin
          .from("live_rounds")
          .upsert(result.rows, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw new Error(`db:${error.message}`);
      }

      if (!cursor || result.rawCount < 100 || !result.nextCursor) break;
      cursor = result.nextCursor;
    }

    const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
    await supabaseAdmin.from("live_rounds").delete().lt("settled_at", cutoff);
    await setStatus({ last_success_at: new Date().toISOString(), last_error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Live table sync failed:", message);
    await setStatus({ last_error: message.slice(0, 300) });
  }
}
