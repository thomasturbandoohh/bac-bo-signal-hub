import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bot, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/robos", label: "Robôs", icon: Bot },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-md px-3.5 pb-safe sm:px-4">
        <div className="liquid-glass flex items-center justify-around rounded-[1.5rem] px-1.5 py-1.5 sm:rounded-[1.7rem] sm:px-2 sm:py-2">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 sm:py-2"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="glass-icon absolute inset-0 rounded-2xl"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.22 : 0}
                  strokeWidth={active ? 2.3 : 1.9}
                  className={cn(
                    "relative h-[18px] w-[18px] transition-colors sm:h-5 sm:w-5",
                    active ? "text-player-glow" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "relative text-[10px] font-bold sm:text-[11px] transition-colors",
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
