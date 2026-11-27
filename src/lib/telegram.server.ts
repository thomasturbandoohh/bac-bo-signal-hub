import { isGreen, type Side } from "./bacbo-engine";
import { decisionAfter } from "./robot-schedule";
import type { LiveRound } from "./live-table";

const CONFIG_BUCKET = "app-config";
const TELEGRAM_CONFIG_PATH = "telegram.json";
const TELEGRAM_STATE_PATH = "telegram-state.json";

type Admin = ReturnType<typeof import("./admin-client.server").getAdminClient>;

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  platformName?: string;
  platformUrl?: string;
  tableName?: string;
}

export interface ActiveSignalState {
  key: string;
  side: Side;
  pattern: string;
  confidence: number;
  stage: "entry" | "gale";
  entryRoundId: string;
  galeRoundId?: string | undefined;
  entryMessageId?: number | undefined;
}

export interface TelegramScoreboard {
  directGreens: number;
  galeGreens: number;
  tieGreens: number;
  reds: number;
  lastResetAt?: string | undefined;
}

export interface TelegramState {
  lastSettledRoundId?: string | undefined;
  activeSignal: ActiveSignalState | null;
  offlineNotified?: boolean | undefined;
  consecutiveGreens?: number | undefined;
  scoreboard?: TelegramScoreboard | undefined;
  lastUpdated?: string | undefined;
}

const DEFAULT_PLATFORM_NAME = "ElephantBet";
const DEFAULT_PLATFORM_URL = "https://www.elephantbet.com";
const DEFAULT_TABLE_NAME = "Bac Bo Live";

let cachedConfig: TelegramConfig | null = null;
let cachedState: TelegramState | null = null;
let isProcessing = false;

/** Calcula estatísticas consolidadas do placar. */
export function calculateScoreboardStats(scoreboard?: TelegramScoreboard) {
  const direct = scoreboard?.directGreens ?? 0;
  const gale = scoreboard?.galeGreens ?? 0;
  const ties = scoreboard?.tieGreens ?? 0;
  const greens = direct + gale;
  const reds = scoreboard?.reds ?? 0;
  const totalWins = greens + ties;
  const total = totalWins + reds;
  const rate = total > 0 ? ((totalWins / total) * 100).toFixed(1) : "100.0";

  return { direct, gale, ties, greens, totalWins, reds, total, rate };
}

/** Linha compacta de placar para entradas ou alertas. */
export function formatScoreboardLine(scoreboard?: TelegramScoreboard): string {
  const stats = calculateScoreboardStats(scoreboard);
  if (stats.total === 0) {
    return "📊 <b>Placar:</b> 0 ✅ | 0 🟡 | 0 ❌";
  }
  return `📊 <b>Placar:</b> ${stats.greens} ✅ | ${stats.ties} 🟡 | ${stats.reds} ❌ (${stats.rate}%)`;
}

/** Bloco organizado de placar para mensagens de resultado. */
export function formatScoreboardBlock(scoreboard?: TelegramScoreboard): string {
  const stats = calculateScoreboardStats(scoreboard);
  if (stats.total === 0) return "";

  const breakdown = stats.gale > 0 ? ` (${stats.direct} direto • ${stats.gale} G1)` : "";

  return [
    `📊 <b>Placar:</b> ${stats.greens} ✅${breakdown} | ${stats.ties} 🟡 | ${stats.reds} ❌`,
    `📈 <b>Assertividade:</b> ${stats.rate}%`,
  ].join("\n");
}

/** Lê a configuração do Telegram salva no storage ou nas variáveis de ambiente. */
export async function readTelegramConfig(admin: Admin): Promise<TelegramConfig | null> {
  if (cachedConfig) return cachedConfig;

  try {
    const { data } = await admin.storage.from(CONFIG_BUCKET).download(TELEGRAM_CONFIG_PATH);
    if (data) {
      const parsed = JSON.parse(await data.text()) as Partial<TelegramConfig>;
      if (parsed.botToken && parsed.chatId) {
        cachedConfig = {
          enabled: parsed.enabled ?? true,
          botToken: parsed.botToken.trim(),
          chatId: parsed.chatId.trim(),
          platformName: parsed.platformName?.trim() || DEFAULT_PLATFORM_NAME,
          platformUrl: parsed.platformUrl?.trim() || DEFAULT_PLATFORM_URL,
          tableName: parsed.tableName?.trim() || DEFAULT_TABLE_NAME,
        };
        return cachedConfig;
      }
    }
  } catch {
    /* ignore storage error and check env */
  }

  const envToken = process.env["TELEGRAM_BOT_TOKEN"];
  const envChatId = process.env["TELEGRAM_CHAT_ID"];
  if (envToken && envChatId) {
    cachedConfig = {
      enabled: process.env["TELEGRAM_ENABLED"] !== "false",
      botToken: envToken.trim(),
      chatId: envChatId.trim(),
      platformName: process.env["PLATFORM_NAME"] || DEFAULT_PLATFORM_NAME,
      platformUrl: process.env["PLATFORM_URL"] || DEFAULT_PLATFORM_URL,
      tableName: DEFAULT_TABLE_NAME,
    };
    return cachedConfig;
  }

  return null;
}

