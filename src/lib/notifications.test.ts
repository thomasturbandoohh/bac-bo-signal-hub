import { describe, it, expect, beforeEach } from "vitest";
import {
  getAlertPreferences,
  saveAlertPreferences,
  getNotificationPermission,
  requestNotificationPermission,
  triggerSignalAlert,
  triggerResultAlert,
  dispatchNativeNotification,
} from "./push-notifications";
import { playSignalSound, playGreenSound, playRedSound, triggerVibration } from "./sound-effects";

describe("sound-effects", () => {
  it("executes sound and vibration handlers safely without throwing in headless environments", () => {
    expect(() => playSignalSound()).not.toThrow();
    expect(() => playGreenSound()).not.toThrow();
    expect(() => playRedSound()).not.toThrow();
    expect(() => triggerVibration()).not.toThrow();
    expect(() => triggerVibration([100, 50, 100])).not.toThrow();
  });
});

describe("push-notifications", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default alert preferences when storage is empty", () => {
    const prefs = getAlertPreferences();
    expect(prefs).toEqual({
      sound: true,
      vibration: true,
      push: true,
    });
  });

  it("saves and updates alert preferences", () => {
    const updated = saveAlertPreferences({ sound: false, vibration: false });
    expect(updated.sound).toBe(false);
    expect(updated.vibration).toBe(false);
    expect(updated.push).toBe(true);

    const reloaded = getAlertPreferences();
    expect(reloaded.sound).toBe(false);
    expect(reloaded.vibration).toBe(false);
    expect(reloaded.push).toBe(true);
  });

  it("handles notification permission check and request gracefully", async () => {
    const permission = getNotificationPermission();
    expect(["default", "granted", "denied", "unsupported"]).toContain(permission);

    const requested = await requestNotificationPermission();
    expect(["default", "granted", "denied", "unsupported"]).toContain(requested);
  });

  it("safely attempts to dispatch native notification without throwing", async () => {
    const dispatched = await dispatchNativeNotification({
      title: "Teste Bac Bo",
      body: "Testando envio de notificação nativa",
    });
    // In vitest headless environment without Notification granted, returns false
    expect(typeof dispatched).toBe("boolean");
  });

  it("triggers signal alerts and result alerts without throwing", async () => {
    await expect(triggerSignalAlert("player", "Surf de tendência", 88)).resolves.not.toThrow();
    await expect(triggerSignalAlert("banker", "Xadrez 1-1-1", 75)).resolves.not.toThrow();

    await expect(triggerResultAlert(true, false, false)).resolves.not.toThrow();
    await expect(triggerResultAlert(true, true, false)).resolves.not.toThrow();
    await expect(triggerResultAlert(true, false, true)).resolves.not.toThrow();
    await expect(triggerResultAlert(false)).resolves.not.toThrow();
  });
});
