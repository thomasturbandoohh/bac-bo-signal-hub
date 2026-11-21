import type { LiveRoundInsert } from "@/lib/live-table";

/** Identificadores dos provedores de mesa que o app conhece. */
export type ProviderId = "lynxmetrics";

export interface ProviderInfo {
  id: ProviderId;
  /** Nome amigável no painel admin. */
  label: string;
  /** Texto de ajuda sob o campo da chave. */
  help: string;
  /** Placeholder do input da chave. */
  keyPlaceholder: string;
}

export interface FetchPageResult {
  /** Linhas prontas para gravar em live_rounds. */
  rows: LiveRoundInsert[];
  /** Cursor para a próxima página (id ou null se acabou). */
  nextCursor: string | null;
  /** Quantos itens a API devolveu nesta página (para saber se vale pedir a próxima). */
  rawCount: number;
}

/**
 * Contrato de um provedor de resultados Bac Bo Live.
 * Qualquer API nova vira um objeto que implementa isto.
 */
export interface LiveProvider {
  id: ProviderId;
  info: ProviderInfo;
  /** Testa se a chave funciona (null = ok, string = código de erro). */
  testKey(key: string): Promise<string | null>;
  /**
   * Busca uma página de rodadas.
   * `after` = id da última rodada que já temos (ou null = página mais recente).
   */
  fetchPage(key: string, after: string | null): Promise<FetchPageResult>;
}
