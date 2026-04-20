import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import { EfficiencyRing } from "@/components/EfficiencyRing";
import { useAppState, useTicker } from "@/hooks/use-app-state";
import {
  type DaySnapshot,
  formatMin,
  liveElapsed,
  todayKey,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Daily Activity Timer" },
      { name: "description", content: "Review the last 5 days of tracked activities." },
    ],
  }),
  component: HistoryPage,
});

type DayLite = {
  date: string;
  isToday: boolean;
  activities: Array<{ name: string; allocatedMs: number; elapsedMs: number; completed?: boolean }>;
};

function HistoryPage() {
  const { state } = useAppState();
  const hasRunning = state.activities.some((a) => a.runningSince != null);
  const now = useTicker(2000, hasRunning);

  const days: DayLite[] = React.useMemo(() => {
    const today: DayLite = {
      date: todayKey(),
      isToday: true,
      activities: state.activities.map((a) => ({
        name: a.name,
        allocatedMs: a.allocatedMs,
        elapsedMs: liveElapsed(a, now),
        completed: a.completed,
      })),
    };
    const past: DayLite[] = state.history.map((d: DaySnapshot) => ({
      date: d.date,
      isToday: false,
      activities: d.activities,
    }));
    return [today, ...past].slice(0, 5);
  }, [state.activities, state.history, now]);

  const [selected, setSelected] = React.useState(0);
  const day = days[selected];

  const allocated = day?.activities.reduce((s, a) => s + a.allocatedMs, 0) ?? 0;
  const tracked = day?.activities.reduce((s, a) => s + a.elapsedMs, 0) ?? 0;
  const eff = allocated > 0 ? tracked / allocated : 0;

  // Bar chart max for normalization
  const chartMax = Math.max(
    1,
    ...days.map((d) =>
      Math.max(
        d.activities.reduce((s, a) => s + a.allocatedMs, 0),
        d.activities.reduce((s, a) => s + a.elapsedMs, 0),
      ),
    ),
  );

  return (
    <div className="px-5 pt-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">History</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Last 5 days</h1>
      </header>

      {/* Day chips */}
      <div className="-mx-5 mt-5 overflow-x-auto px-5 pb-1">
        <div className="flex gap-2">
          {days.map((d, i) => (
            <button
              key={d.date}
              onClick={() => setSelected(i)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                selected === i
                  ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "border-border bg-card text-foreground hover:bg-accent",
              )}
            >
              {chipLabel(d.date, d.isToday)}
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-medium text-muted-foreground">Allocated vs tracked</p>
        <div className="mt-4 flex items-end justify-between gap-2 h-32">
          {[...days].reverse().map((d, idx) => {
            const aTotal = d.activities.reduce((s, a) => s + a.allocatedMs, 0);
            const tTotal = d.activities.reduce((s, a) => s + a.elapsedMs, 0);
            const aH = (aTotal / chartMax) * 100;
            const tH = (tTotal / chartMax) * 100;
            const reverseIndex = days.length - 1 - idx;
            const isSel = reverseIndex === selected;
            return (
              <button
                key={d.date}
                onClick={() => setSelected(reverseIndex)}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="flex h-24 w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 rounded-t bg-muted"
                    style={{ height: `${Math.max(2, aH)}%` }}
                    title="Allocated"
                  />
                  <div
                    className={cn(
                      "w-1/2 rounded-t bg-primary transition-opacity",
                      !isSel && "opacity-50",
                    )}
                    style={{
                      height: `${Math.max(2, tH)}%`,
                      backgroundImage: "var(--gradient-primary)",
                    }}
                    title="Tracked"
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isSel ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {shortLabel(d.date, d.isToday)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded bg-muted" /> Allocated
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-3 rounded bg-primary"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            />{" "}
            Tracked
          </span>
        </div>
      </div>

      {/* Day summary */}
      {day && (
        <>
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <EfficiencyRing
              progress={eff}
              size={80}
              stroke={8}
              label={`${Math.round(eff * 100)}%`}
              sublabel="Used"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">{fullLabel(day.date, day.isToday)}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatMin(tracked)} tracked of {formatMin(allocated)} allocated
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {day.activities.length} {day.activities.length === 1 ? "activity" : "activities"}
              </p>
            </div>
          </div>

          {/* Activity list */}
          <section className="mt-4 space-y-2">
            {day.activities.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                No activities recorded for this day.
              </p>
            ) : (
              day.activities.map((a, i) => {
                const ratio = a.allocatedMs > 0 ? a.elapsedMs / a.allocatedMs : 0;
                const status = statusFor(ratio);
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{a.name}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          status.cls,
                        )}
                      >
                        {Math.round(ratio * 100)}%
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{formatMin(a.elapsedMs)} tracked</span>
                      <span>{formatMin(a.allocatedMs)} allocated</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", status.bar)}
                        style={{ width: `${Math.min(100, ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}

function statusFor(ratio: number) {
  if (ratio >= 0.85 && ratio <= 1.1) {
    return { cls: "bg-success/15 text-success", bar: "bg-success" };
  }
  if (ratio > 1.1) {
    return { cls: "bg-warning/20 text-warning-foreground", bar: "bg-warning" };
  }
  return { cls: "bg-muted text-muted-foreground", bar: "bg-primary/60" };
}

function chipLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  const diff = daysAgo(d);
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function shortLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function fullLabel(dateStr: string, isToday: boolean): string {
  const d = new Date(dateStr + "T00:00:00");
  const base = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return isToday ? `Today · ${base}` : base;
}

function daysAgo(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - target.getTime()) / 86_400_000);
}
