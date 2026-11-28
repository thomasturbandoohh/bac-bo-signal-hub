import { PwaInstallRow } from "@/components/bacbo/PwaInstallPrompt";
import { useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Camera,
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/bacbo/Avatar";
import { signOutEverywhere } from "@/lib/auth-helpers";
import { avatarUrlQuery, uploadAvatar } from "@/lib/avatar";
import { useMyAccount } from "@/lib/account";
import { allProfilesQuery, myAccountQuery, type MyAccount } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/_approved/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Bac Bo Live" },
      { name: "description", content: "Seus dados de conta no robô Bac Bo Live." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, isAdmin } = useMyAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const avatar = profile.avatar_url;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadAvatar(profile.id, file, avatar);
      await queryClient.ensureQueryData(avatarUrlQuery(path)).catch(() => null);
      const key = myAccountQuery(profile.id).queryKey;
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<MyAccount>(key, (old) =>
        old?.profile ? { ...old, profile: { ...old.profile, avatar_url: path } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: allProfilesQuery.queryKey });
      toast.success("Foto de perfil atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  async function logout() {
    await signOutEverywhere(queryClient);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto space-y-3.5 pt-1 sm:space-y-4 sm:pt-2 lg:max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-black tracking-tight sm:text-2xl">Minha Conta</h1>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[0.625rem] font-black uppercase tracking-widest text-amber-300">
          <Sparkles className="h-3 w-3 text-amber-400" />
          VIP MEMBER
        </span>
      </div>

      {/* Main VIP Profile Card */}
      <div className="glass-premium relative overflow-hidden rounded-2xl p-6 text-center sm:p-7 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.85)] border border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-player/15 via-transparent to-banker/15" />

        {/* Avatar with luxury glowing rim */}
        <div className="relative mx-auto mt-1 h-24 w-24 sm:mt-2 sm:h-28 sm:w-28">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-player-glow via-white/30 to-banker-glow blur-[2px] opacity-75" />
          <Avatar
            value={avatar}
            name={profile.name}
            className="relative h-24 w-24 border-4 sm:h-28 sm:w-28 border-[#090d18] shadow-2xl"
            textClass="text-3xl font-black"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Alterar foto de perfil"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#090d18] bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        </div>

        <h2 className="relative mt-3.5 font-display text-lg font-black sm:text-xl">
          {profile.name || "Usuário VIP"}
        </h2>
        <p className="relative mt-0.5 text-xs text-muted-foreground sm:text-sm">{profile.email}</p>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors disabled:opacity-60"
        >
          {uploading ? "Enviando nova foto…" : "Alterar foto de perfil"}
        </button>

        <div className="relative mt-4 flex justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[0.6875rem] font-black uppercase tracking-wider text-emerald-300 shadow-sm">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Acesso Aprovado
          </span>
          {isAdmin && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[0.6875rem] font-black uppercase tracking-wider text-amber-300 shadow-sm">
              <ShieldCheck className="h-3 w-3 text-amber-400" />
              Administrador
            </span>
          )}
        </div>
      </div>

      {/* Account Info Details */}
      <div className="glass-premium divide-y divide-white/[0.08] rounded-2xl border border-white/10 overflow-hidden shadow-lg">
        <Row
          icon={<UserRound className="h-4 w-4 text-player-glow" />}
          label="Nome"
          value={profile.name}
        />
        <Row
          icon={<Mail className="h-4 w-4 text-player-glow" />}
          label="E-mail"
          value={profile.email}
        />
        <Row
          icon={<ShieldCheck className="h-4 w-4 text-player-glow" />}
          label="Membro desde"
          value={new Date(profile.created_at).toLocaleDateString("pt-BR")}
        />
        <PwaInstallRow />
      </div>

      {/* Admin Panel Link */}
      {isAdmin && (
        <Link
          to="/admin"
          className="glass-premium flex items-center gap-3.5 rounded-2xl p-4 border border-amber-500/30 transition-all duration-300 hover:border-amber-500/60 hover:bg-white/[0.05] shadow-lg group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-inner group-hover:scale-105 transition-transform">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-display font-black text-white text-sm sm:text-base">
              Painel do Administrador
            </p>
            <p className="text-xs text-muted-foreground">Gerenciar usuários, chave de API e mesa</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-amber-300 transition-all" />
        </Link>
      )}

      {/* Logout button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={logout}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 sm:h-13 bg-rose-500/10 font-bold text-rose-400 shadow-lg hover:bg-rose-500/15 transition-colors"
      >
        <LogOut className="h-4 w-4" /> Sair da conta
      </motion.button>
    </div>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="shrink-0">{icon}</span>
      <span className="shrink-0 text-xs sm:text-sm font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="ml-auto min-w-0 truncate text-xs sm:text-sm font-bold text-white">
        {value}
      </span>
    </div>
  );
}
