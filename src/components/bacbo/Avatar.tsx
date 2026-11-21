import { UserRound } from "lucide-react";
import { useAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function Avatar({
  value,
  name,
  className,
  textClass,
}: {
  value: string | null;
  name: string;
  className?: string;
  textClass?: string;
}) {
  const url = useAvatarUrl(value);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div className={cn("overflow-hidden rounded-full", className)}>
      {url ? (
        <img
          src={url}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={cn(
            "ball-player flex h-full w-full items-center justify-center font-display font-extrabold text-foreground",
            textClass,
          )}
        >
          {initials || <UserRound className="h-1/2 w-1/2" />}
        </div>
      )}
    </div>
  );
}
