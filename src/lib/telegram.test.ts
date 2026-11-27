import { describe, expect, it } from "vitest";
import {
  calculateScoreboardStats,
  formatEntryMessage,
  formatGaleMessage,
  formatOfflineAlert,
  formatOnlineAlert,
  formatResultMessage,
  formatScoreboardBlock,
  formatScoreboardLine,
  formatSide,
  type TelegramConfig,
  type TelegramScoreboard,
} from "./telegram.server";

const mockConfig: TelegramConfig = {
  enabled: true,
  botToken: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  chatId: "-1001234567890",
  platformName: "ElephantBet",
  platformUrl: "https://www.elephantbet.com",
  tableName: "Bac Bo Live",
};

const sampleScoreboard: TelegramScoreboard = {
  directGreens: 10,
  galeGreens: 4,
  tieGreens: 2,
  reds: 1,
};

describe("telegram scoreboard calculations", () => {
  it("calculates totals and win rate accurately", () => {
    const stats = calculateScoreboardStats(sampleScoreboard);
    expect(stats.direct).toBe(10);
    expect(stats.gale).toBe(4);
    expect(stats.greens).toBe(14);
    expect(stats.ties).toBe(2);
    expect(stats.totalWins).toBe(16);
    expect(stats.reds).toBe(1);
    expect(stats.total).toBe(17);
    // (16 / 17) * 100 = 94.117... -> 94.1%
    expect(stats.rate).toBe("94.1");
  });

  it("handles empty scoreboard gracefully", () => {
    const stats = calculateScoreboardStats(undefined);
    expect(stats.total).toBe(0);
    expect(stats.rate).toBe("100.0");

    const line = formatScoreboardLine(undefined);
    expect(line).toContain("0 ✅ | 0 🟡 | 0 ❌");

    const block = formatScoreboardBlock(undefined);
    expect(block).toBe("");
  });

  it("formats compact scoreboard line correctly", () => {
    const line = formatScoreboardLine(sampleScoreboard);
    expect(line).toContain("📊 <b>Placar:</b> 14 ✅ | 2 🟡 | 1 ❌ (94.1%)");
  });

  it("formats detailed scoreboard block with breakdown correctly", () => {
    const block = formatScoreboardBlock(sampleScoreboard);
    expect(block).toContain("📊 <b>Placar:</b> 14 ✅ (10 direto • 4 G1) | 2 🟡 | 1 ❌");
    expect(block).toContain("📈 <b>Assertividade:</b> 94.1%");
  });
});

describe("telegram signal formatting", () => {
  it("formats side with emoji correctly", () => {
    const player = formatSide("player");
    expect(player.name).toBe("PLAYER");
    expect(player.emoji).toBe("🔵");

    const banker = formatSide("banker");
    expect(banker.name).toBe("BANKER");
    expect(banker.emoji).toBe("🔴");
  });

  it("formats entry message with required emojis, platform, link, scoreboard and callout", () => {
    const msg = formatEntryMessage(
      {
        side: "player",
        pattern: "Alternância 3x",
        confidence: 85,
      },
      mockConfig,
      sampleScoreboard,
    );

    expect(msg).toContain("🚨 <b>ENTRADA CONFIRMADA</b>");
    expect(msg).toContain("Bac Bo Live");
    expect(msg).toContain("ElephantBet");
    expect(msg).toContain("https://www.elephantbet.com");
    expect(msg).toContain("🔵");
    expect(msg).toContain("PLAYER");
    expect(msg).toContain("🟡");
    expect(msg).toContain("Empate");
    expect(msg).toContain("G1");
    expect(msg).toContain("📊 <b>Placar:</b> 14 ✅ | 2 🟡 | 1 ❌ (94.1%)");
    expect(msg).toContain("Bora forrar! Bate a meta e sai!");
  });

  it("formats Gale 1 (G1) message with attention emoji and management callout", () => {
    const msg = formatGaleMessage("banker", mockConfig);
    expect(msg).toContain("⚠️ <b>ATENÇÃO: VAMOS PARA O G1!</b>");
    expect(msg).toContain("🔴");
    expect(msg).toContain("BANKER");
    expect(msg).toContain("🟡");
    expect(msg).toContain("Empate");
    expect(msg).toContain("Foco na gestão! Vamos buscar o green!");
  });

  it("formats Direct Green message with streak, scoreboard and motivational callout", () => {
    const msg = formatResultMessage("direct_green", "player", mockConfig, 2, sampleScoreboard);
    expect(msg).toContain("✅ <b>GREEN DE PRIMEIRA!</b>");
    expect(msg).toContain("🔵");
    expect(msg).toContain("PLAYER");
    expect(msg).toContain("🔥 <b>2 GREENS SEGUIDOS!</b>");
    expect(msg).toContain("📊 <b>Placar:</b> 14 ✅ (10 direto • 4 G1) | 2 🟡 | 1 ❌");
    expect(msg).toContain("📈 <b>Assertividade:</b> 94.1%");
    expect(msg).toContain("Lucro no bolso! Bate a meta e sai!");
  });

  it("formats Gale 1 Green message with streak, scoreboard and comeback callout", () => {
    const msg = formatResultMessage("gale_green", "banker", mockConfig, 3, sampleScoreboard);
    expect(msg).toContain("✅ <b>GREEN NO G1!</b>");
    expect(msg).toContain("🔴");
    expect(msg).toContain("BANKER");
    expect(msg).toContain("🔥 <b>3 GREENS SEGUIDOS!</b>");
    expect(msg).toContain("Recuperado com lucro! Bora pra cima!");
  });

  it("formats Tie as WIN with yellow emote, scoreboard and multiplier callout", () => {
    const msg = formatResultMessage("tie_green", "player", mockConfig, 4, sampleScoreboard);
    expect(msg).toContain("🟡 <b>EMPATE PAGO!</b>");
    expect(msg).toContain("Proteção no Empate bateu!");
    expect(msg).toContain("🔥 <b>4 GREENS SEGUIDOS!</b>");
    expect(msg.toLowerCase()).not.toContain("conta como win");
    expect(msg).toContain("Multiplicador na conta! Bora forrar!");
  });

  it("formats RED message with discipline advice and updated scoreboard", () => {
    const msg = formatResultMessage("red", "player", mockConfig, 0, sampleScoreboard);
    expect(msg).toContain("❌ <b>RED!</b>");
    expect(msg).toContain("Stop da rodada respeitado.");
    expect(msg).toContain("📊 <b>Placar:</b> 14 ✅ (10 direto • 4 G1) | 2 🟡 | 1 ❌");
    expect(msg).toContain("Gestão ativada. Calma que recuperamos!");
  });

  it("formats offline and online alerts with clean layout and callouts", () => {
    const offline = formatOfflineAlert(mockConfig);
    expect(offline).toContain("⚠️ <b>MESA INDISPONÍVEL</b>");
    expect(offline).toContain("ElephantBet");
    expect(offline).toContain("Proteja sua banca! Aguarde a reconexão.");

    const online = formatOnlineAlert(mockConfig);
    expect(online).toContain("🟢 <b>MESA ONLINE</b>");
    expect(online).toContain("ElephantBet");
    expect(online).toContain("Bora forrar! Preparem as bancas!");
  });
});
