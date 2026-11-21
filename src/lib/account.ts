import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { myAccountQuery } from "@/lib/queries";

/** Live profile + admin flag for pages under the approved layout (updates right after edits). */
export function useMyAccount() {
  const ctx = useRouteContext({ from: "/_authenticated/_approved" });
  const { data } = useQuery(myAccountQuery(ctx.user.id));
  return {
    profile: data?.profile ?? ctx.profile,
    isAdmin: data?.isAdmin ?? ctx.isAdmin,
  };
}
