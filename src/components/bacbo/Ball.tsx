import { cn } from "@/lib/utils";

type Kind = "player" | "banker" | "tie";

export function Ball({
  kind,
  size = 28,
  label,
  className,
}: {
  kind: Kind;
  size?: number;
  label?: string;
  className?: string;
}) {
  const cls = kind === "player" ? "ball-player" : kind === "banker" ? "ball-banker" : "ball-tie";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-foreground",
        cls,
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      <span className="absolute left-[22%] top-[14%] h-[22%] w-[34%] rounded-full bg-foreground/50 blur-[1px]" />
      {label && <span className="relative drop-shadow">{label}</span>}
    </span>
  );
}

export const outcomeKind = (o: "P" | "B" | "T"): Kind =>
  o === "P" ? "player" : o === "B" ? "banker" : "tie";
export const outcomeLabel = (o: "P" | "B" | "T") => (o === "P" ? "P" : o === "B" ? "B" : "T");
