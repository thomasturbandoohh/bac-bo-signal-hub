import { memo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Bot, UserRound, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/robos", label: "Robôs", icon: Bot },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export const BottomNav = memo(function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegação principal da plataforma"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-0 mx-auto w-fit max-w-[calc(100vw-1.5rem)] z-40 px-2 sm:px-3 pointer-events-auto select-none"
    >
      <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#090d18]/92 p-1.5 shadow-[0_20px_45px_-8px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm font-black transition-all duration-300 ease-out touch-manipulation motion-reduce:transition-none",
                active
                  ? "bg-gradient-to-r from-white/[0.14] to-white/[0.08] text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] ring-1 ring-white/25"
                  : "text-white/60 hover:text-white hover:bg-white/[0.06]",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 sm:h-4.5 sm:w-4.5 transition-all duration-300",
                  active
                    ? "text-player-glow scale-110 drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]"
                    : "text-white/60",
                )}
              />
              <span className="tracking-wide">{label}</span>
              {active && (
                <span className="absolute -bottom-0.5 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full bg-player-glow shadow-[0_0_8px_rgba(56,189,248,1)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
