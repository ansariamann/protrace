import * as React from "react";
import { Pause, Play, RotateCcw, Check, Trash2, ChevronDown, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    deleteActivity,
  } = useAppState();
  const [expanded, setExpanded] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const elapsed = liveElapsed(activity, now);
  const allocated = activity.allocatedMs;
  const remaining = Math.max(0, allocated - elapsed);
  const ratio = allocated > 0 ? elapsed / allocated : 0;
  const pct = Math.min(100, ratio * 100);
  const running = activity.runningSince != null;
  const finished = elapsed >= allocated;
  const over = elapsed > allocated;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all animate-slide-up",
        running && "border-primary/40 ring-1 ring-primary/30",
        activity.completed && "opacity-60",
      )}
    >
      {/* Subtle gradient halo when running */}
      {running && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at top right, var(--primary) 0%, transparent 60%)",
          }}
        />
      )}

      <div className="relative flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "truncate text-base font-semibold tracking-tight",
                activity.completed && "line-through text-muted-foreground",
              )}
            >
              {activity.name}
            </h3>
            {finished && !activity.completed && (
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Done
              </span>
            )}
          </div>

          {/* Big countdown */}
          <div className="mt-2 flex items-baseline gap-3">
            <span
              className={cn(
                "font-mono text-4xl font-bold tabular-nums tracking-tight transition-colors",
                running && !finished && "text-primary",
                finished && "text-primary",
                over && "text-warning",
              )}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatHMS(remaining)}
            </span>
            <span className="text-xs text-muted-foreground">left</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatMin(elapsed)} of {formatMin(allocated)} used
          </p>
        </div>

        <button
          onClick={() => (running ? pauseActivity(activity.id) : startActivity(activity.id))}
          disabled={activity.completed}
          aria-label={running ? "Pause" : "Start"}
          style={{ backgroundImage: "var(--gradient-primary)" }}
          className={cn(
            "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-glow)] transition-all active:scale-90 disabled:opacity-30 disabled:shadow-none",
            running && "animate-pulse-ring",
          )}
        >
          {running ? (
            <Pause className="h-7 w-7" fill="currentColor" />
          ) : (
            <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" />
          )}
        </button>
      </div>

      {/* Progress track — animated shimmer when running */}
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            !running && !finished && "bg-foreground/40",
            finished && !over && "bg-primary",
            over && "bg-warning",
            running && !finished && "shimmer-bar",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{Math.round(pct)}%</span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          {expanded ? "Hide" : "Actions"}
          <ChevronDown
            className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="actions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
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
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{activity.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes this activity from today. Time tracked so far is lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteActivity(activity.id);
                toast.success("Activity deleted");
                setConfirmDelete(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
