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
    <div className="mx-auto space-y-3 pt-2 sm:space-y-4 sm:pt-3 lg:max-w-3xl">
      <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Perfil</h1>

      <div className="liquid-glass relative overflow-hidden rounded-[1.75rem] p-5 text-center sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-player/20 via-transparent to-banker/20 backdrop-blur-xl" />
        <div className="relative mx-auto mt-2 h-24 w-24 sm:mt-4 sm:h-28 sm:w-28">
          <Avatar
            value={avatar}
            name={profile.name}
            className="h-24 w-24 border-4 sm:h-28 sm:w-28 border-background shadow-xl"
            textClass="text-3xl"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Alterar foto de perfil"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-tie text-background shadow-lg disabled:opacity-70"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        </div>
        <h2 className="relative mt-3 font-display text-lg font-bold sm:mt-4 sm:text-xl">
          {profile.name || "Usuário"}
        </h2>
        <p className="relative mt-0.5 text-sm text-muted-foreground">{profile.email}</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative mt-2 text-xs font-semibold text-tie disabled:opacity-60"
        >
          {uploading ? "Enviando foto…" : "Alterar foto de perfil"}
        </button>
        <div className="relative mt-3 flex justify-center gap-2">
          <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
            Acesso aprovado
          </span>
          {isAdmin && (
            <span className="rounded-full border border-tie/30 bg-tie/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-tie">
              Admin
            </span>
          )}
        </div>
      </div>

      <div className="liquid-glass divide-y divide-border rounded-[1.5rem]">
        <Row icon={<UserRound className="h-4 w-4" />} label="Nome" value={profile.name} />
        <Row icon={<Mail className="h-4 w-4" />} label="E-mail" value={profile.email} />
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Membro desde"
          value={new Date(profile.created_at).toLocaleDateString("pt-BR")}
        />
      </div>

      {isAdmin && (
        <Link
          to="/admin"
          className="liquid-glass flex items-center gap-3 rounded-[1.5rem] p-4 transition-colors hover:bg-accent/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-tie/30 bg-tie/10 text-tie">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Painel do Administrador</p>
            <p className="text-xs text-muted-foreground">Cadastros e robô</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={logout}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-destructive/30 sm:h-14 bg-destructive/10 font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sair da conta
      </motion.button>
    </div>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto min-w-0 truncate text-sm font-medium">{value}</span>
    </div>
  );
}
