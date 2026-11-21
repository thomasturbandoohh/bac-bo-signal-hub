import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Wordmark limpo — identidade Bac · Bo Live. */
export function Logo({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("flex flex-col items-center", className)}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="font-display text-[26px] font-bold leading-none tracking-[0.16em] text-foreground sm:text-[28px]">
        BAC<span className="mx-0.5 text-player-glow/80">·</span>BO
      </span>
      <span className="mt-2 flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.42em] text-muted-foreground">
        <span className="h-px w-7 bg-gradient-to-r from-transparent to-player" />
        Live
        <span className="h-px w-7 bg-gradient-to-l from-transparent to-banker" />
      </span>
    </motion.div>
  );
}
