// Local persistence layer for the Daily Activity Timer.
// Everything is stored in localStorage. Pure functions, no React.

export type Activity = {
  id: string;
  name: string;
  allocatedMs: number;
  // Total elapsed milliseconds accumulated from completed run sessions.
  elapsedMs: number;
  // If running, timestamp (ms) when the current run started. Otherwise null.
  runningSince: number | null;
  completed: boolean;
};

export type DaySnapshot = {
  date: string; // YYYY-MM-DD (local)
  activities: Array<{
    name: string;
    allocatedMs: number;
    elapsedMs: number;
    completed: boolean;
  }>;
};

export type Template = {
  id: string;
  name: string;
  allocatedMs: number;
};

export type Theme = "light" | "dark" | "system";

export type AppState = {
  currentDate: string; // YYYY-MM-DD
  activities: Activity[];
  history: DaySnapshot[]; // newest first, max 5
  templates: Template[];
  theme: Theme;
  autoApplyTemplates: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
};

const STORAGE_KEY = "dat.state.v1";
const MAX_HISTORY = 5;

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const DEFAULT_TEMPLATES: Template[] = [
  { id: uid(), name: "Deep Work", allocatedMs: 90 * 60_000 },
  { id: uid(), name: "Exercise", allocatedMs: 45 * 60_000 },
  { id: uid(), name: "Reading", allocatedMs: 30 * 60_000 },
  { id: uid(), name: "Learning", allocatedMs: 60 * 60_000 },
];

export function defaultState(): AppState {
  return {
    currentDate: todayKey(),
    activities: [],
    history: [],
    templates: DEFAULT_TEMPLATES,
    theme: "dark",
    autoApplyTemplates: true,
    soundEnabled: true,
    vibrationEnabled: true,
  };
}

/** Remaining ms until allocation runs out (>= 0, clamped). */
export function remainingMs(a: Activity, now = Date.now()): number {
  return Math.max(0, a.allocatedMs - liveElapsed(a, now));
}

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Snapshots current activities into history and resets for a new day. */
export function rolloverIfNewDay(state: AppState): AppState {
  const today = todayKey();
  if (state.currentDate === today) return state;

  // Stop any running timers and accumulate.
  const stopped = state.activities.map((a) => stopActivity(a));

  const snapshot: DaySnapshot = {
    date: state.currentDate,
    activities: stopped.map((a) => ({
      name: a.name,
      allocatedMs: a.allocatedMs,
      elapsedMs: a.elapsedMs,
      completed: a.completed,
    })),
  };

  const history = [snapshot, ...state.history].slice(0, MAX_HISTORY);

  let newActivities: Activity[] = [];
  if (state.autoApplyTemplates) {
    newActivities = state.templates.map((t) => ({
      id: uid(),
      name: t.name,
      allocatedMs: t.allocatedMs,
      elapsedMs: 0,
      runningSince: null,
      completed: false,
    }));
  }

  return {
    ...state,
    currentDate: today,
    activities: newActivities,
    history,
  };
}

export function stopActivity(a: Activity, now = Date.now()): Activity {
  if (a.runningSince == null) return a;
  return {
    ...a,
    elapsedMs: a.elapsedMs + Math.max(0, now - a.runningSince),
    runningSince: null,
  };
}

export function liveElapsed(a: Activity, now = Date.now()): number {
  if (a.runningSince == null) return a.elapsedMs;
  return a.elapsedMs + Math.max(0, now - a.runningSince);
}

export function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatMin(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export function efficiency(allocated: number, elapsed: number): number {
  if (allocated <= 0) return 0;
  return Math.min(1, elapsed / allocated);
}
