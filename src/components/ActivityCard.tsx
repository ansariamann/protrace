import * as React from "react";
import { Pause, Play, RotateCcw, Check, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { type Activity, formatHMS, formatMin, liveElapsed } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = { activity: Activity; now: number };

export function ActivityCard({ activity, now }: Props) {
  const {
    startActivity,
    pauseActivity,
    resetActivity,
    toggleComplete,
    renameActivity,
    deleteActivity,
  } = useAppState();
  const [expanded, setExpanded] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(activity.name);
  const [minutes, setMinutes] = React.useState(Math.round(activity.allocatedMs / 60_000));

  const elapsed = liveElapsed(activity, now);
  const allocated = activity.allocatedMs;
  const ratio = allocated > 0 ? elapsed / allocated : 0;
  const pct = Math.min(100, ratio * 100);
  const running = activity.runningSince != null;
  const over = elapsed > allocated;

  const barColor = activity.completed
    ? "bg-success"
    : over
      ? "bg-warning"
      : "bg-gradient-to-r from-primary to-[var(--primary-glow)]";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition-all",
        running && "ring-2 ring-primary/40",
        activity.completed && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "truncate text-base font-semibold",
                activity.completed && "line-through text-muted-foreground",
              )}
            >
              {activity.name}
            </h3>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-2xl font-bold tabular-nums tracking-tight",
                running && "text-primary",
              )}
            >
              {formatHMS(elapsed)}
            </span>
            <span className="text-xs text-muted-foreground">/ {formatMin(allocated)}</span>
          </div>
        </button>

        <button
          onClick={() => (running ? pauseActivity(activity.id) : startActivity(activity.id))}
          disabled={activity.completed}
          aria-label={running ? "Pause" : "Start"}
          className={cn(
            "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none",
            "bg-[var(--gradient-primary)]",
            running && "animate-pulse-ring",
          )}
        >
          {running ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && !activity.completed && (
        <p className="mt-1.5 text-[11px] font-medium text-warning-foreground/80">
          +{formatMin(elapsed - allocated)} over allocated
        </p>
      )}

      {/* Expanded actions */}
      {expanded && (
        <div className="mt-4 border-t border-border pt-3">
          {editing ? (
            <div className="space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Activity name"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      renameActivity(activity.id, name, minutes);
                      setEditing(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toggleComplete(activity.id)}
              >
                <Check className="h-4 w-4" />
                {activity.completed ? "Reopen" : "Complete"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => resetActivity(activity.id)}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => deleteActivity(activity.id)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
