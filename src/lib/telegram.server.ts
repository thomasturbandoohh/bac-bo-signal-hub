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

export interface TelegramState {
  lastSettledRoundId?: string | undefined;
  activeSignal: ActiveSignalState | null;
  offlineNotified?: boolean | undefined;
  lastUpdated?: string | undefined;
}

const DEFAULT_PLATFORM_NAME = "ElephantBet";
const DEFAULT_PLATFORM_URL = "https://www.elephantbet.com";
const DEFAULT_TABLE_NAME = "Bac Bo Live";

let cachedConfig: TelegramConfig | null = null;
let cachedState: TelegramState | null = null;
let isProcessing = false;

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
      name: "PLAYER (Azul)",
      emoji: "🔵",
      badge: "AZUL",
    };
  }
  return {
    name: "BANKER (Vermelho)",
    emoji: "🔴",
    badge: "VERMELHO",
  };
}

/** Formata mensagem de entrada confirmada com emotes. */
export function formatEntryMessage(
  signal: { side: Side; pattern: string; confidence: number },
  config: TelegramConfig,
): string {
  const s = formatSide(signal.side);
  const table = config.tableName || DEFAULT_TABLE_NAME;
  const platform = config.platformName || DEFAULT_PLATFORM_NAME;
  const url = config.platformUrl || DEFAULT_PLATFORM_URL;

  return [
    `🚨 <b>ENTRADA CONFIRMADA!</b> 🚨`,
    ``,
    `🎲 <b>Mesa:</b> ${table}`,
    `🎰 <b>Plataforma:</b> <a href="${url}">${platform}</a>`,
    ``,
    `🎯 <b>Apostar em:</b> ${s.emoji} <b>${s.name}</b>`,
    `🟡 <b>Cobrir o EMPATE (TIE) com proteção</b>`,
    `⚡ <b>Até 1 Martingale (G1)</b>`,
    ``,
    `📊 <b>Assertividade estimada:</b> ${signal.confidence}%`,
    `🧠 <b>Padrão analisado:</b> <i>${signal.pattern}</i>`,
    ``,
    `⚠️ <i>Gestão recomendada: 1% a 2% da banca. Jogue com responsabilidade.</i>`,
    `🔗 <a href="${url}">👉 <b>CLIQUE AQUI PARA ABRIR A MESA</b></a>`,
  ].join("\n");
}

/** Formata mensagem de Gale 1 (G1). */
export function formatGaleMessage(side: Side, config: TelegramConfig): string {
  const s = formatSide(side);
  const table = config.tableName || DEFAULT_TABLE_NAME;

  return [
    `⚠️ <b>ATENÇÃO: VAMOS PARA O GALE 1 (G1)</b> ⚠️`,
    ``,
    `🎲 <b>Mesa:</b> ${table}`,
    `🎯 <b>Manter entrada no:</b> ${s.emoji} <b>${s.name}</b>`,
    `🟡 <b>Reforçar proteção no EMPATE</b>`,
    ``,
    `⚡ <i>Primeira tentativa não bateu. Entrando no G1 agora!</i>`,
  ].join("\n");
}

export type ResultType = "direct_green" | "gale_green" | "tie_green" | "red";

