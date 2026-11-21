import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Server key of the database; the owner saves it as DB_SERVICE_ROLE_KEY. */
export const serviceKey = () =>
  process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["DB_SERVICE_ROLE_KEY"] || "";

export function getAdminClient() {
  const url = process.env["SUPABASE_URL"];
  const key = serviceKey();
  if (!url || !key) throw new Error("missing_service_key");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
