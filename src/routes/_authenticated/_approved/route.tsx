import { useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bacbo/BottomNav";
import { ResultBanner } from "@/components/bacbo/Scoreboard";
import { RobotProvider } from "@/lib/robot-context";
import { avatarUrlQuery } from "@/lib/avatar";
import { myAccountQuery } from "@/lib/queries";
import type { AccountNotice } from "@/lib/auth-helpers";

export const Route = createFileRoute("/_authenticated/_approved")({
  beforeLoad: async ({ context }) => {
    // Cached after the first load, so moving between tabs doesn't wait on the network.
    const { profile, isAdmin } = await context.queryClient.ensureQueryData(
      myAccountQuery(context.user.id),
    );
    if (!profile || profile.status !== "approved") {
      context.queryClient.removeQueries({ queryKey: myAccountQuery(context.user.id).queryKey });
      // /auth signs the session out when it receives a status notice.
      throw redirect({ to: "/auth", search: { status: noticeFor(profile?.status) } });
    }
    // Warm the profile photo in the background; never hold the tab switch for it.
    if (profile.avatar_url) {
      void context.queryClient.prefetchQuery(avatarUrlQuery(profile.avatar_url));
    }
    return { profile, isAdmin };
  },
  component: ApprovedLayout,
});

function noticeFor(status: string | undefined): AccountNotice {
  return status === "rejected" || status === "blocked" ? status : "pending";
}

function ApprovedLayout() {
  const { profile: initial, isAdmin: initialAdmin, user } = Route.useRouteContext();
  const { data } = useQuery(myAccountQuery(user.id));
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const profile = data?.profile ?? initial;
  const isAdmin = data?.isAdmin ?? initialAdmin;
  const sessionStart = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;

  // Background refresh: send the user out as soon as the admin blocks or removes the account.
  useEffect(() => {
    if (data && data.profile?.status !== "approved") {
      void navigate({
        to: "/auth",
        search: { status: noticeFor(data.profile?.status) },
        replace: true,
      });
    }
  }, [data, navigate]);

  return (
    <RobotProvider userId={profile.id} sessionStart={sessionStart} isAdmin={isAdmin}>
      <div aria-hidden="true" className="bg-ambient pointer-events-none fixed inset-0 z-0" />
      <div className="relative z-10 mx-auto min-h-screen max-w-md px-3.5 pb-28 pt-3 sm:px-4 sm:pt-4 md:max-w-2xl md:pb-32 lg:max-w-5xl lg:px-6">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </div>
      <BottomNav />
      <ResultBanner />
    </RobotProvider>
  );
}
