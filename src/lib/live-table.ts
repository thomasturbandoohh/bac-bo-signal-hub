/**
 * Real Bac Bo Live rounds from the live table feed (LynxMetrics), mapped to the shapes the
 * pattern engine and the database use. Pure and browser-safe.
 */
import type { Database } from "@/integrations/supabase/types";
import type { Outcome, Round } from "./bacbo-engine";

/** One round as the provider sends it. */
export interface LynxRound {
  id: string;
  tableId?: string | null;
  startedAt?: string | null;
  settledAt: string;
  outcome: "player" | "banker" | "tie";
  data: {
    player: { dice: number[]; score: number };
    banker: { dice: number[]; score: number };
    multiplier?: number | null;
  };
}

export type LiveRoundInsert = Database["public"]["Tables"]["live_rounds"]["Insert"];
export type LiveRoundRow = Pick<
  Database["public"]["Tables"]["live_rounds"]["Row"],
  | "id"
  | "settled_at"
  | "outcome"
  | "player_dice"
  | "banker_dice"
  | "player_score"
  | "banker_score"
  | "multiplier"
> & { received_at?: string | null };

/** A real round, ready for the pattern engine. */
export interface LiveRound extends Round {
  id: string;
  settledAt: number;
  /** When our server first stored this round (server clock); drives late-round detection. */
  receivedAt?: number;
  pScore: number;
  bScore: number;
  multiplier: number | null;
}

const OUTCOMES: Record<string, Outcome> = { player: "P", banker: "B", tie: "T" };

const isDie = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 6;
const isPair = (d: unknown): d is [number, number] =>
  Array.isArray(d) && d.length === 2 && d.every(isDie);

/** Validates a provider round and converts it to a database row; null when malformed. */
export function lynxToRow(r: LynxRound): LiveRoundInsert | null {
  const p = r?.data?.player?.dice;
  const b = r?.data?.banker?.dice;
  if (!r || typeof r.id !== "string" || !r.id) return null;
  if (!(r.outcome in OUTCOMES) || !isPair(p) || !isPair(b)) return null;
  if (!Number.isFinite(Date.parse(r.settledAt))) return null;
  return {
    id: r.id,
    table_id: r.tableId ?? null,
    started_at: r.startedAt ?? null,
    settled_at: r.settledAt,
    outcome: r.outcome,
    player_dice: p,
    banker_dice: b,
    player_score: p[0] + p[1],
    banker_score: b[0] + b[1],
    multiplier: typeof r.data.multiplier === "number" ? r.data.multiplier : null,
  };
}

export function rowToLiveRound(row: LiveRoundRow): LiveRound {
  return {
    id: row.id,
    settledAt: Date.parse(row.settled_at),
    ...(row.received_at ? { receivedAt: Date.parse(row.received_at) } : {}),
    outcome: OUTCOMES[row.outcome] ?? "T",
    p: [row.player_dice[0] ?? 1, row.player_dice[1] ?? 1],
    b: [row.banker_dice[0] ?? 1, row.banker_dice[1] ?? 1],
    pScore: row.player_score,
    bScore: row.banker_score,
    multiplier: row.multiplier,
  };
}

/** Admin-facing explanation of a feed error code stored by the sync. */
export function feedErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code.includes("missing_service_key"))
    return "Falta a chave de servidor (service_role) do banco. Sem ela a mesa não sincroniza.";
  if (code.includes("trial_expired"))
    return "O teste da LynxMetrics acabou. Assine um plano para a mesma chave voltar a funcionar.";
  if (code.includes("subscription_required"))
    return "A assinatura da LynxMetrics não está ativa. Renove o plano para a mesa voltar.";
  if (code.includes("payment_pending"))
    return "O pagamento da LynxMetrics está pendente. Regularize para a mesa voltar.";
  if (code.includes("key_wrong_api"))
    return "Essa chave é de outra mesa. Crie uma chave para o Bac Bo Live na LynxMetrics.";
  if (code.includes("plan_limit"))
    return "O plano da LynxMetrics não permite esse pedido. Buscando só as rodadas recentes.";
  if (code.includes("upstream_error") || code.includes("http_5") || code.includes("timeout"))
    return "A LynxMetrics está instável agora. Tentando de novo em instantes.";
  if (code.includes("401") || code.includes("unauthorized") || code.includes("key_"))
    return "A chave da LynxMetrics foi recusada. Copie a chave do Bac Bo Live no painel da LynxMetrics e cole de novo.";
  if (code.includes("429")) return "Limite de consultas da LynxMetrics atingido. Tentando de novo.";
  if (code.includes("network") || code.includes("bad_response"))
    return "A LynxMetrics não respondeu. Tentando de novo em instantes.";
  if (code.includes("missing_credentials"))
    return "Nenhuma chave da LynxMetrics salva. Cole a chave abaixo e toque em Ligar conexão.";
  return "Não foi possível ler a mesa agora. Tentando de novo.";
}
