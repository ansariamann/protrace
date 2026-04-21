import * as React from "react";
import {
  type Activity,
  type AppState,
  type Theme,
  defaultState,
  loadState,
  rolloverIfNewDay,
  saveState,
  stopActivity,
  liveElapsed,
  uid,
} from "@/lib/storage";
import { playCompletionChime, unlockAudio } from "@/lib/sound";

type Ctx = {
  state: AppState;
  // activities
  addActivity: (name: string, minutes: number) => void;
  startActivity: (id: string) => void;
  pauseActivity: (id: string) => void;
  resetActivity: (id: string) => void;
  toggleComplete: (id: string) => void;
  renameActivity: (id: string, name: string, minutes: number) => void;
  deleteActivity: (id: string) => void;
  /** Returns { added, skipped } so UI can give precise feedback. */
  applyTemplates: () => { added: number; skipped: number };
  // templates
  addTemplate: (name: string, minutes: number) => void;
  updateTemplate: (id: string, name: string, minutes: number) => void;
  deleteTemplate: (id: string) => void;
  // settings
  setTheme: (t: Theme) => void;
  setAutoApply: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  clearAll: () => void;
};

const AppCtx = React.createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState>(() => defaultState());
  const [hydrated, setHydrated] = React.useState(false);
  // Track which activities have already chimed to avoid repeat sounds.
  const chimedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const loaded = rolloverIfNewDay(loadState());
    setState(loaded);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  // Apply theme: dark is default; "light" adds .light, "dark"/"system-dark" removes it.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const apply = () => {
      const isLight =
        state.theme === "light" ||
        (state.theme === "system" &&
          !window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("light", isLight);
    };
    apply();
    if (state.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [state.theme]);

  React.useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(() => {
      setState((s) => rolloverIfNewDay(s));
    }, 60_000);
    return () => clearInterval(id);
  }, [hydrated]);

  // Watch for any running activity hitting its allocation → chime + auto-pause.
  React.useEffect(() => {
    if (!hydrated) return;
    const hasRunning = state.activities.some((a) => a.runningSince != null);
    if (!hasRunning) return;

    const tick = () => {
      const now = Date.now();
      let triggered: string | null = null;
      for (const a of state.activities) {
        if (a.runningSince == null || a.completed) continue;
        if (chimedRef.current.has(a.id)) continue;
        if (liveElapsed(a, now) >= a.allocatedMs) {
          triggered = a.id;
          break;
        }
      }
      if (triggered) {
        chimedRef.current.add(triggered);
        if (state.soundEnabled) playCompletionChime();
        // Auto-pause the finished one (still let user see "complete" state).
        setState((s) => ({
          ...s,
          activities: s.activities.map((a) =>
            a.id === triggered ? stopActivity(a) : a,
          ),
        }));
      }
    };

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state.activities, state.soundEnabled, hydrated]);

  const value = React.useMemo<Ctx>(
    () => ({
      state,
      addActivity: (name, minutes) =>
        setState((s) => ({
          ...s,
          activities: [
            ...s.activities,
            {
              id: uid(),
              name: name.trim() || "Untitled",
              allocatedMs: Math.max(1, Math.round(minutes)) * 60_000,
              elapsedMs: 0,
              runningSince: null,
              completed: false,
            },
          ],
        })),
      startActivity: (id) => {
        unlockAudio();
        chimedRef.current.delete(id);
        setState((s) => {
          const now = Date.now();
          const activities = s.activities.map((a) => {
            if (a.id === id) {
              if (a.completed) return a;
              return a.runningSince != null ? a : { ...a, runningSince: now };
            }
            return a.runningSince != null ? stopActivity(a, now) : a;
          });
          return { ...s, activities };
        });
      },
      pauseActivity: (id) =>
        setState((s) => ({
          ...s,
          activities: s.activities.map((a) => (a.id === id ? stopActivity(a) : a)),
        })),
      resetActivity: (id) => {
        chimedRef.current.delete(id);
        setState((s) => ({
          ...s,
          activities: s.activities.map((a) =>
            a.id === id ? { ...a, elapsedMs: 0, runningSince: null } : a,
          ),
        }));
      },
      toggleComplete: (id) =>
        setState((s) => ({
          ...s,
          activities: s.activities.map((a) => {
            if (a.id !== id) return a;
            const stopped = stopActivity(a);
            return { ...stopped, completed: !stopped.completed };
          }),
        })),
      renameActivity: (id, name, minutes) =>
        setState((s) => ({
          ...s,
          activities: s.activities.map((a) =>
            a.id === id
              ? {
                  ...a,
                  name: name.trim() || a.name,
                  allocatedMs: Math.max(1, Math.round(minutes)) * 60_000,
                }
              : a,
          ),
        })),
      deleteActivity: (id) => {
        chimedRef.current.delete(id);
        setState((s) => ({ ...s, activities: s.activities.filter((a) => a.id !== id) }));
      },
      applyTemplates: () =>
        setState((s) => {
          const existingNames = new Set(s.activities.map((a) => a.name.toLowerCase()));
          const additions: Activity[] = s.templates
            .filter((t) => !existingNames.has(t.name.toLowerCase()))
            .map((t) => ({
              id: uid(),
              name: t.name,
              allocatedMs: t.allocatedMs,
              elapsedMs: 0,
              runningSince: null,
              completed: false,
            }));
          return { ...s, activities: [...s.activities, ...additions] };
        }),
      addTemplate: (name, minutes) =>
        setState((s) => ({
          ...s,
          templates: [
            ...s.templates,
            {
              id: uid(),
              name: name.trim() || "Untitled",
              allocatedMs: Math.max(1, Math.round(minutes)) * 60_000,
            },
          ],
        })),
      updateTemplate: (id, name, minutes) =>
        setState((s) => ({
          ...s,
          templates: s.templates.map((t) =>
            t.id === id
              ? {
                  ...t,
                  name: name.trim() || t.name,
                  allocatedMs: Math.max(1, Math.round(minutes)) * 60_000,
                }
              : t,
          ),
        })),
      deleteTemplate: (id) =>
        setState((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) })),
      setTheme: (theme) => setState((s) => ({ ...s, theme })),
      setAutoApply: (v) => setState((s) => ({ ...s, autoApplyTemplates: v })),
      setSoundEnabled: (v) => setState((s) => ({ ...s, soundEnabled: v })),
      clearAll: () => {
        chimedRef.current.clear();
        setState(defaultState());
      },
    }),
    [state],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useAppState(): Ctx {
  const ctx = React.useContext(AppCtx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

/** Re-renders every `intervalMs`, but only when `active` is true. */
export function useTicker(intervalMs = 1000, active = true): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
