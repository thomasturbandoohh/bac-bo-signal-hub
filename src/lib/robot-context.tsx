import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { liveTableQuery, settingsQuery, type RobotSettings } from "@/lib/queries";
import type { LiveRound } from "@/lib/live-table";
import {
  AUTO_CONFIDENCE,
  liveWindow,
  mergeSignals,
  robotView,
  signalsBetween,
  SIGNAL_HISTORY_LIMIT,
  type RobotView,
  type ScheduleConfig,
  type SessionSignal,
} from "@/lib/robot-schedule";
import { clearHistory, loadHistory, saveHistory } from "@/lib/session-history";
import { scoreSignals } from "@/lib/scoreboard";
import { liveFeedEnabled, robotActive } from "@/lib/access-rules";

interface RobotState extends RobotView {
  running: boolean;
  maintenance: boolean;
  /** Global pause of the live table feed (robot_settings.api_paused), shared by every client. */
  apiPaused: boolean;
  /** This client may call the live table (settings loaded and feed not paused). */
  liveEnabled: boolean;
  apiToggling: boolean;
  isAdmin: boolean;
  rounds: LiveRound[];
  clockOffset: number;
  feed: { lastSuccessAt: number | null; lastError: string | null } | null;
  tableError: boolean;
  sessionSignals: SessionSignal[];
  toggling: boolean;
  toggle: () => void;
  toggleApiPause: () => void;
  pausedUntil: number | null;
}

const RobotCtx = createContext<RobotState | null>(null);
const NO_ROUNDS: LiveRound[] = [];
const PAUSE_MS = 5 * 60 * 1000;
/** Old device-only pause flag; the global column replaced it, so it is only cleaned up. */
const LEGACY_API_PAUSE_KEY = "bacbo:api-paused";
const ADMIN_LOG_KEY = "bacbo:admin-log";

function logAdminAction(action: string) {
  try {
    const prev = JSON.parse(localStorage.getItem(ADMIN_LOG_KEY) || "[]") as string[];
    const entry = `${new Date().toLocaleString("pt-BR")} — ${action}`;
    localStorage.setItem(ADMIN_LOG_KEY, JSON.stringify([entry, ...prev].slice(0, 30)));
  } catch {
    /* ignore */
  }
}

