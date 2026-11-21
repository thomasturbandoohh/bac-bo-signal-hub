import { lynxToRow, type LynxRound } from "@/lib/live-table";
import type { FetchPageResult, LiveProvider, ProviderInfo } from "./types";

const API_URL = "https://api.lynxmetrics.com/v1/bacbo-live";
const TIMEOUT_MS = 12_000;

const info: ProviderInfo = {
  id: "lynxmetrics",
  label: "LynxMetrics (Bac Bo Live)",
  help: "Crie a chave no site da LynxMetrics (API Bac Bo Live) e cole aqui. Começa com sk-lynx.",
  keyPlaceholder: "Cole a chave da LynxMetrics (sk-lynx…)",
};

const lynxFetch = (path: string, key: string) =>
  fetch(`${API_URL}${path}`, {
    headers: { "x-api-key": key, accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => {
    throw new Error("network");
  });

async function errorCode(res: Response): Promise<string> {
  const body = await res.text();
  let code = "";
  try {
    code = (JSON.parse(body) as { error?: { code?: string } }).error?.code ?? "";
  } catch {
    /* not JSON */
  }
  return `http_${res.status}${code ? `:${code}` : ""}`;
}

export const lynxMetricsProvider: LiveProvider = {
  id: "lynxmetrics",
  info,

  async testKey(key: string) {
    try {
      const res = await lynxFetch("/results?limit=1", key);
      return res.ok ? null : await errorCode(res);
    } catch {
      return "network";
    }
  },

  async fetchPage(key: string, after: string | null): Promise<FetchPageResult> {
    const params = new URLSearchParams({ limit: "100" });
    if (after) params.set("after", after);

    let res = await lynxFetch(`/results?${params}`, key);

    // Cursor inválido / velho → recomeça pela página mais recente
    if (!res.ok && after && (res.status === 400 || res.status === 403 || res.status === 404)) {
      const code = await errorCode(res);
      if (!/unauthorized|key_|trial_expired|subscription_required/.test(code)) {
        res = await lynxFetch("/results?limit=100", key);
      } else {
        throw new Error(code);
      }
    }

    if (!res.ok) {
      if (res.status === 429) {
        const wait = Number(res.headers.get("retry-after"));
        const err = new Error(await errorCode(res)) as Error & { retryAfter?: number };
        err.retryAfter = Number.isFinite(wait) && wait > 0 ? wait : 10;
        throw err;
      }
      throw new Error(await errorCode(res));
    }

    const body = (await res.json().catch(() => null)) as {
      data?: LynxRound[];
      nextCursor?: string | null;
    } | null;

    if (!body || !Array.isArray(body.data)) throw new Error("bad_response");

    const rows = body.data.map(lynxToRow).filter((r): r is NonNullable<typeof r> => r !== null);

    return {
      rows,
      nextCursor: body.nextCursor ?? null,
      rawCount: body.data.length,
    };
  },
};
