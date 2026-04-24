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
  formatHMS,
} from "@/lib/storage";
import { playCompletionChime, unlockAudio } from "@/lib/sound";
import {
  requestNotificationPermission,
  showTimerNotification,
  clearTimerNotification,
} from "@/lib/notify";
import { toast } from "sonner";

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

  // Keep latest state in a ref so the watcher interval doesn't tear down on every change.
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const hasRunning = state.activities.some((a) => a.runningSince != null);

  // Watch for any running activity hitting its allocation → chime + auto-pause.
  // Also pushes live notification updates while tab is hidden.
  React.useEffect(() => {
    if (!hydrated || !hasRunning) {
      void clearTimerNotification();
      return;
    }

    const tick = () => {
      const s = stateRef.current;
      const now = Date.now();
      const triggered: string[] = [];
      let liveRunning: { id: string; name: string; remaining: number; elapsed: number; allocated: number } | null = null;

      for (const a of s.activities) {
        if (a.runningSince == null || a.completed) continue;
        const elapsed = (a.elapsedMs ?? 0) + (now - a.runningSince);
        if (!liveRunning) {
          liveRunning = {
            id: a.id,
            name: a.name,
            remaining: Math.max(0, a.allocatedMs - elapsed),
            elapsed,
            allocated: a.allocatedMs,
          };
        }
        if (chimedRef.current.has(a.id)) continue;
        if (elapsed >= a.allocatedMs) triggered.push(a.id);
      }

      // Push live notification for the first running activity
        if (liveRunning) {
        const pct = Math.min(100, Math.round((liveRunning.elapsed / liveRunning.allocated) * 100));
          void showTimerNotification({
          tag: `protrace-timer-${liveRunning.id}`,
          title: `⏱ ${liveRunning.name} · ${formatHMS(liveRunning.remaining)} left`,
          body: `${pct}% used — tap to open Protrace`,
        });
      }

      if (triggered.length === 0) return;
      for (const id of triggered) chimedRef.current.add(id);
      if (s.soundEnabled) playCompletionChime();
      void clearTimerNotification();
      setState((curr) => ({
        ...curr,
        activities: curr.activities.map((a) =>
          triggered.includes(a.id) ? stopActivity(a) : a,
        ),
      }));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hydrated, hasRunning]);

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
        // Ask for notification permission on the user gesture.
        void requestNotificationPermission().then((p) => {
          if (p === "unsupported") {
            toast.info("Notifications aren't supported in this browser");
          } else if (p === "denied") {
            toast.error("Notifications blocked — enable them in browser settings");
          } else if (p === "granted") {
            toast.success("Timer running — mobile notification is enabled");
          }
        });
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
      applyTemplates: () => {
        let added = 0;
        let skipped = 0;
        setState((s) => {
          const existingNames = new Set(s.activities.map((a) => a.name.toLowerCase()));
          const additions: Activity[] = [];
          for (const t of s.templates) {
            if (existingNames.has(t.name.toLowerCase())) {
              skipped++;
              continue;
            }
            additions.push({
              id: uid(),
              name: t.name,
              allocatedMs: t.allocatedMs,
              elapsedMs: 0,
              runningSince: null,
              completed: false,
            });
            added++;
          }
          if (additions.length === 0) return s;
          return { ...s, activities: [...s.activities, ...additions] };
        });
        return { added, skipped };
      },
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
