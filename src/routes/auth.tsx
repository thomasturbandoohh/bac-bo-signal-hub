import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock3, Loader2, Lock, Mail, ShieldX, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { LoginHero } from "@/components/bacbo/LoginHero";
import {
  getAccountStatus,
  isNotice,
  signOutEverywhere,
  type AccountNotice,
} from "@/lib/auth-helpers";
import { cn } from "@/lib/utils";

type Search = { status?: AccountNotice };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search =>
    isNotice(s["status"]) ? { status: s["status"] } : {},
  head: () => ({
    meta: [
      { title: "Entrar — Bac Bo Live" },
      {
        name: "description",
        content: "Acesse sua conta do robô de sinais Bac Bo Live ou crie um cadastro.",
      },
      { property: "og:title", content: "Entrar — Bac Bo Live" },
      { property: "og:description", content: "Acesse o robô de sinais Bac Bo Live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "A senha precisa de pelo menos 6 caracteres").max(72),
});
const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Informe seu nome").max(80, "Nome muito longo"),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [notice, setNotice] = useState<AccountNotice | null>(search.status ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (!search.status) return;
    setNotice(search.status);
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void signOutEverywhere(queryClient);
    });
  }, [search.status, queryClient]);

  // If a session already exists, route the user by account status.
  useEffect(() => {
    if (search.status) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void enter(data.session.user.id, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enter(userId: string, justCreated = false) {
    const status = await getAccountStatus(userId);
    if (status === "approved") {
      navigate({ to: "/robos", replace: true });
      return;
    }
    await signOutEverywhere(queryClient);
    setNotice(justCreated && (!status || status === "pending") ? "created" : (status ?? "pending"));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = (mode === "login" ? loginSchema : signupSchema).safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          setError(
            error.message.toLowerCase().includes("invalid")
              ? "E-mail ou senha incorretos."
              : "Não foi possível entrar. Tente novamente.",
          );
          return;
        }
        await enter(data.user.id);
      } else {
        const { name } = parsed.data as z.infer<typeof signupSchema>;
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin, data: { name } },
        });
        if (error) {
          const m = error.message.toLowerCase();
          setError(
            m.includes("registered")
              ? "Este e-mail já está cadastrado."
              : m.includes("not allowed") || m.includes("invalid")
                ? "Use um e-mail válido que possa receber mensagens."
                : m.includes("password") || m.includes("weak")
                  ? "Escolha uma senha mais forte."
                  : "Não foi possível criar a conta. Tente novamente.",
          );
          return;
        }
        if (data.user && data.user.identities?.length === 0) {
          setError("Este e-mail já está cadastrado.");
          return;
        }
        setForm({ name: "", email: "", password: "" });
        if (data.session && data.user) {
          await enter(data.user.id, true);
          return;
        }
        const signIn = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signIn.data.user) await enter(signIn.data.user.id, true);
        else setNotice("created");
      }
    } catch {
      setError("Não foi possível entrar agora. Verifique a conexão e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col sm:mx-auto sm:max-w-md md:max-w-lg lg:max-w-6xl lg:flex-row lg:items-center lg:gap-12 lg:px-10">
      <LoginHero />

      <div className="relative -mt-16 flex w-full flex-1 flex-col px-6 pb-6 sm:-mt-4 sm:px-6 sm:pb-10 lg:mt-0 lg:max-w-md lg:py-10">
        <AnimatePresence mode="wait">
          {notice ? (
            <NoticeCard
              key="notice"
              notice={notice}
              onBack={() => {
                setNotice(null);
                setMode("login");
                navigate({ to: "/auth", search: {}, replace: true });
              }}
            />
          ) : (
            <motion.div
              key={mode}
              className="mx-auto w-full max-w-[360px] sm:max-w-none"
              initial="hidden"
              animate="show"
              exit="exit"
              variants={STAGGER}
            >
              <motion.h1
                variants={RISE}
                className="text-center font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
              >
                {mode === "login" ? "Bem-vindo de volta" : "Criar conta"}
              </motion.h1>
              <motion.p
                variants={RISE}
                className="mt-1 text-center text-sm font-semibold text-muted-foreground"
              >
                {mode === "login"
                  ? "Entre para acessar seus robôs"
                  : "Seu acesso é liberado após aprovação do admin"}
              </motion.p>

              <motion.div
                variants={RISE}
                className="liquid-glass mt-4 rounded-[1.75rem] p-4 sm:mt-6 sm:p-5"
              >
                <form onSubmit={onSubmit} className="space-y-3">
                  {mode === "signup" && (
                    <Field label="Nome" icon={<UserRound className="h-4 w-4" strokeWidth={2.4} />}>
                      <input
                        placeholder="Seu nome"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-transparent text-[15px] font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
                      />
                    </Field>
                  )}
                  <Field label="E-mail" icon={<Mail className="h-4 w-4" strokeWidth={2.4} />}>
                    <input
                      type="email"
                      placeholder="voce@email.com"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-transparent text-[15px] font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
                    />
                  </Field>
                  <Field label="Senha" icon={<Lock className="h-4 w-4" strokeWidth={2.4} />}>
                    <input
                      type="password"
                      placeholder="Sua senha"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-transparent text-[15px] font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
                    />
                  </Field>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-center text-sm font-bold text-destructive"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-banker to-banker-glow text-[15px] font-extrabold text-primary-foreground shadow-[0_18px_40px_-18px_var(--banker)] disabled:opacity-70 sm:h-12"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === "login" ? "Entrar com E-mail" : "Criar conta"}
                  </motion.button>
                </form>

                <p className="mt-4 text-center text-sm font-semibold text-muted-foreground">
                  {mode === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode(mode === "login" ? "signup" : "login");
                    }}
                    className="font-extrabold text-banker-glow"
                  >
                    {mode === "login" ? "Criar conta" : "Entrar"}
                  </button>
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-auto pt-5 text-center text-[11px] text-muted-foreground/70 sm:pt-8">
          Jogue com responsabilidade · Proibido para menores de 18 anos
        </p>
      </div>
    </div>
  );
}

