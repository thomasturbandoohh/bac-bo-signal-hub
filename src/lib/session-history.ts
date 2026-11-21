import type { SessionSignal } from "./robot-schedule";

const PREFIX = "bacbo:history:";

/** How many signals we keep for scoring / streaks. Must stay in sync with mergeSignals limit. */
export const HISTORY_LIMIT = 100;

interface Stored {
  /** Kept for backward compatibility with older clients; no longer used for clearing. */
  session?: number;
  items: SessionSignal[];
}

/**
 * Signals for this user. Persists across logins and page reloads so sequences
 * and scoreboard don't reset when the user leaves and comes back.
 * Only cleared explicitly (robot off / maintenance / API pause).
 */
export function loadHistory(userId: string, _session?: number): SessionSignal[] {
  try {
    const raw = localStorage.getItem(PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function saveHistory(userId: string, _session: number | undefined, items: SessionSignal[]) {
  try {
    localStorage.setItem(
      PREFIX + userId,
      JSON.stringify({ items } satisfies Stored),
    );
  } catch {
    /* storage full or unavailable */
  }
}

/** Clear this user's signal history (used when the robot is turned off / maintenance / API paused). */
export function clearHistory(userId: string) {
  try {
    localStorage.removeItem(PREFIX + userId);
  } catch {
    /* ignore */
  }
}

export function clearAllHistory() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
