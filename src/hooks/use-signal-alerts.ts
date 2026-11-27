import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useRobot } from "@/lib/robot-context";
import {
  getAlertPreferences,
  getNotificationPermission,
  requestNotificationPermission,
  saveAlertPreferences,
  triggerResultAlert,
  triggerSignalAlert,
  type AlertPreferences,
  type NotificationPermissionStatus,
} from "@/lib/push-notifications";

export function useSignalAlerts() {
  const robot = useRobot();
  const { phase, signal, results, key: robotKey } = robot;

  const [prefs, setPrefs] = useState<AlertPreferences>(() => getAlertPreferences());
  const [permission, setPermission] = useState<NotificationPermissionStatus>(() =>
    getNotificationPermission(),
  );

  const lastAlertedSignalKey = useRef<string | null>(null);
  const lastAlertedResultKey = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  // Sync permission status
  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  // Watch for new signals in real time
  useEffect(() => {
    if (phase !== "signal" || !signal) {
      return;
    }

    const signalKey = `${robotKey || signal.pattern}-${signal.side}`;
    if (lastAlertedSignalKey.current === signalKey) {
      return;
    }
    lastAlertedSignalKey.current = signalKey;

    // Trigger sound, vibration, and push
    void triggerSignalAlert(signal.side, signal.pattern, signal.confidence);

    // In-app visual toast
    const sideName = signal.side === "player" ? "PLAYER 🔵" : "BANKER 🔴";
    toast.info(`🎲 Entrada Confirmada: ${sideName}`, {
      description: `${signal.pattern} (${signal.confidence}% de confiança). Lembre de cobrir o empate!`,
      duration: 6000,
    });
  }, [phase, signal, robotKey]);

  // Watch for new results in real time
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (results.length > 0) {
        const first = results[results.length - 1]!;
        lastAlertedResultKey.current = `${first.at}-${first.green}-${first.gale}`;
      }
      return;
    }

    if (!results.length) return;
    // The latest completed result is at the end of the array
    const latest = results[results.length - 1]!;
    const resultKey = `${latest.at}-${latest.green}-${latest.gale}-${latest.tie}`;

    if (lastAlertedResultKey.current === resultKey) {
      return;
    }
    lastAlertedResultKey.current = resultKey;

    // Only alert for results that finished recently (within last 30s)
    if (Date.now() - latest.at > 30_000) {
      return;
    }

    void triggerResultAlert(latest.green, latest.gale, latest.tie);

    if (!latest.green) {
      toast.error("❌ Rodada finalizada em RED", {
        description: "Mantenha a gestão e aguarde a próxima oportunidade.",
        duration: 5000,
      });
    } else {
      const label = latest.tie
        ? "GREEN NO EMPATE 🟡"
        : !latest.gale
          ? "GREEN DIRETO ✅"
          : "GREEN NO G1 ✅";
      toast.success(`🎯 ${label}`, {
        description: "Vitória computada! Bate a meta e sai do mercado.",
        duration: 5000,
      });
    }
  }, [results]);

  const updatePreference = useCallback((key: keyof AlertPreferences, value: boolean) => {
    const updated = saveAlertPreferences({ [key]: value });
    setPrefs(updated);
  }, []);

  const enableNotifications = useCallback(async () => {
    const status = await requestNotificationPermission();
    setPermission(status);
    if (status === "granted") {
      updatePreference("push", true);
      toast.success("Notificações no celular ativadas com sucesso!");
    } else if (status === "denied") {
      toast.error("Notificações bloqueadas pelo navegador.", {
        description: "Permita o acesso nas configurações do seu navegador para receber avisos.",
      });
    }
    return status;
  }, [updatePreference]);

  const testAlert = useCallback(async () => {
    await triggerSignalAlert("player", "Surf de tendência (Teste)", 85);
    toast.success("🔔 Teste de Alerta Realizado!", {
      description: "Som tocado, vibração acionada e notificação disparada.",
    });
  }, []);

  return {
    prefs,
    permission,
    updatePreference,
    enableNotifications,
    testAlert,
  };
}
