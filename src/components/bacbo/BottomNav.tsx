import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bot, History, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/robos", label: "Robôs", icon: Bot },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40"
    >
      <div className="mx-auto max-w-md px-3.5 pb-safe sm:px-4">
        <div className="flex items-center justify-around rounded-[1.5rem] border border-white/10 bg-card/90 p-1.5 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.55)] backdrop-blur-md sm:rounded-[1.7rem] sm:p-2">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 sm:py-2 transition-transform active:scale-[0.98]"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[0.08] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.25)]"
                    transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}
                  />
                )}
                <Icon
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.22 : 0}
                  strokeWidth={active ? 2.3 : 1.9}
                  className={cn(
                    "relative h-[18px] w-[18px] transition-colors duration-200 sm:h-5 sm:w-5",
                    active ? "text-player-glow" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "relative text-[10px] font-bold sm:text-[11px] transition-colors duration-200",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
