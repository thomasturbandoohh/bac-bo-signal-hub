<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Account access is gated by `profiles.status` (pending/approved/rejected/blocked); only admins may change it (DB trigger), so never let client code bypass that check.
- Roles live in `user_roles` with the `has_role` security-definer function; never store roles on profiles.
- The signal engine is pure functions in `src/lib/bacbo-engine.ts`; the shared schedule in `src/lib/robot-schedule.ts` derives signals deterministically from `robot_settings.started_at` and each round's `received_at` (fixed timing constants, no admin setting; rounds stored too late to bet are skipped; `analyze` scores each pattern from the exact dice odds plus its replayed record in the recent rounds and holds back on weak/conflicting/cold readings, all derived from rounds only; `analyze` also blocks patterns that go against the table cycle (`tableCycle`: no surf on a choppy table) and only enters at `STRICT_CONFIDENCE` calculated confluence with no opposing pattern, attaching a dice-margin `tieReading`; `decisionAfter` adds the single gale after a lost entry and never forces an entry, scored with the gale in `src/lib/scoreboard.ts`), so every client shows the same signal without a server job. `src/lib/robot-context.tsx` only wires settings, timers and session history.
- Only admins switch the robot on/off (`robot_settings.running`, admin-only update policy); clients poll settings, so never start signals from client-side state alone.
- The live table pause is global (`robot_settings.api_paused`, admin-only update policy): clients gate `liveTableQuery` with `liveFeedEnabled` from `src/lib/access-rules.ts` and the server skips provider sync while paused, so never keep a device-local pause flag.
- Server functions re-check authorization in the handler (`has_role`/`is_approved` via the caller's client) and keep pure decisions in `src/lib/access-rules.ts` so they are unit-tested; hiding routes or buttons is never the protection.
- Signal history is per login session in localStorage (keyed by user and `last_sign_in_at`, cleared on sign-out); the old `signals` table is deprecated.
- Avatars live in the private `avatars` bucket under `<user_id>/`; `profiles.avatar_url` stores the storage path (or an external Google URL) and is shown via short-lived signed URLs because public buckets are blocked in this workspace.
- Approved-only pages live under `src/routes/_authenticated/_approved/`; its `beforeLoad` reads the cached `myAccountQuery` (profile + admin flag) so tab switches skip the network, and pages read live values via `useMyAccount()`; edits such as a new avatar update that cache, never `router.invalidate()`.
- Admin is granted only by a `user_roles` row provisioned manually (README procedure); the signup trigger `handle_new_user` always creates a `pending` profile with only the `user` role, because e-mail-based grants are an escalation risk; never add them back.
- Deleting accounts goes through the admin-only `deleteUserAccount` server function (`src/lib/admin.functions.ts`), which checks `has_role` before using the service client, because removing auth users needs privileged access.
- The `_authenticated` guard reads the local session (`getSession`), not `getUser()`, because a server round-trip on every tab switch froze navigation on phones; data safety comes from RLS on each request.
- The 3D die is one shared three.js instance in `src/lib/die-engine.ts`, warmed in idle time by the approved layout and re-attached by `Cube3D`, so it never rebuilds WebGL per signal or per tab.
- App images are bundled files in `src/assets` imported directly (not `.asset.json` pointers), because the owner deploys to Vercel/Netlify where the `/__l5e/` asset paths don't exist.
- The live table feed calls the LynxMetrics API directly (`x-api-key`) with the key the admin saves in the panel (private `app-config` bucket), because there is no workspace connector for it; the robot only uses the unbroken recent run of rounds (`liveWindow`) and needs at least `MIN_HISTORY` of them before signaling.
- The backend is this project's own Lovable Cloud database; the schema lives in `drizzle/migrations` (applied through Lovable), and server code uses the platform-provided `SUPABASE_SERVICE_ROLE_KEY`.
- Liquid glass, water and dice looks are `@utility` classes in `src/styles.css` (`liquid-glass`, `glass-icon`, `pane-*`, `die-*`) plus the shared `Water` component (seamless wave layers; the board shows water low and no numbers except while a signal is open), so cards stay consistent and themeable.
