import { describe, expect, it } from "vitest";
import {
  formatEntryMessage,
  formatGaleMessage,
  formatOfflineAlert,
  formatOnlineAlert,
  formatResultMessage,
  formatSide,
  type TelegramConfig,
} from "./telegram.server";

const mockConfig: TelegramConfig = {
  enabled: true,
  botToken: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  chatId: "-1001234567890",
  platformName: "ElephantBet",
  platformUrl: "https://www.elephantbet.com",
  tableName: "Bac Bo Live",
};

describe("telegram signal formatting", () => {
  it("formats side with emoji correctly", () => {
    const player = formatSide("player");
    expect(player.name).toBe("PLAYER");
    expect(player.emoji).toBe("🔵");

    const banker = formatSide("banker");
    expect(banker.name).toBe("BANKER");
    expect(banker.emoji).toBe("🔴");
  });

  it("formats entry message with required emojis, platform and link in short format", () => {
    const msg = formatEntryMessage(
      {
        side: "player",
        pattern: "Alternância 3x",
        confidence: 85,
      },
      mockConfig,
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
  });

  it("formats Gale 1 (G1) message with attention emoji", () => {
    const msg = formatGaleMessage("banker", mockConfig);
    expect(msg).toContain("⚠️ <b>ATENÇÃO: VAMOS PARA O G1!</b>");
    expect(msg).toContain("🔴");
    expect(msg).toContain("BANKER");
    expect(msg).toContain("🟡");
    expect(msg).toContain("Empate");
  });

  it("formats Direct Green message without streak and with streak", () => {
    const msg = formatResultMessage("direct_green", "player", mockConfig, 0);
    expect(msg).toContain("✅ <b>GREEN DE PRIMEIRA!</b>");
    expect(msg).toContain("🔵");
    expect(msg).toContain("PLAYER");
    expect(msg).not.toContain("SEGUIDOS");

    const msgStreak = formatResultMessage("direct_green", "player", mockConfig, 2);
    expect(msgStreak).toContain("🔥 <b>2 GREENS SEGUIDOS!</b>");
  });

  it("formats Gale 1 Green message with streak notice", () => {
    const msg = formatResultMessage("gale_green", "banker", mockConfig, 3);
    expect(msg).toContain("✅ <b>GREEN NO G1!</b>");
    expect(msg).toContain("🔴");
    expect(msg).toContain("BANKER");
    expect(msg).toContain("🔥 <b>3 GREENS SEGUIDOS!</b>");
  });

  it("formats Tie as WIN with yellow emote and without conta como win", () => {
    const msg = formatResultMessage("tie_green", "player", mockConfig, 1);
    expect(msg).toContain("🟡 <b>EMPATE PAGO!</b>");
    expect(msg).toContain("Proteção no Empate bateu!");
    expect(msg.toLowerCase()).not.toContain("conta como win");

    const msgStreak = formatResultMessage("tie_green", "player", mockConfig, 4);
    expect(msgStreak).toContain("🔥 <b>4 GREENS SEGUIDOS!</b>");
    expect(msgStreak.toLowerCase()).not.toContain("conta como win");
  });

  it("formats RED message", () => {
    const msg = formatResultMessage("red", "player", mockConfig, 0);
    expect(msg).toContain("❌ <b>RED!</b>");
    expect(msg).toContain("Stop da rodada");
  });

  it("formats offline and online alerts", () => {
    const offline = formatOfflineAlert(mockConfig);
    expect(offline).toContain("⚠️ <b>MESA INDISPONÍVEL</b>");
    expect(offline).toContain("ElephantBet");

    const online = formatOnlineAlert(mockConfig);
    expect(online).toContain("🟢 <b>MESA ONLINE</b>");
    expect(online).toContain("ElephantBet");
  });
});
