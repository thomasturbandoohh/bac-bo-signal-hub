import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Radio,
  ArrowLeft,
  Ban,
  Check,
  KeyRound,
  Loader2,
  Power,
  RotateCcw,
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

type Tab = "pending" | "users" | "robot";

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
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { userId: id } }),
    onSuccess: () => toast.success("Cadastro excluído"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: allProfilesQuery.queryKey }),
  });

  const pending = profiles.filter((p) => p.status === "pending");
  const others = profiles.filter((p) => p.status !== "pending");

  const tabs = [
    ["pending", "Pendentes"],
    ["users", "Usuários"],
    ["robot", "Robô"],
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

      <div className="liquid-glass grid grid-cols-3 gap-1 rounded-2xl p-1">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="relative rounded-xl px-1 py-2 text-xs font-semibold sm:py-2.5 sm:text-sm"
          >
            {tab === k && (
              <motion.span
                layoutId="admin-tab"
                className="absolute inset-0 rounded-xl bg-secondary ring-1 ring-border"
              />
            )}
            <span
              className={cn(
                "relative block truncate",
                tab === k ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {k === "pending" && pending.length > 0 && (
              <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tie px-1 text-[10px] font-bold text-background">
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
                    <span className="text-[11px] text-muted-foreground">Você</span>
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
          {tab === "robot" && <RobotControls />}
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta de {toDelete?.name || toDelete?.email} será apagada de vez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete) remove.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Excluir
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
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
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

function RobotControls() {
  const queryClient = useQueryClient();
  const robot = useRobot();
  const { data: settings } = useQuery(settingsQuery);
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setMaintenance(settings.maintenance);
  }, [settings]);

  const save = useMutation({
    mutationFn: async (patch: { maintenance: boolean }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("robot_settings")
        .update({ ...patch, updated_at: now })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Robô atualizado");
      queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey });
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  return (
    <div className="space-y-3">
      <div className="liquid-glass flex items-center gap-3 rounded-2xl p-4 sm:p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-success/30 bg-success/10 text-success">
          <Power className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Robô ligado</p>
          <p className="text-xs text-muted-foreground">
            Pausar o robô para os sinais e o histórico.
          </p>
        </div>
        <Switch
          checked={robot.running}
          disabled={robot.toggling}
          onCheckedChange={() => robot.toggle()}
        />
      </div>

      <div className="liquid-glass flex items-center gap-3 rounded-2xl p-4 sm:p-5">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border",
            robot.apiPaused
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-success/30 bg-success/10 text-success",
          )}
        >
          <Radio className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">
            {robot.apiPaused ? "API da mesa pausada" : "API da mesa ligada"}
          </p>
          <p className="text-xs text-muted-foreground">
            {robot.apiPaused
              ? "Pausada para todos os usuários. Desligue o switch para voltar a receber resultados."
              : "Ligue o switch para pausar a mesa para todos os usuários."}
          </p>
        </div>
        {robot.apiToggling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch
          checked={robot.apiPaused}
          disabled={robot.apiToggling}
          aria-label="Pausar a API da mesa para todos"
          onCheckedChange={() => robot.toggleApiPause()}
        />
      </div>

      <FeedStatus />

      <div className="liquid-glass flex items-center gap-3 rounded-2xl p-4 sm:p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-tie/30 bg-tie/10 text-tie">
          <Wrench className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Modo manutenção</p>
          <p className="text-xs text-muted-foreground">
            Para tudo (robô, histórico e sinais) para todos.
          </p>
        </div>
        <Switch
          checked={maintenance}
          onCheckedChange={(v) => {
            setMaintenance(v);
            save.mutate({ maintenance: v });
          }}
        />
      </div>
    </div>
  );
}

function FeedStatus() {
  const queryClient = useQueryClient();
  const { liveEnabled } = useRobot();
  const { data, isError } = useQuery({ ...liveTableQuery, enabled: liveEnabled });
  const feed = data?.feed;
  const errorMsg = feedErrorMessage(feed?.lastError);
  const connected = !!feed?.lastSuccessAt && !feed?.lastError;
  const [provider, setProvider] = useState<ProviderId>("lynxmetrics");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
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

  return (
    <div className="liquid-glass space-y-3 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border",
            connected
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">Fonte dos dados da mesa</p>
          <p className="text-xs text-muted-foreground">
            {connected
              ? "Mesa ligada e a receber dados."
              : errorMsg ||
                (isError ? "Erro ao ler o estado da mesa." : "Escolha o provedor e cole a chave.")}
          </p>
        </div>
      </div>

      <form onSubmit={onConnect} className="space-y-2.5">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Provedor
          </label>
          <select
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
          <p className="mt-1 text-[11px] text-muted-foreground">{selected.help}</p>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Chave da API
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Cole a chave aqui"
            className="liquid-glass h-11 w-full rounded-xl px-3 text-sm outline-none"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Ligar mesa
          </button>
        </div>
        {localError && <p className="text-xs text-destructive">{localError}</p>}
      </form>
    </div>
  );
}