/** Heading, subtitle and form card rise in one after the other. */
const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};
const RISE = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 220, damping: 24 },
  },
};

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block pl-1 text-xs font-extrabold uppercase tracking-[0.12em] text-foreground/85">
        {label}
      </span>
      <span className="flex h-12 items-center gap-3 rounded-2xl border border-glass-border bg-background/40 pl-1.5 pr-4 transition-colors focus-within:border-player-glow/50 focus-within:bg-background/60">
        <span className="glass-icon h-9 w-9 shrink-0 text-player-glow">{icon}</span>
        {children}
      </span>
    </label>
  );
}

const NOTICES: Record<
  AccountNotice,
  { icon: typeof CheckCircle2; tone: string; title: string; body: string }
> = {
  created: {
    icon: CheckCircle2,
    tone: "text-success border-success/30 bg-success/10",
    title: "Conta criada com sucesso!",
    body: "Aguarde a aprovação do admin para acessar o robô.",
  },
  pending: {
    icon: Clock3,
    tone: "text-tie border-tie/30 bg-tie/10",
    title: "Cadastro em análise",
    body: "Seu acesso ainda está aguardando a aprovação do administrador. Tente novamente mais tarde.",
  },
  rejected: {
    icon: ShieldX,
    tone: "text-destructive border-destructive/30 bg-destructive/10",
    title: "Cadastro recusado",
    body: "O administrador não aprovou este cadastro.",
  },
  blocked: {
    icon: ShieldX,
    tone: "text-destructive border-destructive/30 bg-destructive/10",
    title: "Acesso bloqueado",
    body: "Seu acesso foi desativado pelo administrador.",
  },
};

function NoticeCard({ notice, onBack }: { notice: AccountNotice; onBack: () => void }) {
  const n = NOTICES[notice];
  const Icon = n.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="liquid-glass mt-3 rounded-[1.5rem] p-5 text-center sm:mt-4 sm:rounded-[1.75rem] sm:p-7"
    >
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
        className={cn(
          "mx-auto flex h-14 w-14 items-center justify-center rounded-full border sm:h-16 sm:w-16",
          n.tone,
        )}
      >
        <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
      </motion.div>
      <h2 className="mt-4 font-display text-xl font-bold tracking-tight sm:mt-5 sm:text-2xl">
        {n.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
      <button
        onClick={onBack}
        className="mt-4 h-11 w-full rounded-full border border-border bg-secondary text-sm font-semibold transition-colors hover:bg-accent sm:mt-6 sm:h-12"
      >
        Voltar para o login
      </button>
    </motion.div>
  );
}
