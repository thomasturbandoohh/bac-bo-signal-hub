import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getLiveTable } from "@/lib/live-table.functions";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type RobotSettings = Database["public"]["Tables"]["robot_settings"]["Row"];

export const settingsQuery = queryOptions({
  queryKey: ["robot_settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("robot_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },
  // Users pick up the admin switching the robot (or the table feed) on/off within a few seconds.
  refetchInterval: 4_000,
  // Hidden tabs stop polling; focus/mount reuse data fetched in the last 2s.
  refetchIntervalInBackground: false,
  staleTime: 2_000,
});

export const allProfilesQuery = queryOptions({
  queryKey: ["admin", "profiles"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  // Admin sees new pending registrations without manual refresh.
  refetchInterval: 8_000,
  refetchIntervalInBackground: false,
  staleTime: 4_000,
});

export type MyAccount = { profile: Profile | null; isAdmin: boolean };

/**
 * The signed-in user's profile and admin flag. Cached so switching tabs is instant;
 * it refreshes in the background so a blocked account is sent out within a minute.
 */
export const myAccountQuery = (userId: string) =>
  queryOptions({
    queryKey: ["me", userId],
    queryFn: async (): Promise<MyAccount> => {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      ]);
      if (profileRes.error) throw profileRes.error;
      return { profile: profileRes.data, isAdmin: !!roleRes.data };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

/**
 * Real rounds from the live table, plus the difference between this device's clock and the server's.
 * The polling cadence is set by the RobotProvider; callers must pass `enabled` from
 * `liveFeedEnabled` so a global pause stops every client.
 */
export const liveTableQuery = queryOptions({
  queryKey: ["live-table"],
  queryFn: async () => {
    const sent = Date.now();
    const data = await getLiveTable();
    const clockOffset = data.serverNow - Math.round((sent + Date.now()) / 2);
    return { ...data, clockOffset };
  },
  retry: 1,
  // Below the 2s polling cadence, so it never delays a poll; avoids a duplicate fetch on mount/focus.
  staleTime: 1_000,
  refetchIntervalInBackground: false,
});
