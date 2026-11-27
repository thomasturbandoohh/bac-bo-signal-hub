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

function maskToken(token: string): string {
  if (token.length <= 8) return "••••••••";
  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

/** Lê a configuração atual do bot do Telegram (Admin only). */
export const getTelegramSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: callerIsAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!callerIsAdmin) {
      throw new Error("Acesso restrito a administradores.");
    }
    const { getAdminClient } = await import("./admin-client.server");
    const admin = getAdminClient();
    const { readTelegramConfig, readTelegramState } = await import("./telegram.server");
    const cfg = await readTelegramConfig(admin);
    const state = await readTelegramState(admin);

    return {
      configured: !!(cfg?.botToken && cfg?.chatId),
      enabled: cfg?.enabled ?? true,
      botToken: cfg?.botToken ? maskToken(cfg.botToken) : "",
      chatId: cfg?.chatId ?? "",
      platformName: cfg?.platformName ?? "ElephantBet",
      platformUrl: cfg?.platformUrl ?? "https://www.elephantbet.com",
      tableName: cfg?.tableName ?? "Bac Bo Live",
      scoreboard: state.scoreboard ?? { directGreens: 0, galeGreens: 0, tieGreens: 0, reds: 0 },
      consecutiveGreens: state.consecutiveGreens ?? 0,
    };
  });

/** Salva as configurações do bot do Telegram (Admin only). */
export const saveTelegramSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      enabled: boolean;
      botToken?: string;
      chatId: string;
      platformName?: string;
      platformUrl?: string;
      tableName?: string;
    }) =>
      z
        .object({
          enabled: z.boolean(),
          botToken: z.string().optional(),
          chatId: z.string().min(1, "O ID do chat é obrigatório."),
          platformName: z.string().optional(),
          platformUrl: z.string().optional(),
          tableName: z.string().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: callerIsAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!callerIsAdmin) {
      return { ok: false as const, error: "Acesso restrito a administradores." };
    }

    const { getAdminClient } = await import("./admin-client.server");
    const admin = getAdminClient();
    const { readTelegramConfig, saveTelegramConfig } = await import("./telegram.server");
    const existing = await readTelegramConfig(admin);

    const tokenToSave =
      data.botToken && !data.botToken.includes("••••") ? data.botToken.trim() : existing?.botToken;

    if (!tokenToSave) {
      return { ok: false as const, error: "O token da API do bot é obrigatório." };
    }

    await saveTelegramConfig(admin, {
      enabled: data.enabled,
      botToken: tokenToSave,
      chatId: data.chatId.trim(),
      platformName: data.platformName?.trim() || "ElephantBet",
      platformUrl: data.platformUrl?.trim() || "https://www.elephantbet.com",
      tableName: data.tableName?.trim() || "Bac Bo Live",
    });

    return { ok: true as const };
  });

/** Envia mensagem de teste para o canal do Telegram (Admin only). */
export const testTelegramConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: { botToken?: string; chatId: string; platformName?: string; platformUrl?: string }) =>
      z
        .object({
          botToken: z.string().optional(),
          chatId: z.string().min(1, "O ID do chat é obrigatório."),
          platformName: z.string().optional(),
          platformUrl: z.string().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: callerIsAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!callerIsAdmin) {
      return { ok: false as const, error: "Acesso restrito a administradores." };
    }

    const { getAdminClient } = await import("./admin-client.server");
    const admin = getAdminClient();
    const { readTelegramConfig, testTelegramBot } = await import("./telegram.server");
    const existing = await readTelegramConfig(admin);

    const tokenToUse =
      data.botToken && !data.botToken.includes("••••") ? data.botToken.trim() : existing?.botToken;

    if (!tokenToUse) {
      return { ok: false as const, error: "O token da API do bot é obrigatório para testar." };
    }

    const res = await testTelegramBot(
      tokenToUse,
      data.chatId.trim(),
      data.platformName,
      data.platformUrl,
    );

    return res;
  });

/** Reseta o placar acumulado do Telegram (Admin only). */
export const resetTelegramScoreboardAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: callerIsAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!callerIsAdmin) {
      return { ok: false as const, error: "Acesso restrito a administradores." };
    }

    const { getAdminClient } = await import("./admin-client.server");
    const admin = getAdminClient();
    const { resetTelegramScoreboard } = await import("./telegram.server");
    const empty = await resetTelegramScoreboard(admin);

    return { ok: true as const, scoreboard: empty };
  });
