import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Ban,
  Bot,
  Check,
  Clock,
  KeyRound,
  Loader2,
  Power,
  Radio,
  RotateCcw,
  RotateCw,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteUserAccount } from "@/lib/admin.functions";
import { connectLiveTable } from "@/lib/live-table.functions";
import { liveTableQuery } from "@/lib/queries";
import { Avatar } from "@/components/bacbo/Avatar";
import { TelegramControls } from "@/components/bacbo/TelegramControls";
import { TelegramIcon } from "@/components/bacbo/TelegramIcon";
import { allProfilesQuery, settingsQuery, type Profile } from "@/lib/queries";
import { useRobot } from "@/lib/robot-context";
import { feedErrorMessage } from "@/lib/live-table";
import { PROVIDER_LIST, type ProviderId } from "@/lib/providers";
import { cn } from "@/lib/utils";

type Status = Database["public"]["Enums"]["account_status"];

export const Route = createFileRoute("/_authenticated/_approved/admin")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/robos" });
  },
  head: () => ({
    meta: [
      { title: "Painel Admin — Bac Bo Live" },
      {
        name: "description",
        content: "Gerencie cadastros, acessos e calibragem do robô Bac Bo Live.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Tab = "pending" | "users" | "robot" | "telegram";

function AdminPage() {
  const { profile: me } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("pending");
  const { data: profiles = [], isLoading } = useQuery(allProfilesQuery);
  const queryClient = useQueryClient();

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { status }) => {
      const msg: Record<Status, string> = {
        approved: "Acesso liberado",
        rejected: "Cadastro recusado",
        blocked: "Acesso bloqueado",
        pending: "Movido para pendentes",
      };
      toast.success(msg[status]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: allProfilesQuery.queryKey }),
  });

  const deleteFn = useServerFn(deleteUserAccount);
  const [toDelete, setToDelete] = useState<Profile | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { userId: id } }),
    onSuccess: (result) => {
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setToDelete(null);
      toast.success("Cadastro excluído");
      void queryClient.invalidateQueries({ queryKey: allProfilesQuery.queryKey });
    },
    onError: () =>
      setDeleteError(
        "Não foi possível concluir a exclusão. Verifique sua sessão e conexão e tente novamente.",
      ),
  });

  const pending = profiles.filter((p) => p.status === "pending");
  const others = profiles.filter((p) => p.status !== "pending");

  const tabs = [
    { id: "pending", label: "Pendentes", icon: Clock },
    { id: "users", label: "Usuários", icon: Users },
    { id: "robot", label: "Robô", icon: Bot },
    { id: "telegram", label: "Telegram", icon: TelegramIcon },
  ] as const;

  return (
    <div className="mx-auto space-y-3 pt-2 sm:space-y-4 lg:max-w-3xl">
      <header className="flex items-center gap-3">
        <Link
          to="/perfil"
          aria-label="Voltar"
          className="liquid-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
            Painel do Administrador
          </h1>
          <p className="text-xs text-muted-foreground">Acessos e robô</p>
        </div>
      </header>

      <div className="liquid-glass grid grid-cols-4 gap-1 rounded-2xl p-1">
        {tabs.map(({ id: k, label, icon: TabIcon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-1 py-2 text-xs font-semibold sm:py-2.5 sm:text-sm"
          >
            {tab === k && (
              <motion.span
                layoutId="admin-tab"
                className="absolute inset-0 rounded-xl bg-secondary ring-1 ring-border"
              />
            )}
            <TabIcon
              size={18}
              className={cn(
                "relative shrink-0 transition-colors",
                tab === k
                  ? k === "telegram"
                    ? "text-[#229ED9]"
                    : "text-foreground"
                  : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "relative block truncate text-[0.6875rem] sm:text-xs",
                tab === k ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {k === "pending" && pending.length > 0 && (
              <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tie px-1 text-[0.625rem] font-bold text-background">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "pending" && (
            <List loading={isLoading} empty="Nenhum cadastro aguardando aprovação.">
              {pending.map((p) => (
                <UserRow key={p.id} p={p}>
                  <IconBtn
                    tone="success"
                    label="Aprovar"
                    onClick={() => setStatus.mutate({ id: p.id, status: "approved" })}
                  >
                    <Check className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    tone="danger"
                    label="Recusar"
                    onClick={() => setStatus.mutate({ id: p.id, status: "rejected" })}
                  >
                    <X className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn tone="muted" label="Excluir" onClick={() => setToDelete(p)}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </UserRow>
              ))}
            </List>
          )}
          {tab === "users" && (
            <List loading={isLoading} empty="Nenhum usuário ainda.">
              {others.map((p) => (
                <UserRow key={p.id} p={p} badge={p.status}>
                  {p.id === me.id ? (
                    <span className="text-[0.6875rem] text-muted-foreground">Você</span>
                  ) : (
                    <>
                      {p.status === "approved" ? (
                        <IconBtn
                          tone="danger"
                          label="Bloquear"
                          onClick={() => setStatus.mutate({ id: p.id, status: "blocked" })}
                        >
                          <Ban className="h-4 w-4" />
                        </IconBtn>
                      ) : (
                        <IconBtn
                          tone="success"
                          label="Reativar"
                          onClick={() => setStatus.mutate({ id: p.id, status: "approved" })}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </IconBtn>
                      )}
                      <IconBtn tone="muted" label="Excluir" onClick={() => setToDelete(p)}>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </>
                  )}
                </UserRow>
              ))}
            </List>
          )}
          {tab === "robot" && <RobotControls onSelectTelegram={() => setTab("telegram")} />}
          {tab === "telegram" && <TelegramControls />}
        </motion.div>
      </AnimatePresence>

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) {
            setToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta de {toDelete?.name || toDelete?.email} será apagada de vez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                setDeleteError(null);
                if (toDelete) remove.mutate(toDelete.id);
              }}
            >
              {remove.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function List({
  loading,
  empty,
  children,
}: {
  loading: boolean;
  empty: string;
  children: ReactNode[];
}) {
  if (loading) return <div className="liquid-glass h-24 animate-pulse rounded-2xl" />;
  if (children.length === 0)
    return (
      <div className="liquid-glass rounded-2xl p-8 text-center">
        <Users className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  return <ul className="space-y-2">{children}</ul>;
}

const BADGE: Record<Status, string> = {
  approved: "border-success/30 bg-success/10 text-success",
  pending: "border-tie/30 bg-tie/10 text-tie",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  blocked: "border-destructive/30 bg-destructive/10 text-destructive",
};
const BADGE_LABEL: Record<Status, string> = {
  approved: "Ativo",
  pending: "Pendente",
  rejected: "Recusado",
  blocked: "Bloqueado",
};

function UserRow({ p, badge, children }: { p: Profile; badge?: Status; children: ReactNode }) {
  return (
    <motion.li
      layout
      className="liquid-glass flex items-center gap-2.5 rounded-2xl p-2.5 sm:gap-3 sm:p-3"
    >
      <Avatar
        value={p.avatar_url}
        name={p.name}
        className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
        textClass="text-sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold sm:text-base">{p.name || "Sem nome"}</p>
          {badge && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-bold uppercase",
                BADGE[badge],
              )}
            >
              {BADGE_LABEL[badge]}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{p.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </motion.li>
  );
}

function IconBtn({
  tone,
  label,
  onClick,
  children,
}: {
  tone: "success" | "danger" | "muted";
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold sm:h-10 sm:px-3",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "danger" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "muted" &&
          "border-border bg-secondary text-muted-foreground hover:text-destructive",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

function RobotControls({ onSelectTelegram }: { onSelectTelegram?: () => void }) {
  const robot = useRobot();
  const [subView, setSubView] = useState<"robot" | "telegram">("robot");

  return (
    <div className="space-y-3">
      {/* Seletor Visual com Ícones: Robô e Telegram */}
      <div className="liquid-glass grid grid-cols-2 gap-2 rounded-2xl p-1.5">
        <button
          type="button"
          onClick={() => setSubView("robot")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs sm:text-sm font-semibold transition-all touch-manipulation",
            subView === "robot"
              ? "bg-secondary text-foreground ring-1 ring-border shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <Bot className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span>Operação da Mesa</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onSelectTelegram) {
              onSelectTelegram();
            } else {
              setSubView("telegram");
            }
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs sm:text-sm font-semibold transition-all touch-manipulation",
            subView === "telegram"
              ? "bg-[#229ED9]/15 text-[#229ED9] ring-1 ring-[#229ED9]/30 shadow-sm"
              : "text-muted-foreground hover:text-[#229ED9] hover:bg-[#229ED9]/5",
          )}
        >
          <TelegramIcon size={18} className="shrink-0" />
          <span>Sinais no Telegram</span>
        </button>
      </div>

      {subView === "telegram" ? (
        <TelegramControls />
      ) : (
        <>
          {/* Robô Principal: ligar e desligar operações e sinais */}
          <div className="liquid-glass flex items-center gap-3 rounded-2xl p-4 sm:p-5">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                robot.running
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-white/10 bg-white/5 text-muted-foreground",
              )}
            >
              <Power className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base text-foreground">
                {robot.running ? "Robô Ligado" : "Robô Desligado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {robot.running
                  ? "Sinais, leituras e histórico ativos para os usuários."
                  : "Pausar o robô para os sinais e o histórico."}
              </p>
            </div>
            <Switch
              checked={robot.running}
              disabled={robot.toggling}
              aria-label={robot.running ? "Desligar robô" : "Ligar robô"}
              onCheckedChange={() => robot.toggle()}
            />
          </div>

          {/* Modo Manutenção separado */}
          <div className="liquid-glass flex items-center gap-3 rounded-2xl p-4 sm:p-5">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                robot.maintenance
                  ? "border-tie/40 bg-tie/10 text-tie"
                  : "border-white/10 bg-white/5 text-muted-foreground",
              )}
            >
              <Wrench className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base text-foreground">
                {robot.maintenance ? "Modo Manutenção Ativo" : "Modo Manutenção Desligado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {robot.maintenance
                  ? "O sistema está em manutenção e pausado para todos os usuários."
                  : "Pausa tudo (robô, leituras e sinais) para todos os usuários."}
              </p>
            </div>
            <Switch
              checked={robot.maintenance}
              disabled={robot.maintenanceToggling}
              aria-label={
                robot.maintenance ? "Desativar modo manutenção" : "Ativar modo manutenção"
              }
              onCheckedChange={() => robot.toggleMaintenance()}
            />
          </div>

          {/* Gestão e Conexão da API da Mesa */}
          <FeedStatus />
        </>
      )}
    </div>
  );
}

function FeedStatus() {
  const queryClient = useQueryClient();
  const robot = useRobot();
  const { liveEnabled, apiPaused, apiToggling, toggleApiPause } = robot;
  const { data, isError, refetch } = useQuery({ ...liveTableQuery, enabled: liveEnabled });
  const feed = data?.feed;
  const errorMsg = feedErrorMessage(feed?.lastError);
  const connected = !!feed?.lastSuccessAt && !feed?.lastError && !apiPaused;
  const [provider, setProvider] = useState<ProviderId>("lynxmetrics");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const connect = useServerFn(connectLiveTable);
  const selected = PROVIDER_LIST.find((p) => p.id === provider) ?? PROVIDER_LIST[0]!;

  async function onConnect(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const trimmed = key.trim();
    if (trimmed.length < 8) {
      setLocalError("A chave parece muito curta. Verifica se copiaste bem.");
      return;
    }
    setSaving(true);
    try {
      const res = await connect({ data: { key: trimmed, provider } });
      if (!res.ok) {
        const msg = feedErrorMessage(res.error) ?? "Não foi possível conectar a chave.";
        setLocalError(msg);
        toast.error(msg);
        return;
      }
      setKey("");
      toast.success("Mesa conectada! A receber resultados.");
      void queryClient.invalidateQueries({ queryKey: liveTableQuery.queryKey });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao conectar.";
      setLocalError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onReconnect() {
    setReconnecting(true);
    try {
      await queryClient.invalidateQueries({ queryKey: liveTableQuery.queryKey });
      await refetch();
      toast.success("Reconexão com a mesa solicitada!");
    } catch {
      toast.error("Erro ao tentar reconectar à mesa.");
    } finally {
      setReconnecting(false);
    }
  }

  return (
    <div className="liquid-glass space-y-4 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
            connected
              ? "border-success/30 bg-success/10 text-success"
              : apiPaused
                ? "border-tie/30 bg-tie/10 text-tie"
                : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          <Radio className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm sm:text-base text-foreground">API da Mesa</p>
          <p className="text-xs text-muted-foreground">
            {apiPaused
              ? "API da mesa desligada/pausada manualmente."
              : connected
                ? "Mesa conectada e recebendo dados ao vivo."
                : errorMsg ||
                  (isError
                    ? "Erro ao ler o estado da mesa."
                    : "Cole a chave do provedor para conectar.")}
          </p>
        </div>
      </div>

      {connected && (
        <div className="pt-1">
          <button
            type="button"
            disabled={reconnecting}
            onClick={onReconnect}
            aria-label="Reconectar API da mesa"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-bold text-white transition-all hover:bg-white/15 disabled:opacity-50 touch-manipulation motion-reduce:transition-none"
          >
            <RotateCw
              className={cn("h-4 w-4", reconnecting && "animate-spin")}
              aria-hidden="true"
            />
            <span>Reconexão</span>
          </button>
        </div>
      )}

      {!connected && (
        <form onSubmit={onConnect} className="space-y-3 border-t border-white/10 pt-3">
          <div>
            <label
              htmlFor="api-provider-select"
              className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Provedor
            </label>
            <select
              id="api-provider-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderId)}
              className="liquid-glass h-11 w-full rounded-xl px-3 text-sm outline-none"
            >
              {PROVIDER_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[0.6875rem] text-muted-foreground">{selected.help}</p>
          </div>
          <div>
            <label
              htmlFor="api-key-input"
              className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Chave da API
            </label>
            <input
              id="api-key-input"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Cole a chave aqui para conectar ou atualizar"
              className="liquid-glass h-11 w-full rounded-xl px-3 text-sm outline-none"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:brightness-105 transition-all touch-manipulation motion-reduce:transition-none"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Ligar mesa com nova chave
            </button>
          </div>
          {localError && <p className="text-xs text-destructive">{localError}</p>}
        </form>
      )}
    </div>
  );
}
