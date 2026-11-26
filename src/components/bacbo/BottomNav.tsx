import { memo, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Bot, History, Menu, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/robos", label: "Robôs", icon: Bot },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export const BottomNav = memo(function BottomNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <nav
      ref={navRef}
      aria-label="Navegação principal"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3.5 z-40 sm:left-4"
    >
      {open && (
        <div
          id="main-navigation"
          className="mb-2 flex min-w-40 flex-col gap-1 rounded-[1.5rem] border border-white/10 bg-card/95 p-1.5 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.55)] backdrop-blur-md"
        >
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition-colors",
                  active ? "bg-white/[0.08] text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-player-glow")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? "main-navigation" : undefined}
        onClick={() => setOpen((previous) => !previous)}
        className="flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-card/95 px-4 text-sm font-bold text-foreground shadow-[0_12px_36px_-10px_rgba(0,0,0,0.55)] backdrop-blur-md"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        {open ? "Fechar" : "Menu"}
      </button>
    </nav>
  );
});
