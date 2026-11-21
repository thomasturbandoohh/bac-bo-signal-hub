import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bac Bo Live — Robô de Sinais" },
      {
        name: "description",
        content:
          "Robô de sinais automáticos para Bac Bo Live com leitura de padrões e proteção de empate.",
      },
      { property: "og:title", content: "Bac Bo Live — Robô de Sinais" },
      {
        property: "og:description",
        content: "Sinais com padrões Xadrez, Surf, Parzinho, 3-1-3 e Rampa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/robos" : "/auth", replace: true });
  },
  component: () => null,
});
