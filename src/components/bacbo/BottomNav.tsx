import { memo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Bot, History, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/robos", label: "Robôs", icon: Bot },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export const BottomNav = memo(function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegação principal da plataforma"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-0 mx-auto w-fit max-w-[calc(100vw-1.5rem)] z-40 px-2 sm:px-3 pointer-events-auto"
    >
      <div className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-white/15 bg-[#10141e]/95 p-1 sm:p-1.5 shadow-[0_14px_36px_-8px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 ease-out touch-manipulation motion-reduce:transition-none",
                active
                  ? "bg-white/15 text-white shadow-[0_2px_10px_rgba(255,255,255,0.08)] ring-1 ring-white/20"
                  : "text-white/75 hover:text-white hover:bg-white/[0.08]",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 sm:h-4.5 sm:w-4.5 transition-colors motion-reduce:transition-none",
                  active
                    ? "text-player-glow drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                    : "text-white/70",
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
