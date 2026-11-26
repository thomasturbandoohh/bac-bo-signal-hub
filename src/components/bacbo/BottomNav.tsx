import { Link, useLocation } from "@tanstack/react-router";
import { Bot, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/robos", label: "Robôs", icon: Bot },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-0 mx-auto w-fit z-40 px-3"
    >
      <div className="flex items-center gap-1.5 rounded-full border border-white/12 bg-[#10141e]/90 p-1.5 shadow-[0_14px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 ease-out",
                active
                  ? "bg-white/12 text-white shadow-[0_2px_10px_rgba(255,255,255,0.06)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 sm:h-4.5 sm:w-4.5 transition-colors",
                  active ? "text-player-glow drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" : "text-muted-foreground",
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
