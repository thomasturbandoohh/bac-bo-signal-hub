import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Eye, EyeOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { TelegramIcon } from "@/components/bacbo/TelegramIcon";
import {
  getTelegramSettings,
  saveTelegramSettings,
  testTelegramConnection,
} from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export function TelegramControls() {
  const queryClient = useQueryClient();
  const getTg = useServerFn(getTelegramSettings);
  const saveTg = useServerFn(saveTelegramSettings);
  const testTg = useServerFn(testTelegramConnection);

  const { data: tgConfig, isLoading } = useQuery({
    queryKey: ["admin", "telegram-settings"],
    queryFn: () => getTg(),
  });

  const [enabled, setEnabled] = useState(true);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [platformName, setPlatformName] = useState("ElephantBet");
  const [platformUrl, setPlatformUrl] = useState("https://www.elephantbet.com");
  const [tableName, setTableName] = useState("Bac Bo Live");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (tgConfig) {
      setEnabled(tgConfig.enabled);
      setBotToken(tgConfig.botToken || "");
      setChatId(tgConfig.chatId || "");
      setPlatformName(tgConfig.platformName || "ElephantBet");
      setPlatformUrl(tgConfig.platformUrl || "https://www.elephantbet.com");
      setTableName(tgConfig.tableName || "Bac Bo Live");
    }
  }, [tgConfig]);

  const isConfigured = !!tgConfig?.configured;
  const isOnline = isConfigured && enabled;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setTestResult(null);

    const cleanChatId = chatId.trim();
    if (!cleanChatId) {
      setLocalError("O ID do chat ou canal do Telegram é obrigatório.");
      return;
    }

    const cleanToken = botToken.trim();
    if (!cleanToken) {
      setLocalError("O token da API do bot é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveTg({
        data: {
          enabled,
          botToken: cleanToken,
          chatId: cleanChatId,
          platformName: platformName.trim(),
          platformUrl: platformUrl.trim(),
          tableName: tableName.trim(),
        },
      });

      if (!res.ok) {
        setLocalError(res.error || "Erro ao salvar configurações do Telegram.");
        toast.error(res.error || "Erro ao salvar.");
        return;
      }

      toast.success("Configurações do Telegram salvas com sucesso!");
      void queryClient.invalidateQueries({ queryKey: ["admin", "telegram-settings"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar configurações.";
      setLocalError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setLocalError(null);
    setTestResult(null);

    const cleanChatId = chatId.trim();
    if (!cleanChatId) {
      setLocalError("Informe o ID do chat para enviar a mensagem de teste.");
      return;
    }
    const cleanToken = botToken.trim();
    if (!cleanToken) {
      setLocalError("Informe o token da API do bot para realizar o teste.");
      return;
    }

    setTesting(true);
    try {
      const res = await testTg({
        data: {
          botToken: cleanToken,
          chatId: cleanChatId,
          platformName: platformName.trim(),
          platformUrl: platformUrl.trim(),
        },
      });

      if (!res.ok) {
        setLocalError(res.error || "Falha ao conectar com o Telegram.");
        toast.error(res.error || "Falha no teste do Telegram.");
        return;
      }

      const botLabel = res.botUsername ? `@${res.botUsername}` : res.botName || "Bot";
      const successMsg = `Conexão bem-sucedida! Mensagem de teste enviada via ${botLabel}.`;
      setTestResult(successMsg);
      toast.success(successMsg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao testar bot do Telegram.";
      setLocalError(msg);
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  }

  async function onToggleEnabled(val: boolean) {
    setEnabled(val);
    if (!isConfigured) return;

    try {
      await saveTg({
        data: {
          enabled: val,
          chatId: chatId.trim(),
          platformName: platformName.trim(),
          platformUrl: platformUrl.trim(),
          tableName: tableName.trim(),
        },
      });
      toast.success(val ? "Sinais no Telegram ativados!" : "Sinais no Telegram pausados.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "telegram-settings"] });
    } catch {
      toast.error("Erro ao alterar status do Telegram.");
    }
  }

  return (
    <div className="liquid-glass space-y-4 rounded-2xl p-4 sm:p-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
            isOnline
              ? "border-[#229ED9]/40 bg-[#229ED9]/15 text-[#229ED9]"
              : isConfigured
                ? "border-tie/30 bg-tie/10 text-tie"
                : "border-white/10 bg-white/5 text-muted-foreground",
          )}
        >
          <TelegramIcon size={22} className={isOnline ? "text-[#229ED9]" : "text-current"} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm sm:text-base text-foreground">Sinais no Telegram</p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-bold uppercase",
                isOnline
                  ? "border-[#229ED9]/40 bg-[#229ED9]/10 text-[#229ED9]"
                  : isConfigured
                    ? "border-tie/30 bg-tie/10 text-tie"
                    : "border-white/15 bg-white/5 text-muted-foreground",
              )}
            >
              {isOnline ? "Ativo" : isConfigured ? "Pausado" : "Não configurado"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? "Carregando configurações..."
              : isOnline
                ? "Envio de sinais ao vivo, alertas de G1 e resultados ativado."
                : isConfigured
                  ? "Bot configurado, mas envio de sinais está pausado."
                  : "Adicione o Token da API e o ID do seu Chat para ativar os sinais ao vivo."}
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={saving || !isConfigured}
          aria-label={enabled ? "Desativar sinais no Telegram" : "Ativar sinais no Telegram"}
          onCheckedChange={onToggleEnabled}
        />
      </div>

      {/* Formulário de Configuração */}
      <form onSubmit={onSave} className="space-y-3 border-t border-white/10 pt-3">
        {/* Token da API */}
        <div>
          <label
            htmlFor="tg-bot-token"
            className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Token da API do Bot (BotFather)
          </label>
          <div className="relative">
            <input
              id="tg-bot-token"
              type={showToken ? "text" : "password"}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Cole o token do seu bot (ex: 123456789:ABCdefGhI...)"
              className="liquid-glass h-11 w-full rounded-xl pl-3 pr-10 text-sm outline-none font-mono"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={showToken ? "Ocultar token" : "Mostrar token"}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[0.6875rem] text-muted-foreground">
            Token HTTP API fornecido pelo @BotFather ao criar seu bot no Telegram.
          </p>
        </div>

        {/* ID do Chat */}
        <div>
          <label
            htmlFor="tg-chat-id"
            className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            ID do Chat ou Canal
          </label>
          <input
            id="tg-chat-id"
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="Ex: -1001234567890 ou @seucanalvip"
            className="liquid-glass h-11 w-full rounded-xl px-3 text-sm outline-none font-mono"
            autoComplete="off"
          />
          <p className="mt-1 text-[0.6875rem] text-muted-foreground">
            ID do canal ou grupo onde os sinais serão enviados. Certifique-se de adicionar o bot
            como Administrador com permissão de postar mensagens.
          </p>
        </div>

        {/* Plataforma e Link */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="tg-platform-name"
              className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Nome da Plataforma
            </label>
            <input
              id="tg-platform-name"
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="ElephantBet"
              className="liquid-glass h-11 w-full rounded-xl px-3 text-sm outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="tg-platform-url"
              className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Link de Aposta / Afiliado
            </label>
            <input
              id="tg-platform-url"
              type="url"
              value={platformUrl}
              onChange={(e) => setPlatformUrl(e.target.value)}
              placeholder="https://www.elephantbet.com"
              className="liquid-glass h-11 w-full rounded-xl px-3 text-sm outline-none"
            />
          </div>
        </div>

        {/* Mesa */}
        <div>
          <label
            htmlFor="tg-table-name"
            className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Nome da Mesa
          </label>
          <input
            id="tg-table-name"
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Bac Bo Live"
            className="liquid-glass h-11 w-full rounded-xl px-3 text-sm outline-none"
          />
        </div>

        {/* Alertas locais */}
        {localError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {localError}
          </div>
        )}
        {testResult && (
          <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success">
            {testResult}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <button
            type="submit"
            disabled={saving || testing}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:brightness-105 transition-all touch-manipulation motion-reduce:transition-none"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Salvar Configurações</span>
          </button>

          <button
            type="button"
            onClick={onTest}
            disabled={saving || testing}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#229ED9]/30 bg-[#229ED9]/15 px-4 text-sm font-semibold text-[#229ED9] hover:bg-[#229ED9]/25 disabled:opacity-50 transition-all touch-manipulation motion-reduce:transition-none"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Testar Conexão</span>
          </button>
        </div>
      </form>
    </div>
  );
}
