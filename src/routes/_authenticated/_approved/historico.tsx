import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_approved/historico")({
  beforeLoad: () => {
    throw redirect({ to: "/robos", replace: true });
  },
  component: () => null,
});
