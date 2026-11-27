import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/auth-middleware";
import { deleteAccountProblem } from "./access-rules";

/** Permanently removes a user's account, profile, roles and avatar. Admin only. */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Facts come from the database as the signed-in caller (RLS + security-definer has_role).
    const [
      { data: callerIsAdmin, error: callerRoleError },
      { data: targetIsAdmin, error: targetRoleError },
    ] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: data.userId, _role: "admin" }),
    ]);
    if (callerRoleError || targetRoleError || callerIsAdmin === null || targetIsAdmin === null) {
      return {
        ok: false as const,
        error: "Não foi possível verificar as permissões. Tente novamente.",
      };
    }
    const problem = deleteAccountProblem({
      callerId: context.userId,
      callerIsAdmin: callerIsAdmin === true,
      targetId: data.userId,
      targetIsAdmin: targetIsAdmin === true,
    });
    if (problem) return { ok: false as const, error: problem };

    if (!(await import("./admin-client.server")).serviceKey()) {
      return {
        ok: false as const,
        error: "Falta a chave de servidor (service_role) para excluir. Use Bloquear enquanto isso.",
      };
    }
    const { getAdminClient } = await import("./admin-client.server");
    const supabaseAdmin = getAdminClient();

    const { data: files } = await supabaseAdmin.storage.from("avatars").list(data.userId);
    if (files?.length) {
      await supabaseAdmin.storage
        .from("avatars")
        .remove(files.map((f) => `${data.userId}/${f.name}`));
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) {
      if (error.status === 401 || error.status === 403) {
        return {
          ok: false as const,
          error:
            "O Supabase recusou a chave de servidor. Verifique a configuração da chave de serviço.",
        };
      }
      return {
        ok: false as const,
        error:
          "Não foi possível excluir o cadastro no Supabase. Tente novamente ou verifique os registros do serviço.",
      };
    }
    return { ok: true as const };
  });
