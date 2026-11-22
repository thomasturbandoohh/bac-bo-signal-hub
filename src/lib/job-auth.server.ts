import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Accepts the scheduler in the owner's own Supabase (pg_cron + pg_net), which sends
 * `Authorization: Bearer <SYNC_JOB_SECRET>`. Returns true only on an exact match.
 */
export function isSyncJobRequest(request: Request): boolean {
  const secret = process.env["SYNC_JOB_SECRET"];
  if (!secret) return false;
  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return false;
  const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
  return timingSafeEqual(digest(token), digest(secret));
}
