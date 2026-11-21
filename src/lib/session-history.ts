const PREFIX = "bacbo:history:";

/**
 * Signal history is rebuilt from the stored rounds of the robot's run (see robot-context), so
 * this only removes copies older app versions kept on the device; called on sign-out.
 */
export function clearAllHistory() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
