import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock3, Loader2, Lock, Mail, ShieldX, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import loginCover from "@/assets/login-cover.jpg";
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
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) await enter(data.user.id, true);
  }

  return (
    <div className="flex min-h-screen w-full flex-col sm:mx-auto sm:max-w-md md:max-w-lg lg:max-w-6xl lg:flex-row lg:items-center lg:gap-12 lg:px-10">
      <div className="relative h-[37vh] min-h-[250px] w-full overflow-hidden sm:h-[34vh] sm:min-h-[240px] lg:h-[80vh] lg:w-1/2 lg:rounded-[2rem]">
        <motion.img
          src={loginCover}
          alt="Bac Bo Live"
          width={1254}
          height={1254}
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-60% to-background lg:hidden" />
      </div>

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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-center font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {mode === "login" ? "Bem-vindo de volta" : "Criar conta"}
              </h1>
              <p className="mt-1 text-center text-sm font-semibold text-muted-foreground">
                {mode === "login"
                  ? "Entre para acessar seus robôs"
                  : "Seu acesso é liberado após aprovação do admin"}
              </p>

              <div className="liquid-glass mt-4 rounded-[1.75rem] p-4 sm:mt-6 sm:p-5">
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

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onGoogle}
                  className="google-btn mt-2.5 flex h-11 w-full items-center justify-center gap-[10px] rounded-full px-3 text-sm font-bold shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] sm:h-12"
                >
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.080.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                  Continuar com o Google
                </motion.button>

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
              </div>
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
