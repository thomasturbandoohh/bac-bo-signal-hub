import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Logo } from "@/components/bacbo/Logo";
import cover from "@/assets/login-cover.jpg";

/** Fixed sparkle layout (no randomness during render, so server and browser match). */
const SPARKS = [
  { left: "12%", size: 4, delay: 0, duration: 7 },
  { left: "24%", size: 3, delay: 2.4, duration: 8.5 },
  { left: "37%", size: 5, delay: 1.1, duration: 6.5 },
  { left: "49%", size: 3, delay: 3.6, duration: 9 },
  { left: "58%", size: 4, delay: 0.6, duration: 7.5 },
  { left: "69%", size: 3, delay: 4.2, duration: 8 },
  { left: "78%", size: 5, delay: 1.8, duration: 6.8 },
  { left: "88%", size: 3, delay: 2.9, duration: 9.4 },
];

/**
 * Animated login cover: the photo settles in, then drifts slowly (Ken Burns) and follows the
 * pointer a little (parallax), with breathing neon glows, a light sweep and rising gold sparks.
 * Only transform/opacity are animated so it stays smooth on phones.
 */
export function LoginHero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 });
  const imgX = useTransform(sx, (v) => v * -14);
  const imgY = useTransform(sy, (v) => v * -10);
  const glowX = useTransform(sx, (v) => v * 22);
  const glowY = useTransform(sy, (v) => v * 16);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px.set(((e.clientX - r.left) / r.width - 0.5) * 2);
      py.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    const onLeave = () => {
      px.set(0);
      py.set(0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce, px, py]);

  return (
    <div
      ref={ref}
      className="relative isolate h-[37vh] min-h-[250px] w-full overflow-hidden sm:h-[34vh] sm:min-h-[240px] lg:h-[80vh] lg:w-1/2 lg:rounded-[2rem]"
    >
      {/* Photo: settles in, then slow drift + pointer parallax. */}
      <motion.div className="absolute -inset-6" style={{ x: imgX, y: imgY }}>
        <motion.img
          src={cover}
          alt="Dados azuis e vermelhos do Bac Bo sobre a mesa"
          width={1254}
          height={1254}
          className="h-full w-full object-cover object-[center_40%]"
          initial={{ scale: 1.28, opacity: 0, filter: "blur(10px)" }}
          animate={
            reduce
              ? { scale: 1.05, opacity: 1, filter: "blur(0px)" }
              : {
                  scale: [1.28, 1.06, 1.12, 1.06],
                  opacity: 1,
                  filter: "blur(0px)",
                }
          }
          transition={
            reduce
              ? { duration: 0.6 }
              : {
                  scale: {
                    duration: 22,
                    times: [0, 0.08, 0.55, 1],
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "mirror",
                  },
                  opacity: { duration: 0.9 },
                  filter: { duration: 1.2 },
                }
          }
        />
      </motion.div>

      {/* Breathing neon glows on the Player (blue) and Banker (red) sides. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{ x: glowX, y: glowY }}
      >
        <motion.span
          className="absolute -left-[12%] top-[18%] h-[55%] w-[45%] rounded-full bg-player-glow/40 blur-3xl"
          animate={
            reduce ? { opacity: 0.5 } : { opacity: [0.35, 0.75, 0.35], scale: [0.95, 1.1, 0.95] }
          }
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute -right-[12%] top-[22%] h-[55%] w-[45%] rounded-full bg-banker-glow/40 blur-3xl"
          animate={
            reduce ? { opacity: 0.5 } : { opacity: [0.75, 0.35, 0.75], scale: [1.1, 0.95, 1.1] }
          }
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Light sweep across the photo every few seconds. */}
      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-foreground/15 to-transparent"
          initial={{ left: "-45%" }}
          animate={{ left: ["-45%", "130%"] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            repeatDelay: 5,
            ease: "easeInOut",
            delay: 1.4,
          }}
        />
      )}

      {/* Gold sparks rising from the table. */}
      {!reduce &&
        SPARKS.map((s, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[8%] rounded-full bg-tie-glow shadow-[0_0_10px_var(--tie-glow)]"
            style={{ left: s.left, width: s.size, height: s.size }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [0, -160], opacity: [0, 1, 0], scale: [0.6, 1, 0.4] }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}

      {/* Wordmark over the photo. */}
      <div className="absolute inset-x-0 top-6 z-10 flex justify-center sm:top-7 lg:top-10">
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="drop-shadow-[0_4px_18px_var(--background)]"
        >
          <Logo />
        </motion.div>
      </div>

      {/* Soft vignette + fade into the form on phones. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,var(--background)_100%)] opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-transparent via-55% to-background lg:hidden" />
    </div>
  );
}
