import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useRobot } from "@/lib/robot-context";
import { historyEntries, type HistoryEntry } from "@/lib/signal-history";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_approved/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Bac Bo Live" },
      {
        name: "description",
        content: "Todos os sinais que o robô Bac Bo Live mandou e o resultado de cada um.",
      },
      { property: "og:title", content: "Histórico — Bac Bo Live" },
      { property: "og:description", content: "Sinais do robô com Green, Red e Green no G1." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function HistoryPage() {
  const { sessionSignals, results, phase } = useRobot();
  const entries = useMemo(() => historyEntries(sessionSignals, results), [sessionSignals, results]);
  const counts = useMemo(() => {
    let green = 0,
      g1 = 0,
      red = 0;
    for (const e of entries) {
      if (e.result === "green") green++;
      else if (e.result === "green_g1") g1++;
      else if (e.result === "red") red++;
    }
    return { green, g1, red };
  }, [entries]);

  return (
    <div className="mx-auto space-y-3 pt-2 sm:space-y-4 sm:pt-3 lg:max-w-3xl">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Histórico</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Sinais desde que o robô foi ligado
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Count label="Green" value={counts.green} tone="text-success" />
        <Count label="Green G1" value={counts.g1} tone="text-success" />
        <Count label="Red" value={counts.red} tone="text-destructive" />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
          <History className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Nenhum sinal ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {phase === "off"
              ? "Quando o robô for ligado, os sinais aparecem aqui."
              : "O robô está analisando a mesa. Os sinais aparecem aqui assim que saírem."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {entries.map((e) => (
            <Row key={e.key} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-2 py-2.5 text-center">
      <p className={cn("font-display text-lg font-extrabold tabular-nums sm:text-xl", tone)}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

const BADGE: Record<HistoryEntry["result"], { text: string; cls: string }> = {
  green: { text: "GREEN", cls: "bg-success/15 text-success ring-success/35" },
  green_g1: { text: "GREEN G1", cls: "bg-success/15 text-success ring-success/35" },
  red: { text: "RED", cls: "bg-destructive/15 text-destructive ring-destructive/35" },
  pending: { text: "EM ANDAMENTO", cls: "bg-muted text-muted-foreground ring-border" },
};

function Row({ entry }: { entry: HistoryEntry }) {
  const badge = BADGE[entry.result];
  const player = entry.side === "player";
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 sm:px-4">
      <span className="w-11 font-display text-sm font-bold tabular-nums text-muted-foreground">
        {timeFmt.format(entry.at)}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={cn("h-4 w-4 shrink-0 rounded-full", player ? "ball-player" : "ball-banker")}
        />
        <span className="truncate text-sm font-semibold">
          {player ? "Player (Azul)" : "Banker (Vermelho)"}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide ring-1",
          badge.cls,
        )}
      >
        {badge.text}
      </span>
    </li>
  );
}