/** Salva a configuração do Telegram no storage. */
export async function saveTelegramConfig(admin: Admin, config: TelegramConfig): Promise<void> {
  await admin.storage.createBucket(CONFIG_BUCKET, { public: false }).catch(() => undefined);
  const normalized: TelegramConfig = {
    enabled: config.enabled,
    botToken: config.botToken.trim(),
    chatId: config.chatId.trim(),
    platformName: config.platformName?.trim() || DEFAULT_PLATFORM_NAME,
    platformUrl: config.platformUrl?.trim() || DEFAULT_PLATFORM_URL,
    tableName: config.tableName?.trim() || DEFAULT_TABLE_NAME,
  };
  const { error } = await admin.storage
    .from(CONFIG_BUCKET)
    .upload(
      TELEGRAM_CONFIG_PATH,
      new Blob([JSON.stringify(normalized)], { type: "application/json" }),
      {
        upsert: true,
      },
    );
  if (error) throw new Error(`storage:${error.message}`);
  cachedConfig = normalized;
}

/** Lê o estado atual de envio de sinais do Telegram. */
export async function readTelegramState(admin: Admin): Promise<TelegramState> {
  if (cachedState) return cachedState;

  try {
    const { data } = await admin.storage.from(CONFIG_BUCKET).download(TELEGRAM_STATE_PATH);
    if (data) {
      const parsed = JSON.parse(await data.text()) as Partial<TelegramState>;
      cachedState = {
        lastSettledRoundId: parsed.lastSettledRoundId,
        activeSignal: parsed.activeSignal ?? null,
        offlineNotified: parsed.offlineNotified ?? false,
        consecutiveGreens:
          typeof parsed.consecutiveGreens === "number" ? parsed.consecutiveGreens : 0,
        scoreboard: parsed.scoreboard ?? {
          directGreens: 0,
          galeGreens: 0,
          tieGreens: 0,
          reds: 0,
        },
        lastUpdated: parsed.lastUpdated,
      };
      return cachedState;
    }
  } catch {
    /* fallback to clean state */
  }

  cachedState = {
    lastSettledRoundId: undefined,
    activeSignal: null,
    offlineNotified: false,
    consecutiveGreens: 0,
    scoreboard: {
      directGreens: 0,
      galeGreens: 0,
      tieGreens: 0,
      reds: 0,
    },
  };
  return cachedState;
}

/** Salva o estado atual de envio de sinais. */
export async function saveTelegramState(admin: Admin, state: TelegramState): Promise<void> {
  cachedState = { ...state, lastUpdated: new Date().toISOString() };
  try {
    await admin.storage.createBucket(CONFIG_BUCKET, { public: false }).catch(() => undefined);
    await admin.storage
      .from(CONFIG_BUCKET)
      .upload(
        TELEGRAM_STATE_PATH,
        new Blob([JSON.stringify(cachedState)], { type: "application/json" }),
        {
          upsert: true,
        },
      );
  } catch (e) {
    console.error("Failed to persist telegram state to storage", e);
  }
}

/** Reseta o placar do Telegram mantendo as demais configurações e estado. */
export async function resetTelegramScoreboard(admin: Admin): Promise<TelegramScoreboard> {
  const state = await readTelegramState(admin);
  const empty: TelegramScoreboard = {
    directGreens: 0,
    galeGreens: 0,
    tieGreens: 0,
    reds: 0,
    lastResetAt: new Date().toISOString(),
  };
  state.scoreboard = empty;
  state.consecutiveGreens = 0;
  await saveTelegramState(admin, state);
  return empty;
}

interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/** Executa uma chamada à API HTTP do Telegram Bot. */
export async function callTelegramApi<T = unknown>(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResponse<T>> {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({
    ok: false,
    description: `HTTP ${res.status}: ${res.statusText}`,
  }))) as TelegramApiResponse<T>;

  return data;
}