export function RobotProvider({
  userId,
  sessionStart,
  isAdmin,
  children,
}: {
  userId: string;
  sessionStart: number;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const running = !!settings?.running && !!settings.started_at;
  const maintenance = settings?.maintenance ?? false;

  const apiPaused = settings?.api_paused ?? false;
  const switches = { loaded: !!settings, running, maintenance, apiPaused };
  const liveEnabled = liveFeedEnabled(switches);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_API_PAUSE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const [pausedUntil, setPausedUntil] = useState<number | null>(null);
  const isPaused = pausedUntil !== null && Date.now() < pausedUntil;

  const active = robotActive(switches);

  const live = useQuery({
    ...liveTableQuery,
    enabled: liveEnabled,
    refetchInterval: active && !isPaused ? 2_000 : false,
  });
  const allRounds = live.data?.rounds ?? NO_ROUNDS;
  const clockOffset = live.data?.clockOffset ?? 0;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + clockOffset), 5_000);
    return () => clearInterval(id);
  }, [clockOffset]);

  const liveRun = liveWindow(allRounds, now);
  const windowStart = allRounds.length - liveRun.length;
  const rounds = useMemo(
    () => (windowStart === 0 ? allRounds : allRounds.slice(windowStart)),
    [allRounds, windowStart],
  );
  const [sessionSignals, setSessionSignals] = useState<SessionSignal[]>([]);

  // Load once per user; history persists across logins and reloads.
  useEffect(() => {
    setSessionSignals(loadHistory(userId, sessionStart));
  }, [userId, sessionStart]);

  // Reset greens / reds / sequence ONLY when the robot is turned off, goes to
  // maintenance, or the API is paused. Reload / leave-and-return do NOT clear.
  const wasAlive = useRef(false);
  useEffect(() => {
    if (!settings) return;
    const alive = running && !maintenance && !apiPaused;
    if (wasAlive.current && !alive) {
      clearHistory(userId);
      setSessionSignals([]);
      logAdminAction("Histórico de sinais zerado (robô desligado / manutenção / API pausada)");
    }
    wasAlive.current = alive;
  }, [settings, running, maintenance, apiPaused, userId]);

  const startedAt = settings?.started_at ? Date.parse(settings.started_at) : 0;
  const minConfidence = AUTO_CONFIDENCE;

  const cfg = useMemo<ScheduleConfig | null>(
    () => (active && !isPaused ? { startedAt, minConfidence } : null),
    [active, isPaused, startedAt, minConfidence],
  );

  useEffect(() => setNow(Date.now() + clockOffset), [cfg, allRounds, clockOffset]);
  const view = useMemo(() => robotView(cfg, rounds, now), [cfg, rounds, now]);

  useEffect(() => {
    if (!Number.isFinite(view.wakeAt)) return;
    const wait = view.wakeAt - (Date.now() + clockOffset) + 30;
    const t = setTimeout(() => setNow(Date.now() + clockOffset), Math.max(50, wait));
    return () => clearTimeout(t);
  }, [view.wakeAt, clockOffset]);

  useEffect(() => {
    if (!cfg || maintenance || apiPaused) return;
    // Use robot start time only — signals keep accumulating when the user reloads or returns.
    const found = signalsBetween(cfg, rounds, cfg.startedAt, now);
    if (!found.length) return;
    setSessionSignals((prev) => {
      const next = mergeSignals(prev, found);
      if (next.length === prev.length && next[0]?.key === prev[0]?.key) return prev;
      const limited = next.slice(0, SIGNAL_HISTORY_LIMIT);
      saveHistory(userId, sessionStart, limited);
      return limited;
    });
  }, [cfg, rounds, now, sessionStart, userId, maintenance, apiPaused]);

  // Auto-pause after 3 consecutive losses — silent (no toast / animation)
  useEffect(() => {
    if (!active || isPaused) return;
    const results = scoreSignals(sessionSignals, rounds);
    const last3 = results.slice(-3);
    if (last3.length === 3 && last3.every((r) => !r.green)) {
      const until = Date.now() + PAUSE_MS;
      setPausedUntil(until);
      void supabase
        .from("robot_settings")
        .update({
          running: false,
          started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      logAdminAction("Auto-pausa após 3 reds");
    }
  }, [sessionSignals, rounds, active, isPaused]);

  const mutation = useMutation({
    mutationFn: async (on: boolean) => {
      if (isPaused && on) throw new Error("paused");
      const stamp = new Date(Date.now() + clockOffset).toISOString();
      const patch = {
        running: on,
        started_at: on ? stamp : null,
        ...(on ? { maintenance: false } : {}),
        updated_at: stamp,
      };
      const { data, error } = await supabase
        .from("robot_settings")
        .update(patch)
        .eq("id", 1)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: RobotSettings) => {
      queryClient.setQueryData(settingsQuery.queryKey, data);
      if (data.running) void queryClient.invalidateQueries({ queryKey: liveTableQuery.queryKey });
      const msg = data.running ? "Robô ligado para todos os usuários" : "Robô pausado 🛑";
      toast.success(msg);
      logAdminAction(data.running ? "Ligou o robô" : "Pausou o robô");
    },
    onError: (e) => {
      if (e instanceof Error && e.message === "paused") {
        toast.error("Robô em pausa automática. Aguarde 5 minutos.");
      } else {
        toast.error("Não foi possível alterar o robô.");
      }
    },
  });

  const toggle = useCallback(() => {
    if (!isAdmin || mutation.isPending || isPaused) return;
    mutation.mutate(!running);
  }, [isAdmin, mutation, running, isPaused]);

  const apiPause = useMutation({
    mutationFn: async (paused: boolean) => {
      const { data, error } = await supabase
        .from("robot_settings")
        .update({ api_paused: paused, updated_at: new Date().toISOString() })
        .eq("id", 1)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: RobotSettings) => {
      queryClient.setQueryData(settingsQuery.queryKey, data);
      // Reactivating: mark the table stale so it refetches as soon as the query is enabled again.
      if (!data.api_paused) {
        void queryClient.invalidateQueries({ queryKey: liveTableQuery.queryKey });
      }
      toast.success(data.api_paused ? "API da mesa pausada para todos" : "API da mesa reativada");
      logAdminAction(data.api_paused ? "Pausou a API" : "Reativou a API");
    },
    onError: () => {
      toast.error("Não foi possível alterar a API da mesa.");
      void queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey });
    },
  });

  const toggleApiPause = useCallback(() => {
    if (!isAdmin || apiPause.isPending || !settings) return;
    apiPause.mutate(!apiPaused);
  }, [isAdmin, apiPause, apiPaused, settings]);

  const tableError = live.isError;
  const feed = live.data?.feed ?? null;

  const value = useMemo<RobotState>(
    () => ({
      ...view,
      phaseStart: view.phaseStart - clockOffset,
      phaseEnd: view.phaseEnd - clockOffset,
      wakeAt: view.wakeAt - clockOffset,
      running: running && !isPaused,
      maintenance,
      apiPaused,
      liveEnabled,
      apiToggling: apiPause.isPending,
      isAdmin,
      rounds,
      clockOffset,
      feed,
      tableError,
      sessionSignals,
      toggling: mutation.isPending,
      toggle,
      toggleApiPause,
      pausedUntil,
    }),
    [
      view,
      clockOffset,
      running,
      isPaused,
      maintenance,
      apiPaused,
      liveEnabled,
      apiPause.isPending,
      isAdmin,
      rounds,
      feed,
      tableError,
      sessionSignals,
      mutation.isPending,
      toggle,
      toggleApiPause,
      pausedUntil,
    ],
  );

  return <RobotCtx.Provider value={value}>{children}</RobotCtx.Provider>;
}

export function useRobot() {
  const ctx = useContext(RobotCtx);
  if (!ctx) throw new Error("useRobot must be used inside RobotProvider");
  return ctx;
}
