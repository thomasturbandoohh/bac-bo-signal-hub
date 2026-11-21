import { cn } from "@/lib/utils";

/** Lightweight SVG robot icon */
export function RobotIcon({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full text-foreground/75"
        aria-hidden
      >
        <line
          x1="32"
          y1="6"
          x2="32"
          y2="14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="32" cy="5" r="3.2" stroke="currentColor" strokeWidth="2.2" />
        <rect x="14" y="14" width="36" height="36" rx="8" stroke="currentColor" strokeWidth="2.4" />
        <line
          x1="24"
          y1="28"
          x2="24"
          y2="36"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="40"
          y1="28"
          x2="40"
          y2="36"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
