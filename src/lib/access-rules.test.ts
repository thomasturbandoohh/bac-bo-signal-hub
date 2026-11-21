import { describe, expect, it } from "vitest";
import {
  deleteAccountProblem,
  liveFeedEnabled,
  parseFeedKeyInput,
  robotActive,
} from "./access-rules";

const facts = { callerId: "a", callerIsAdmin: true, targetId: "b", targetIsAdmin: false };

describe("account deletion rules", () => {
  it("only an admin may delete accounts", () => {
    expect(deleteAccountProblem({ ...facts, callerIsAdmin: false })).toBe(
      "Apenas o administrador pode excluir cadastros.",
    );
  });
  it("an admin cannot delete their own account", () => {
    expect(deleteAccountProblem({ ...facts, targetId: "a" })).toBe(
      "Você não pode excluir a própria conta.",
    );
  });
  it("admin accounts cannot be deleted", () => {
    expect(deleteAccountProblem({ ...facts, targetIsAdmin: true })).toBe(
      "Contas de administrador não podem ser excluídas.",
    );
  });
  it("an admin may delete a regular account", () => {
    expect(deleteAccountProblem(facts)).toBeNull();
  });
});

describe("live table key form", () => {
  it("trims the key and keeps a known provider", () => {
    expect(parseFeedKeyInput({ key: "  abcdefgh  ", provider: "lynxmetrics" })).toEqual({
      key: "abcdefgh",
      provider: "lynxmetrics",
    });
  });
  it("rejects keys shorter than 8 or longer than 500 characters", () => {
    expect(() => parseFeedKeyInput({ key: "1234567" })).toThrow("Chave inválida.");
    expect(() => parseFeedKeyInput({ key: "x".repeat(501) })).toThrow("Chave inválida.");
    expect(() => parseFeedKeyInput(null)).toThrow("Chave inválida.");
  });
  it("falls back to the default provider for unknown values", () => {
    expect(parseFeedKeyInput({ key: "abcdefgh", provider: "other" }).provider).toBe("lynxmetrics");
  });
});

describe("global live table pause", () => {
  const on = { loaded: true, running: true, maintenance: false, apiPaused: false };
  it("a paused feed stops every client from calling the live table", () => {
    expect(liveFeedEnabled({ ...on, apiPaused: true })).toBe(false);
    expect(liveFeedEnabled(on)).toBe(true);
  });
  it("no call before the shared settings have loaded", () => {
    expect(liveFeedEnabled({ ...on, loaded: false })).toBe(false);
  });
  it("the robot is active only when running, not in maintenance and not paused", () => {
    expect(robotActive(on)).toBe(true);
    expect(robotActive({ ...on, apiPaused: true })).toBe(false);
    expect(robotActive({ ...on, maintenance: true })).toBe(false);
    expect(robotActive({ ...on, running: false })).toBe(false);
  });
});
