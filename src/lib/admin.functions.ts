import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deleteAccountProblem } from "./access-rules";

/** Permanently removes a user's account, profile, roles and avatar. Admin only. */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Facts come from the database as the signed-in caller (RLS + security-definer has_role).
    const [{ data: callerIsAdmin }, { data: targetIsAdmin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: data.userId, _role: "admin" }),
    ]);
    const problem = deleteAccountProblem({
      callerId: context.userId,
      callerIsAdmin: callerIsAdmin === true,
      targetId: data.userId,
      targetIsAdmin: targetIsAdmin === true,
    });
    if (problem) throw new Error(problem);

    if (!(await import("./admin-client.server")).serviceKey()) {
      throw new Error(
        "Falta a chave de servidor (service_role) para excluir. Use Bloquear enquanto isso.",
      );
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
      console.error("deleteUser failed", error);
      throw new Error("Não foi possível excluir o cadastro.");
    }
    return { ok: true };
  });