/** Formata texto de lado com emoji. */
export function formatSide(side: Side) {
  if (side === "player") {
    return {
      name: "PLAYER",
      emoji: "🔵",
      badge: "AZUL",
    };
  }
  return {
    name: "BANKER",
    emoji: "🔴",
    badge: "VERMELHO",
  };
}

/** Formata mensagem de entrada confirmada com emotes, placar e chamada curta. */
export function formatEntryMessage(
  signal: { side: Side; pattern: string; confidence: number },
  config: TelegramConfig,
  scoreboard?: TelegramScoreboard,
): string {
  const s = formatSide(signal.side);
  const table = config.tableName || DEFAULT_TABLE_NAME;
  const platform = config.platformName || DEFAULT_PLATFORM_NAME;
  const url = config.platformUrl || DEFAULT_PLATFORM_URL;
  const scoreLine = scoreboard ? formatScoreboardLine(scoreboard) : "";

  const lines = [
    `🚨 <b>ENTRADA CONFIRMADA</b>`,
    ``,
    `🎲 <b>Mesa:</b> ${table}`,
    `🎰 <b>Casa:</b> <a href="${url}">${platform}</a>`,
    `🎯 <b>Entrada:</b> ${s.emoji} <b>${s.name}</b>`,
    `🟡 <b>Proteção:</b> Empate`,
    `⚡ <b>Gale:</b> Até G1`,
  ];

  if (scoreLine) {
    lines.push(scoreLine);
  }

  lines.push(
    ``,
    `🚀 <i>Bora forrar! Bate a meta e sai!</i>`,
    `🔗 <a href="${url}">👉 <b>CLIQUE PARA ENTRAR</b></a>`,
  );

  return lines.join("\n");
}

/** Formata mensagem de Gale 1 (G1) com alerta de gestão. */
export function formatGaleMessage(side: Side, config: TelegramConfig): string {
  const s = formatSide(side);
  const table = config.tableName || DEFAULT_TABLE_NAME;

  return [
    `⚠️ <b>ATENÇÃO: VAMOS PARA O G1!</b>`,
    ``,
    `🎲 <b>Mesa:</b> ${table}`,
    `🎯 <b>Entrada:</b> ${s.emoji} <b>${s.name}</b>`,
    `🟡 <b>Proteção:</b> Empate`,
    `⚡ <b>Aposta:</b> Dobrar entrada (gestão)`,
    ``,
    `💰 <i>Foco na gestão! Vamos buscar o green!</i>`,
  ].join("\n");
}

export type ResultType = "direct_green" | "gale_green" | "tie_green" | "red";

/** Formata mensagem de resultado com placar atualizado, sequência e conselho rápido. */
export function formatResultMessage(
  type: ResultType,
  side: Side,
  config: TelegramConfig,
  streak = 0,
  scoreboard?: TelegramScoreboard,
): string {
  const s = formatSide(side);
  const streakText = streak >= 2 ? `\n🔥 <b>${streak} GREENS SEGUIDOS!</b>` : "";
  const scoreBlock = scoreboard ? `\n\n${formatScoreboardBlock(scoreboard)}` : "";

  if (type === "tie_green") {
    return [
      `🟡 <b>EMPATE PAGO!</b> 🤑`,
      `🎯 Proteção no Empate bateu!${streakText}${scoreBlock}`,
      ``,
      `💰 <i>Multiplicador na conta! Bora forrar!</i>`,
    ].join("\n");
  }

  if (type === "direct_green") {
    return [
      `✅ <b>GREEN DE PRIMEIRA!</b> 🤑`,
      `🎯 Pagou no ${s.emoji} <b>${s.name}</b>!${streakText}${scoreBlock}`,
      ``,
      `💰 <i>Lucro no bolso! Bate a meta e sai!</i>`,
    ].join("\n");
  }

  if (type === "gale_green") {
    return [
      `✅ <b>GREEN NO G1!</b> 🤑`,
      `🎯 Pagou no ${s.emoji} <b>${s.name}</b>!${streakText}${scoreBlock}`,
      ``,
      `🚀 <i>Recuperado com lucro! Bora pra cima!</i>`,
    ].join("\n");
  }

  return [
    `❌ <b>RED!</b>`,
    `🛑 Stop da rodada respeitado.${scoreBlock}`,
    ``,
    `🎯 <i>Gestão ativada. Calma que recuperamos!</i>`,
  ].join("\n");
}

