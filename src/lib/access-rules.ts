/**
 * Pure access and validation rules shared by server functions and the robot provider.
 * No network or database access here, so they can be unit-tested; the server still
 * reads the facts (has_role, auth claims) before calling them, and RLS stays the last line.
 */
import { isProviderId, type ProviderId } from "./providers";

export interface DeleteAccountFacts {
  callerId: string;
  callerIsAdmin: boolean;
  targetId: string;
  targetIsAdmin: boolean;
}

/** Why an account deletion must be refused, or null when it may go ahead. */
export function deleteAccountProblem(f: DeleteAccountFacts): string | null {
  if (!f.callerIsAdmin) return "Apenas o administrador pode excluir cadastros.";
  if (f.targetId === f.callerId) return "Você não pode excluir a própria conta.";
  if (f.targetIsAdmin) return "Contas de administrador não podem ser excluídas.";
  return null;
}

export const FEED_KEY_MIN = 8;
export const FEED_KEY_MAX = 500;

/** Validates the admin's live-table key form; unknown providers fall back to the default one. */
export function parseFeedKeyInput(
  input: { key?: unknown; provider?: unknown } | null | undefined,
): {
  key: string;
  provider: ProviderId;
} {
  const key = String(input?.key ?? "").trim();
  if (key.length < FEED_KEY_MIN || key.length > FEED_KEY_MAX) throw new Error("Chave inválida.");
  const raw = typeof input?.provider === "string" ? input.provider : "";
  return { key, provider: isProviderId(raw) ? raw : "lynxmetrics" };
}

export interface RobotSwitches {
  /** robot_settings row has loaded on this client. */
  loaded: boolean;
  running: boolean;
  maintenance: boolean;
  apiPaused: boolean;
}

/** Whether this client may call the live table at all (global pause stops every client). */
export const liveFeedEnabled = (s: RobotSwitches) => s.loaded && !s.apiPaused;

/** Whether the robot produces signals for everyone right now. */
export const robotActive = (s: RobotSwitches) =>
  s.loaded && s.running && !s.maintenance && !s.apiPaused;
