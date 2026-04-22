import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, RotateCcw, X, Maximize2 } from "lucide-react";
import { useAppState, useTicker } from "@/hooks/use-app-state";
import { type Activity, formatHMS, liveElapsed } from "@/lib/storage";
import { GlowBar } from "@/components/GlowBar";
import { cn } from "@/lib/utils";

type Props = {
  activity: Activity | null;
  onClose: () => void;
};

/** Fullscreen, immersive stopwatch view for a single activity. */
export function FullscreenStopwatch({ activity, onClose }: Props) {
  const { startActivity, pauseActivity, resetActivity } = useAppState();
  const running = activity?.runningSince != null;
  const now = useTicker(running ? 200 : 1000, !!activity);

  // Lock background scroll while open + ESC to close.
  React.useEffect(() => {
    if (!activity) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (running) pauseActivity(activity.id);
        else startActivity(activity.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [activity, running, startActivity, pauseActivity, onClose]);

  if (!activity) return null;

  const elapsed = liveElapsed(activity, now);
  const allocated = activity.allocatedMs;
  const remaining = Math.max(0, allocated - elapsed);
  const ratio = allocated > 0 ? elapsed / allocated : 0;
  const finished = elapsed >= allocated;
  const over = elapsed > allocated;

  // Split timer for big tabular display
  const totalSec = Math.max(0, Math.floor(remaining / 1000));
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");

  return (
    <AnimatePresence>
      <motion.div
        key="stopwatch-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-background"
      >
        {/* Ambient gradient bloom */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-700",
            running ? "opacity-100" : "opacity-50",
          )}
          style={{
            background: over
              ? "radial-gradient(ellipse at top, oklch(0.85 0.2 65 / 0.18) 0%, transparent 55%), radial-gradient(ellipse at bottom, oklch(0.7 0.22 35 / 0.15) 0%, transparent 60%)"
              : "radial-gradient(ellipse at top, oklch(0.85 0.18 200 / 0.18) 0%, transparent 55%), radial-gradient(ellipse at bottom, oklch(0.85 0.18 200 / 0.12) 0%, transparent 60%)",
          }}
        />

        {/* Top bar */}
        <div className="relative flex items-center justify-between p-5 lg:p-8">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              ◆ Focus
            </p>
            <h2 className="mt-1 truncate font-display text-2xl font-bold tracking-tight lg:text-3xl">
              {activity.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/50 text-foreground backdrop-blur-xl transition-all hover:bg-card active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Center timer */}
        <div className="relative flex h-[calc(100%-180px)] flex-col items-center justify-center px-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            {finished ? (over ? "Over time" : "Complete") : running ? "Running" : "Paused"}
          </p>

          <div
            className={cn(
              "flex items-center justify-center font-mono font-bold tabular-nums leading-none transition-colors",
              "text-[clamp(4rem,18vw,11rem)]",
              over ? "text-warning" : finished ? "text-primary" : running ? "text-foreground" : "text-foreground/85",
            )}
            style={{
              fontVariantNumeric: "tabular-nums",
              textShadow: running && !finished
                ? "0 0 60px oklch(0.85 0.18 200 / 0.4)"
                : over
                ? "0 0 60px oklch(0.85 0.2 65 / 0.4)"
                : "none",
            }}
          >
            <TimeDigit value={hh} />
            <Colon blink={running} />
            <TimeDigit value={mm} />
            <Colon blink={running} />
            <TimeDigit value={ss} />
          </div>

          <p className="mt-6 text-sm uppercase tracking-widest text-muted-foreground">
            {formatHMS(elapsed)} elapsed · {formatHMS(allocated)} planned
          </p>

          <div className="mt-10 w-full max-w-2xl px-2">
            <GlowBar
              value={ratio}
              tone={over ? "warning" : "primary"}
              active={running && !finished}
              height={22}
            />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-5 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => resetActivity(activity.id)}
            aria-label="Reset"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card/50 text-foreground backdrop-blur-xl transition-all hover:bg-card active:scale-90"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            onClick={() =>
              running ? pauseActivity(activity.id) : startActivity(activity.id)
            }
            aria-label={running ? "Pause" : "Start"}
            disabled={activity.completed}
            style={{ backgroundImage: "var(--gradient-primary)" }}
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-glow)] transition-all active:scale-90 disabled:opacity-30",
              running && "animate-pulse-ring",
            )}
          >
            {running ? (
              <Pause className="h-9 w-9" fill="currentColor" />
            ) : (
              <Play className="h-9 w-9 translate-x-0.5" fill="currentColor" />
            )}
          </button>

          <button
            onClick={onClose}
            aria-label="Minimize"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card/50 text-foreground backdrop-blur-xl transition-all hover:bg-card active:scale-90"
          >
            <Maximize2 className="h-5 w-5 rotate-180" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function TimeDigit({ value }: { value: string }) {
  return <span className="inline-block px-1">{value}</span>;
}

function Colon({ blink }: { blink: boolean }) {
  return (
    <span
      className={cn(
        "inline-block px-1 text-muted-foreground",
        blink && "animate-pulse",
      )}
    >
      :
    </span>
  );
}