/** Formata alerta de mesa desconectada ou pausada. */
export function formatOfflineAlert(config: TelegramConfig): string {
  const table = config.tableName || DEFAULT_TABLE_NAME;
  const platform = config.platformName || DEFAULT_PLATFORM_NAME;

  return [
    `⚠️ <b>MESA INDISPONÍVEL</b>`,
    `📡 ${table} sem sinal na ${platform}.`,
    `⏸️ Sinais em pausa por segurança.`,
    ``,
    `🛑 <i>Proteja sua banca! Aguarde a reconexão.</i>`,
  ].join("\n");
}

/** Formata aviso de mesa reconectada. */
export function formatOnlineAlert(config: TelegramConfig): string {
  const table = config.tableName || DEFAULT_TABLE_NAME;
  const platform = config.platformName || DEFAULT_PLATFORM_NAME;

  return [
    `🟢 <b>MESA ONLINE</b>`,
    `📡 ${table} conectada na ${platform}.`,
    `🎲 Análise de sinais ativa!`,
    ``,
    `🚀 <i>Bora forrar! Preparem as bancas!</i>`,
  ].join("\n");
}

/** Testa o bot do Telegram enviando getMe e uma mensagem no chat de destino. */
export async function testTelegramBot(
  botToken: string,
  chatId: string,
  platformName?: string,
  platformUrl?: string,
): Promise<{
  ok: boolean;
  botUsername?: string | undefined;
  botName?: string | undefined;
  error?: string | undefined;
}> {
  try {
    const me = await callTelegramApi<{ username?: string; first_name?: string }>(
      botToken,
      "getMe",
      {},
    );
    if (!me.ok || !me.result) {
      return {
        ok: false,
        error: `Token inválido ou recusado pelo Telegram: ${me.description || "Erro desconhecido"}`,
      };
    }

    const testPlatform = platformName || DEFAULT_PLATFORM_NAME;
    const testUrl = platformUrl || DEFAULT_PLATFORM_URL;
    const testText = [
      `🤖 <b>TESTE DE CONEXÃO — BAC BO LIVE</b> 🎲`,
      ``,
      `✅ <b>Bot conectado:</b> @${me.result.username || me.result.first_name}`,
      `🎰 <b>Plataforma:</b> ${testPlatform}`,
      ``,
      `Este canal/grupo está pronto para receber os sinais automatizados com placar em tempo real!`,
    ].join("\n");

    const sendRes = await callTelegramApi<{ message_id: number }>(botToken, "sendMessage", {
      chat_id: chatId,
      text: testText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: `🎲 Abrir ${testPlatform}`, url: testUrl }]],
      },
    });

    if (!sendRes.ok) {
      return {
        ok: false,
        botUsername: me.result.username,
        botName: me.result.first_name,
        error: `Bot autenticado, mas não conseguiu enviar mensagem no chat: ${sendRes.description}. Verifique se o bot foi adicionado como administrador do canal/grupo com permissão de postar mensagens.`,
      };
    }

    return {
      ok: true,
      botUsername: me.result.username,
      botName: me.result.first_name,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Envia mensagem para o Telegram com botão inline opcional da plataforma. */
async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
  includeButton = true,
): Promise<number | undefined> {
  const reply_markup =
    includeButton && config.platformUrl
      ? {
          inline_keyboard: [
            [
              {
                text: `🎲 Apostar no ${config.platformName || DEFAULT_PLATFORM_NAME}`,
                url: config.platformUrl,
              },
            ],
          ],
        }
      : undefined;

  const res = await callTelegramApi<{ message_id: number }>(config.botToken, "sendMessage", {
    chat_id: config.chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    ...(reply_markup ? { reply_markup } : {}),
  });

  if (!res.ok) {
    console.error("Telegram sendMessage failed:", res.description);
  }
  return res.result?.message_id;
}

/**
 * Processa as rodadas mais recentes e despacha os sinais e resultados no Telegram.
 * Executado no servidor durante a sincronização da mesa ao vivo.
 */
