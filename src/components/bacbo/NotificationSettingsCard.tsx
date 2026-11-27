import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Smartphone,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSignalAlerts } from "@/hooks/use-signal-alerts";
import { cn } from "@/lib/utils";

export function NotificationSettingsCard() {
  const { prefs, permission, updatePreference, enableNotifications, testAlert } = useSignalAlerts();
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";

  const handleTest = async () => {
    setTesting(true);
    await testAlert();
    setTimeout(() => setTesting(false), 800);
  };

  return (
    <div className="liquid-glass relative overflow-hidden rounded-[1.5rem] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
              isGranted
                ? "border-success/30 bg-success/10 text-success"
                : "border-tie/30 bg-tie/10 text-tie",
            )}
          >
            {isGranted ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="font-display text-sm font-bold tracking-tight text-foreground sm:text-base flex items-center gap-2">
              Alertas & Notificações
              {isGranted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[0.625rem] font-bold text-success uppercase">
                  <Check className="h-2.5 w-2.5" /> Ativo
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isGranted
                ? "Sons, vibração e notificações no celular habilitados"
                : "Ative para receber sinais na tela de bloqueio e com som"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/40"
          aria-label={expanded ? "Recolher configurações" : "Expandir configurações"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {!isGranted && !isDenied && (
        <div className="mt-3.5 flex items-center justify-between rounded-xl border border-tie/30 bg-tie/10 p-3">
          <div className="flex items-center gap-2.5 pr-2">
            <Sparkles className="h-4 w-4 shrink-0 text-tie" />
            <p className="text-xs text-foreground font-medium">
              Receba os sinais mesmo com o celular bloqueado ou fora do site.
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => void enableNotifications()}
            className="shrink-0 rounded-full bg-tie px-3.5 py-1.5 text-xs font-bold text-background shadow-md hover:opacity-95"
          >
            Ativar Agora
          </motion.button>
        </div>
      )}

      {isDenied && (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          Notificações bloqueadas nas permissões do seu navegador. Habilite nas configurações para
          receber os sinais.
        </div>
      )}

      {/* Expanded controls */}
      {expanded && (
        <div className="mt-4 space-y-3.5 border-t border-border/50 pt-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {prefs.sound ? (
                <Volume2 className="h-4 w-4 text-tie" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-xs font-semibold text-foreground">Sons da Mesa</p>
                <p className="text-[0.6875rem] text-muted-foreground">
                  Alerta sonoro na entrada e efeito de moedas no GREEN
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.sound}
              onCheckedChange={(val) => updatePreference("sound", val)}
              aria-label="Ativar sons"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 text-tie" />
              <div>
                <p className="text-xs font-semibold text-foreground">Vibração no Celular</p>
                <p className="text-[0.6875rem] text-muted-foreground">
                  Vibrar o aparelho ao receber novos sinais
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.vibration}
              onCheckedChange={(val) => updatePreference("vibration", val)}
              aria-label="Ativar vibração"
            />
          </div>

          <div className="pt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={testing}
              onClick={handleTest}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent/40 disabled:opacity-60"
            >
              <BellRing className="h-3.5 w-3.5 text-tie" />
              {testing ? "Testando…" : "Testar Alerta & Som"}
            </button>

            {!isGranted && (
              <button
                type="button"
                onClick={() => void enableNotifications()}
                className="text-xs font-bold text-tie hover:underline"
              >
                Permitir no Celular
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationSettingsRow() {
  const { prefs, permission, updatePreference, enableNotifications } = useSignalAlerts();
  const isGranted = permission === "granted";

  return (
    <div className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-accent/40">
      <div className="flex items-center gap-3">
        <Bell className={cn("h-4 w-4", isGranted ? "text-success" : "text-tie")} />
        <div>
          <p className="text-sm font-medium text-foreground">Notificações e Sons</p>
          <p className="text-xs text-muted-foreground">
            {isGranted ? "Notificações nativas ativas" : "Clique para permitir no celular"}
          </p>
        </div>
      </div>

      {isGranted ? (
        <Switch
          checked={prefs.sound}
          onCheckedChange={(val) => updatePreference("sound", val)}
          aria-label="Ativar sons do sinal"
        />
      ) : (
        <button
          type="button"
          onClick={() => void enableNotifications()}
          className="rounded-full bg-tie px-3 py-1 text-xs font-bold text-background"
        >
          Ativar
        </button>
      )}
    </div>
  );
}
