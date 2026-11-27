/**
 * Browser Web Push & Notifications manager for Bac Bo Signal Hub.
 * Dispatches native operating system notifications on mobile and desktop,
 * and handles in-app sound and vibration preferences.
 */

import { playGreenSound, playRedSound, playSignalSound, triggerVibration } from "./sound-effects";

export type NotificationPermissionStatus = "default" | "granted" | "denied" | "unsupported";

const STORAGE_KEYS = {
  SOUND: "bacbo:sound_alerts_enabled",
  VIBRATION: "bacbo:vibration_alerts_enabled",
  PUSH: "bacbo:push_alerts_enabled",
};

export interface AlertPreferences {
  sound: boolean;
  vibration: boolean;
  push: boolean;
}

export function getAlertPreferences(): AlertPreferences {
  if (typeof window === "undefined") {
    return { sound: true, vibration: true, push: true };
  }
  try {
    const sound = localStorage.getItem(STORAGE_KEYS.SOUND);
    const vibration = localStorage.getItem(STORAGE_KEYS.VIBRATION);
    const push = localStorage.getItem(STORAGE_KEYS.PUSH);
    return {
      sound: sound === null ? true : sound === "true",
      vibration: vibration === null ? true : vibration === "true",
      push: push === null ? true : push === "true",
    };
  } catch {
    return { sound: true, vibration: true, push: true };
  }
}

export function saveAlertPreferences(prefs: Partial<AlertPreferences>): AlertPreferences {
  const current = getAlertPreferences();
  const next = { ...current, ...prefs };
  if (typeof window !== "undefined") {
    try {
      if (prefs.sound !== undefined) localStorage.setItem(STORAGE_KEYS.SOUND, String(next.sound));
      if (prefs.vibration !== undefined)
        localStorage.setItem(STORAGE_KEYS.VIBRATION, String(next.vibration));
      if (prefs.push !== undefined) localStorage.setItem(STORAGE_KEYS.PUSH, String(next.push));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function getNotificationPermission(): NotificationPermissionStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return "denied";
  }
}

export interface ShowNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
}

/**
 * Dispatch an OS-level notification via Service Worker or native browser Notification API.
 */
export async function dispatchNativeNotification(
  payload: ShowNotificationPayload,
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const { title, body, icon = "/icon-192.png", tag = "bacbo-signal", url = "/robos" } = payload;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        const swOptions = {
          body,
          icon,
          badge: "/favicon.png",
          tag,
          vibrate: [200, 100, 200, 100, 300],
          data: { url },
          renotify: true,
        } as NotificationOptions & { vibrate?: number[] };

        await reg.showNotification(title, swOptions);
        return true;
      }
    }

    // Direct Notification fallback
    new Notification(title, {
      body,
      icon,
      tag,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Trigger combined alert (sound, vibration, and native push if enabled).
 */
export async function triggerSignalAlert(
  side: "player" | "banker",
  pattern: string,
  confidence: number,
): Promise<void> {
  const prefs = getAlertPreferences();

  if (prefs.sound) {
    playSignalSound();
  }

  if (prefs.vibration) {
    triggerVibration([180, 90, 180]);
  }

  if (prefs.push && getNotificationPermission() === "granted") {
    const sideName = side === "player" ? "🔵 PLAYER" : "🔴 BANKER";
    await dispatchNativeNotification({
      title: `🎲 Entrada no Bac Bo: ${sideName}`,
      body: `Padrão: ${pattern} · Confiança: ${confidence}% · Cubra o empate!`,
      tag: "bacbo-new-signal",
    });
  }
}

/**
 * Trigger combined result alert (GREEN / RED).
 */
export async function triggerResultAlert(
  green: boolean,
  gale = false,
  tieHit = false,
): Promise<void> {
  const prefs = getAlertPreferences();

  if (!green) {
    if (prefs.sound) playRedSound();
    if (prefs.vibration) triggerVibration([250]);
    if (prefs.push && getNotificationPermission() === "granted") {
      await dispatchNativeNotification({
        title: "❌ Sinal Encerrado — RED",
        body: "Aguarde a próxima oportunidade com cautela.",
        tag: "bacbo-result",
      });
    }
  } else {
    if (prefs.sound) playGreenSound();
    if (prefs.vibration) triggerVibration([100, 50, 100, 50, 200]);
    if (prefs.push && getNotificationPermission() === "granted") {
      const label = tieHit ? "🟡 GREEN NO EMPATE" : !gale ? "✅ GREEN DIRETO" : "✅ GREEN NO G1";
      await dispatchNativeNotification({
        title: `🎯 ${label}!`,
        body: "Mais um acerto computado no placar. Bate a meta e sai!",
        tag: "bacbo-result",
      });
    }
  }
}
