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
    expect(player.name).toContain("PLAYER");
    expect(player.emoji).toBe("🔵");

    const banker = formatSide("banker");
    expect(banker.name).toContain("BANKER");
    expect(banker.emoji).toBe("🔴");
  });

  it("formats entry message with required emojis, platform and link", () => {
    const msg = formatEntryMessage(
      {
        side: "player",
        pattern: "Alternância 3x",
        confidence: 85,
      },
      mockConfig,
    );

    expect(msg).toContain("🚨 <b>ENTRADA CONFIRMADA!</b> 🚨");
    expect(msg).toContain("Bac Bo Live");
    expect(msg).toContain("ElephantBet");
    expect(msg).toContain("https://www.elephantbet.com");
    expect(msg).toContain("🔵");
    expect(msg).toContain("PLAYER");
    expect(msg).toContain("🟡");
    expect(msg).toContain("EMPATE (TIE)");
    expect(msg).toContain("G1");
    expect(msg).toContain("85%");
  });

  it("formats Gale 1 (G1) message with attention emoji", () => {
    const msg = formatGaleMessage("banker", mockConfig);
    expect(msg).toContain("⚠️ <b>ATENÇÃO: VAMOS PARA O GALE 1 (G1)</b> ⚠️");
    expect(msg).toContain("🔴");
    expect(msg).toContain("BANKER");
    expect(msg).toContain("🟡");
    expect(msg).toContain("EMPATE");
  });

  it("formats Direct Green message", () => {
    const msg = formatResultMessage("direct_green", "player", mockConfig);
    expect(msg).toContain("✅✅✅ <b>GREEN DIRETO!</b> ✅✅✅");
    expect(msg).toContain("🔵");
    expect(msg).toContain("PLAYER");
  });

  it("formats Gale 1 Green message", () => {
    const msg = formatResultMessage("gale_green", "banker", mockConfig);
    expect(msg).toContain("✅✅ <b>GREEN NO G1!</b> ✅✅");
    expect(msg).toContain("🔴");
    expect(msg).toContain("BANKER");
  });

  it("formats Tie as WIN with yellow emote", () => {
    const msg = formatResultMessage("tie_green", "player", mockConfig);
    expect(msg).toContain("🟡🟡🟡 <b>EMPATE / TIE — GREEN!</b> 🟡🟡🟡");
    expect(msg).toContain("Conta como WIN");
    expect(msg).toContain("Vitória confirmada");
  });

  it("formats RED message with stop loss advice", () => {
    const msg = formatResultMessage("red", "player", mockConfig);
    expect(msg).toContain("❌ <b>RED</b> ❌");
    expect(msg).toContain("Ciclo finalizado no G1");
    expect(msg).toContain("Stop Loss");
  });

  it("formats offline and online alerts", () => {
    const offline = formatOfflineAlert(mockConfig);
    expect(offline).toContain("⚠️ <b>ATENÇÃO: MESA PAUSADA / FORA DO AR</b> ⚠️");
    expect(offline).toContain("ElephantBet");

    const online = formatOnlineAlert(mockConfig);
    expect(online).toContain("🟢 <b>MESA CONECTADA E OPERACIONAL!</b> 🟢");
    expect(online).toContain("ElephantBet");
  });
});
