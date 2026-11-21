import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { isDieReady, warmDie } from "@/lib/die-engine";
import { cn } from "@/lib/utils";

/** Flat stand-in shown only for the moment before the 3D die is ready (first visit). */
function DieStandIn({ size }: { size: number }) {
  const cells = [0, 2, 4, 6, 8];
  return (
    <motion.div
      className="grid grid-cols-3 grid-rows-3 place-items-center rounded-[22%] bg-background p-[16%] shadow-lg ring-1 ring-foreground/15"
      style={{ width: size, height: size }}
      animate={{ rotate: [0, 12, -12, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={cn("h-[62%] w-[62%] rounded-full", cells.includes(i) && "bg-foreground")}
        />
      ))}
    </motion.div>
  );
}

export function Cube3D({ size = 96, className }: { size?: number; className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const box = Math.round(size * 1.7);
  const [ready, setReady] = useState(isDieReady);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;
    let detach = () => {};
    warmDie()
      ?.then((engine) => {
        if (cancelled) return;
        detach = engine.attach(mount, box);
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      detach();
    };
  }, [box]);

  return (
    <div
      className={cn("relative flex flex-col items-center", className)}
      style={{ height: box + 16 }}
    >
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: box, height: box }}
        animate={{
          y: [0, -10, 0],
          rotate: [0, 6, -6, 0],
        }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div ref={mountRef} className="absolute inset-0" />
        {!ready && <DieStandIn size={Math.round(size * 0.78)} />}
      </motion.div>

      {/* Shadow */}
      <motion.span
        className="absolute bottom-1 h-3 rounded-[50%] bg-foreground/15 blur-md"
        style={{ width: size * 0.9 }}
        animate={{ scaleX: [1, 0.75, 1], opacity: [0.85, 0.45, 0.85] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