/** Formata mensagem de resultado (Green Direto, Green G1, Empate ou Red). */
export function formatResultMessage(type: ResultType, side: Side, config: TelegramConfig): string {
  const s = formatSide(side);
  const table = config.tableName || DEFAULT_TABLE_NAME;
  const platform = config.platformName || DEFAULT_PLATFORM_NAME;

  if (type === "tie_green") {
    return [
      `🟡🟡🟡 <b>EMPATE / TIE — GREEN!</b> 🟡🟡🟡`,
      ``,
      `🎯 <b>A proteção no empate pagou com multiplicação!</b>`,
      `🎲 <b>Mesa:</b> ${table}`,
      `🎰 <b>Plataforma:</b> ${platform}`,
      `💰 <b>Resultado:</b> 🟡 <b>EMPATE</b> (Conta como WIN!)`,
      ``,
      `✅ <i>Vitória confirmada! Excelente cobertura.</i>`,
    ].join("\n");
  }

  if (type === "direct_green") {
    return [
      `✅✅✅ <b>GREEN DIRETO!</b> ✅✅✅`,
      ``,
      `🎯 <b>Vitória certeira de primeira!</b>`,
      `🎲 <b>Mesa:</b> ${table}`,
      `🎰 <b>Plataforma:</b> ${platform}`,
      `💰 <b>Entrada vencedora:</b> ${s.emoji} ${s.name}`,
      ``,
      `🚀 <i>Análise precisa do robô. Parabéns a quem pegou!</i>`,
    ].join("\n");
  }

  if (type === "gale_green") {
    return [
      `✅✅ <b>GREEN NO G1!</b> ✅✅`,
      ``,
      `🎯 <b>Vitória confirmada no Gale 1!</b>`,
      `🎲 <b>Mesa:</b> ${table}`,
      `🎰 <b>Plataforma:</b> ${platform}`,
      `💰 <b>Entrada vencedora:</b> ${s.emoji} ${s.name}`,
      ``,
      `📈 <i>Recuperação com lucro concluída no G1!</i>`,
    ].join("\n");
  }

  return [
    `❌ <b>RED</b> ❌`,
    ``,
    `🎲 <b>Mesa:</b> ${table}`,
    `🎰 <b>Plataforma:</b> ${platform}`,
    `⚠️ <b>Ciclo finalizado no G1.</b>`,
    ``,
    `🛡️ <i>Respeite rigorosamente a gestão de banca (Stop Loss). Aguardando o próximo padrão com alta confluência!</i>`,
  ].join("\n");
}

/** Formata alerta de mesa desconectada ou pausada. */
export function formatOfflineAlert(config: TelegramConfig): string {
  const table = config.tableName || DEFAULT_TABLE_NAME;
  const platform = config.platformName || DEFAULT_PLATFORM_NAME;

  return [
    `⚠️ <b>ATENÇÃO: MESA PAUSADA / FORA DO AR</b> ⚠️`,
    ``,
    `🎲 <b>Mesa:</b> ${table}`,
    `🎰 <b>Plataforma:</b> ${platform}`,
    ``,
    `A leitura ao vivo da mesa ou a API da plataforma não está ligada no momento.`,
    `Os sinais automáticos estão pausados até o retorno da conexão normalizada.`,
  ].join("\n");
}

/** Formata aviso de mesa reconectada. */
export function formatOnlineAlert(config: TelegramConfig): string {
  const table = config.tableName || DEFAULT_TABLE_NAME;
  const platform = config.platformName || DEFAULT_PLATFORM_NAME;

  return [
    `🟢 <b>MESA CONECTADA E OPERACIONAL!</b> 🟢`,
    ``,
    `🎲 <b>Mesa:</b> ${table}`,
    `🎰 <b>Plataforma:</b> ${platform}`,
    ``,
    `A transmissão de dados da mesa Bac Bo Live está ativa e operando normalmente.`,
    `O robô está analisando os padrões ao vivo. Fique atento às próximas entradas!`,
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
      `Este canal/grupo está pronto para receber os sinais automatizados em tempo real!`,
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
          // Empate: conta como win e manda emote amarelo de empate
          await sendTelegramMessage(config, formatResultMessage("tie_green", active.side, config));
          state.activeSignal = null;
        } else if (won) {
          // Green direto
          await sendTelegramMessage(
            config,
            formatResultMessage("direct_green", active.side, config),
          );
          state.activeSignal = null;
        } else {
          // Entrada direta perdeu -> Entra em G1 (Gale 1)
          await sendTelegramMessage(config, formatGaleMessage(active.side, config));
          active.stage = "gale";
          active.galeRoundId = lastRound.id;
        }
      } else if (active.stage === "gale") {
        // A rodada `lastRound` é o resultado do Gale 1
        const isTie = lastRound.outcome === "T";
        const won = isTie || isGreen(active.side, lastRound.outcome);

        if (isTie) {
          // Empate no G1: conta como win
          await sendTelegramMessage(config, formatResultMessage("tie_green", active.side, config));
          state.activeSignal = null;
        } else if (won) {
          // Green no G1
          await sendTelegramMessage(config, formatResultMessage("gale_green", active.side, config));
          state.activeSignal = null;
        } else {
          // Perdeu no G1 -> RED
          await sendTelegramMessage(config, formatResultMessage("red", active.side, config));
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
