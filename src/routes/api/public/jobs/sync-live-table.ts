import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Scheduled job: keeps storing the table's rounds while the robot is on, even when nobody has the
 * app open, so the signals and results of the whole run are there when users come back.
 */
export const Route = createFileRoute("/api/public/jobs/sync-live-table")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const { getAdminClient } = await import("@/lib/admin-client.server");
        const { data: settings } = await getAdminClient()
          .from("robot_settings")
          .select("running, api_paused")
          .eq("id", 1)
          .maybeSingle();
        if (!settings?.running || settings.api_paused) {
          return Response.json({ skipped: true });
        }
        const { syncLiveRounds } = await import("@/lib/live-table.server");
        await syncLiveRounds();
        return Response.json({ ok: true });
      },
    },
  },
});