export async function processTelegramSignals(
  admin: Admin,
  rounds: LiveRound[],
  isOfflineOrPaused: boolean,
): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const config = await readTelegramConfig(admin);
    if (!config || !config.enabled || !config.botToken || !config.chatId) {
      return;
    }

    const state = await readTelegramState(admin);
    state.scoreboard = state.scoreboard ?? {
      directGreens: 0,
      galeGreens: 0,
      tieGreens: 0,
      reds: 0,
    };

    // Gestão de mesa fora do ar / desconectada
    if (isOfflineOrPaused) {
      if (!state.offlineNotified) {
        await sendTelegramMessage(config, formatOfflineAlert(config), false);
        state.offlineNotified = true;
        await saveTelegramState(admin, state);
      }
      return;
    }

    // Se estava marcado como offline e agora voltou a funcionar
    if (state.offlineNotified) {
      await sendTelegramMessage(config, formatOnlineAlert(config), true);
      state.offlineNotified = false;
      await saveTelegramState(admin, state);
    }

    if (rounds.length < 5) return;

    // Ordena do mais antigo para o mais recente
    const sorted = [...rounds].sort((a, b) => a.settledAt - b.settledAt);
    const lastRound = sorted[sorted.length - 1];
    if (!lastRound) return;

    // Se não há novas rodadas desde a última verificação
    if (state.lastSettledRoundId === lastRound.id) {
      return;
    }

    // Se existe um sinal ativo aguardando resultado
    if (state.activeSignal) {
      const active = state.activeSignal;

      if (active.stage === "entry") {
        // A rodada `lastRound` é o resultado da entrada
        const isTie = lastRound.outcome === "T";
        const won = isTie || isGreen(active.side, lastRound.outcome);

        if (isTie) {
          // Empate: vitória com emote amarelo e multiplicador
          state.consecutiveGreens = (state.consecutiveGreens ?? 0) + 1;
          state.scoreboard.tieGreens += 1;
          await sendTelegramMessage(
            config,
            formatResultMessage(
              "tie_green",
              active.side,
              config,
              state.consecutiveGreens,
              state.scoreboard,
            ),
          );
          state.activeSignal = null;
        } else if (won) {
          // Green direto
          state.consecutiveGreens = (state.consecutiveGreens ?? 0) + 1;
          state.scoreboard.directGreens += 1;
          await sendTelegramMessage(
            config,
            formatResultMessage(
              "direct_green",
              active.side,
              config,
              state.consecutiveGreens,
              state.scoreboard,
            ),
          );
          state.activeSignal = null;
        } else {
          // Entrada direta não bateu -> Entra em G1 (Gale 1)
          await sendTelegramMessage(config, formatGaleMessage(active.side, config));
          active.stage = "gale";
          active.galeRoundId = lastRound.id;
        }
      } else if (active.stage === "gale") {
        // A rodada `lastRound` é o resultado do Gale 1
        const isTie = lastRound.outcome === "T";
        const won = isTie || isGreen(active.side, lastRound.outcome);

        if (isTie) {
          // Empate no G1: vitória com proteção
          state.consecutiveGreens = (state.consecutiveGreens ?? 0) + 1;
          state.scoreboard.tieGreens += 1;
          await sendTelegramMessage(
            config,
            formatResultMessage(
              "tie_green",
              active.side,
              config,
              state.consecutiveGreens,
              state.scoreboard,
            ),
          );
          state.activeSignal = null;
        } else if (won) {
          // Green no G1
          state.consecutiveGreens = (state.consecutiveGreens ?? 0) + 1;
          state.scoreboard.galeGreens += 1;
          await sendTelegramMessage(
            config,
            formatResultMessage(
              "gale_green",
              active.side,
              config,
              state.consecutiveGreens,
              state.scoreboard,
            ),
          );
          state.activeSignal = null;
        } else {
          // Perdeu no G1 -> RED (zera sequência de greens)
          state.consecutiveGreens = 0;
          state.scoreboard.reds += 1;
          await sendTelegramMessage(
            config,
            formatResultMessage("red", active.side, config, 0, state.scoreboard),
          );
          state.activeSignal = null;
        }
      }
    }

    // Se após resolver o resultado não há sinal ativo, analisa se a última rodada formou um novo sinal
    if (!state.activeSignal) {
      const decision = decisionAfter(sorted, sorted.length - 1, {
        startedAt: 0,
        minConfidence: 60,
      });

      if (decision.kind === "entry") {
        const entryMsg = formatEntryMessage(
          {
            side: decision.signal.side,
            pattern: decision.signal.pattern,
            confidence: decision.signal.confidence,
          },
          config,
          state.scoreboard,
        );

        const msgId = await sendTelegramMessage(config, entryMsg, true);

        state.activeSignal = {
          key: lastRound.id,
          side: decision.signal.side,
          pattern: decision.signal.pattern,
          confidence: decision.signal.confidence,
          stage: "entry",
          entryRoundId: lastRound.id,
          entryMessageId: msgId,
        };
      }
    }

    state.lastSettledRoundId = lastRound.id;
    await saveTelegramState(admin, state);
  } catch (err) {
    console.error("Error in processTelegramSignals:", err);
  } finally {
    isProcessing = false;
  }
}
