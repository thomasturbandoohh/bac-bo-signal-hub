import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Lock,
  Mail,
  ShieldX,
  UserRound,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { LoginHero } from "@/components/bacbo/LoginHero";
import {
  getAccountStatus,
  isNotice,
  signOutEverywhere,
  signUpErrorMessage,
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
          console.error("[auth] sign-in failed", error.code, error.message);
          if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
            setError("Aguarde a aprovação do administrador para liberar seu acesso.");
          } else if (error.code === "invalid_credentials" || /invalid/i.test(error.message)) {
            setError("E-mail ou senha incorretos.");
          } else if (error.status === 429) {
            setError("Muitas tentativas. Aguarde um minuto e tente de novo.");
          } else {
            setError(`Não foi possível entrar: ${error.message}`);
          }
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
          console.error("[auth] sign-up failed", error.code, error.message);
          setError(signUpErrorMessage(error));
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
        setNotice("created");
      }
    } catch (err) {
      console.error("[auth] unexpected error", err);
      setError("Não foi possível entrar agora. Verifique a conexão e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col sm:mx-auto sm:max-w-md md:max-w-lg lg:max-w-6xl lg:flex-row lg:items-center lg:gap-12 lg:px-10">
      <LoginHero />

      <div className="relative -mt-[42vh] flex w-full flex-1 flex-col px-6 pb-6 sm:-mt-4 sm:px-6 sm:pb-10 lg:mt-0 lg:max-w-md lg:py-10">
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
              className="mx-auto w-full max-w-[380px] sm:max-w-none"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="text-center">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.625rem] font-black uppercase tracking-widest text-player-glow">
                  <Sparkles className="h-3 w-3" />
                  ACESSO VIP
                </span>
                <h1 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl text-white">
                  {mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
                </h1>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-muted-foreground">
                  {mode === "login"
                    ? "Acesse a central de sinais em tempo real"
                    : "Cadastro exclusivo para membros aprovados"}
                </p>
              </div>

              <motion.div
                className="glass-premium relative mt-5 overflow-hidden rounded-2xl border border-white/10 p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-all sm:mt-6 sm:p-6"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <form onSubmit={onSubmit} className="space-y-3.5">
                  {mode === "signup" && (
                    <Field label="Nome" icon={<UserRound className="h-4 w-4" strokeWidth={2.4} />}>
                      <input
                        placeholder="Seu nome completo"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-transparent text-[0.9375rem] font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
                      />
                    </Field>
                  )}
                  <Field label="E-mail" icon={<Mail className="h-4 w-4" strokeWidth={2.4} />}>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-transparent text-[0.9375rem] font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
                    />
                  </Field>
                  <Field label="Senha" icon={<Lock className="h-4 w-4" strokeWidth={2.4} />}>
                    <input
                      type="password"
                      placeholder="Sua senha secreta"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-transparent text-[0.9375rem] font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
                    />
                  </Field>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-center text-xs font-black text-destructive"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-rose-500 text-[0.9375rem] font-black text-white shadow-[0_12px_32px_-8px_rgba(244,63,94,0.6)] hover:brightness-110 active:scale-[0.99] disabled:opacity-70 transition-all"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === "login" ? "Entrar na Plataforma" : "Solicitar Acesso VIP"}
                  </motion.button>
                </form>

                <p className="mt-4 text-center text-xs sm:text-sm font-semibold text-muted-foreground">
                  {mode === "login" ? "Ainda não tem acesso? " : "Já possui conta? "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode(mode === "login" ? "signup" : "login");
                    }}
                    className="font-black text-amber-300 hover:text-amber-200 transition-colors ml-1"
                  >
                    {mode === "login" ? "Criar conta" : "Fazer login"}
                  </button>
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-auto pt-6 text-center text-[0.625rem] text-muted-foreground/60 sm:pt-8">
          Jogue com responsabilidade · Proibido para menores de 18 anos
        </p>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block pl-1 text-[0.6875rem] font-black uppercase tracking-[0.14em] text-foreground/80">
        {label}
      </span>
      <span className="flex h-12 items-center gap-3 rounded-2xl border border-white/12 bg-black/40 pl-3.5 pr-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-all duration-200 focus-within:border-player-glow/70 focus-within:ring-2 focus-within:ring-player-glow/20 focus-within:bg-black/60">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
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
    tone: "text-emerald-400 border-emerald-500/40 bg-emerald-500/15 shadow-[0_0_20px_rgba(52,211,153,0.3)]",
    title: "Conta cadastrada com sucesso!",
    body: "Seu cadastro foi recebido. O administrador liberará seu acesso em instantes.",
  },
  confirm: {
    icon: CheckCircle2,
    tone: "text-emerald-400 border-emerald-500/40 bg-emerald-500/15 shadow-[0_0_20px_rgba(52,211,153,0.3)]",
    title: "Conta confirmada!",
    body: "Aguarde a aprovação do administrador para acessar o robô.",
  },
  pending: {
    icon: Clock3,
    tone: "text-amber-400 border-amber-500/40 bg-amber-500/15 shadow-[0_0_20px_rgba(251,191,36,0.3)]",
    title: "Cadastro em análise",
    body: "Seu acesso ainda está aguardando a liberação do administrador.",
  },
  rejected: {
    icon: ShieldX,
    tone: "text-rose-400 border-rose-500/40 bg-rose-500/15 shadow-[0_0_20px_rgba(244,63,94,0.3)]",
    title: "Cadastro não aprovado",
    body: "O administrador não aprovou este cadastro.",
  },
  blocked: {
    icon: ShieldX,
    tone: "text-rose-400 border-rose-500/40 bg-rose-500/15 shadow-[0_0_20px_rgba(244,63,94,0.3)]",
    title: "Acesso bloqueado",
    body: "Seu acesso foi desativado pelo administrador.",
  },
};

function NoticeCard({ notice, onBack }: { notice: AccountNotice; onBack: () => void }) {
  const n = NOTICES[notice];
  const Icon = n.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass-premium relative mt-3 overflow-hidden rounded-2xl border border-white/15 p-6 text-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:mt-4 sm:p-8"
    >
      <div
        className={cn(
          "mx-auto flex h-14 w-14 items-center justify-center rounded-full border sm:h-16 sm:w-16",
          n.tone,
        )}
      >
        <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
      </div>
      <h2 className="mt-4 font-display text-xl font-black tracking-tight sm:mt-5 sm:text-2xl text-white">
        {n.title}
      </h2>
      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">{n.body}</p>
      <button
        onClick={onBack}
        className="mt-5 h-12 w-full rounded-full border border-white/15 bg-white/[0.08] text-xs sm:text-sm font-black text-white transition-all hover:bg-white/[0.12] sm:mt-6"
      >
        Voltar para o login
      </button>
    </motion.div>
  );
}
