import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Hourglass } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/ActivityCard";
import { EfficiencyRing } from "@/components/EfficiencyRing";
import { FullscreenStopwatch } from "@/components/FullscreenStopwatch";
import { useAppState, useTicker } from "@/hooks/use-app-state";
import { formatMin, liveElapsed } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Protrace" },
      {
        name: "description",
        content: "Today's activities and timers. Track how you spend your day.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { state, applyTemplates } = useAppState();
  const hasRunning = state.activities.some((a) => a.runningSince != null);
  const now = useTicker(1000, hasRunning);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const focusActivity =
    focusId != null ? state.activities.find((a) => a.id === focusId) ?? null : null;

  const totalAllocated = state.activities.reduce((s, a) => s + a.allocatedMs, 0);
  const totalElapsed = state.activities.reduce((s, a) => s + liveElapsed(a, now), 0);
  const totalRemaining = Math.max(0, totalAllocated - totalElapsed);
  const efficiency = totalAllocated > 0 ? totalElapsed / totalAllocated : 0;
  const pct = Math.round(efficiency * 100);
  const completedCount = state.activities.filter((a) => a.completed).length;

  const today = new Date();
  const dayName = today.toLocaleDateString(undefined, { weekday: "long" });
  const dateLabel = today.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 lg:px-10 lg:pt-12">
      {/* Editorial masthead */}
      <header className="border-b border-border pb-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
            ◆ Today
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {today.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <h1 className="mt-3 font-display text-5xl font-black leading-[0.95] tracking-tight lg:text-6xl">
          {dayName}.
          <br />
          <span className="text-muted-foreground">{dateLabel}</span>
        </h1>
      </header>

      {/* Hero stats */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Allocated" value={formatMin(totalAllocated)} />
          <Stat label="Used" value={formatMin(totalElapsed)} accent />
          <Stat label="Left" value={formatMin(totalRemaining)} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] lg:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Efficiency
            </p>
            <p className="mt-1 font-display text-3xl font-bold tracking-tight">
              {pct}<span className="text-lg text-muted-foreground">%</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {completedCount} of {state.activities.length} done
            </p>
          </div>
          <EfficiencyRing progress={efficiency} size={84} stroke={7} />
        </div>
      </section>

      {/* Activity list */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">
            Activities
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {state.activities.length} total
          </span>
        </div>

        <div className="mt-4 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {state.activities.length === 0 ? (
            <div className="lg:col-span-2">
              <EmptyState
                hasTemplates={state.templates.length > 0}
                onApplyTemplates={() => {
                  const { added } = applyTemplates();
                  if (added > 0) {
                    toast.success(`Loaded ${added} ${added === 1 ? "activity" : "activities"}`);
                  } else {
                    toast.error("No templates available");
                  }
                }}
              />
            </div>
          ) : (
            state.activities.map((a) => (
              <ActivityCard key={a.id} activity={a} now={now} onExpand={setFocusId} />
            ))
          )}
        </div>
      </section>

      <FullscreenStopwatch activity={focusActivity} onClose={() => setFocusId(null)} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-bold tabular-nums ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  hasTemplates,
  onApplyTemplates,
}: {
  hasTemplates: boolean;
  onApplyTemplates: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-[var(--shadow-card)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at top, var(--primary) 0%, transparent 50%)",
        }}
      />
      <div className="relative">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)]"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <Hourglass className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold tracking-tight">
          Plan your day
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {hasTemplates
            ? "Load your saved templates in one tap, or add new activities in Settings."
            : "Add activities in Settings to start tracking your day."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {hasTemplates && (
            <Button onClick={onApplyTemplates} size="lg">
              <Sparkles className="h-4 w-4" />
              Load templates
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link to="/settings">
              Manage activities
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
