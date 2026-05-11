import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { playCompletionChime, stopCompletionChime, unlockAudio } from "@/lib/sound";

export const Route = createFileRoute("/stopwatch")({
  head: () => ({
    meta: [{ title: "Timer — Protrace" }],
  }),
  component: StopwatchPage,
});

/* ─── SVG Ring ─────────────────────────────────────────────────── */
const R = 45;
const CIRC = 2 * Math.PI * R;

function Ring({ pct, isFinished }: { pct: number; isFinished: boolean }) {
  const offset = CIRC * (1 - Math.min(pct, 100) / 100);

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full"
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.78 0.2 95)" />
          <stop offset="60%" stopColor="oklch(0.88 0.21 118)" />
          <stop offset="100%" stopColor="oklch(0.95 0.08 175)" />
        </linearGradient>
        <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.88 0.18 65)" />
          <stop offset="100%" stopColor="oklch(0.72 0.22 28)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Track */}
      <circle cx="50" cy="50" r={R} fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth="5" />

      {pct > 0.3 && (
        <>
          {/* Fat glow halo */}
          <circle cx="50" cy="50" r={R} fill="none"
            stroke={isFinished ? "url(#g2)" : "url(#g1)"}
            strokeWidth="9" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={offset}
            filter="url(#glow2)" opacity="0.35"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
          {/* Main arc */}
          <circle cx="50" cy="50" r={R} fill="none"
            stroke={isFinished ? "url(#g2)" : "url(#g1)"}
            strokeWidth="4.5" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={offset}
            filter="url(#glow)"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </>
      )}
    </svg>
  );
}

/* ─── Preset chips ─────────────────────────────────────────────── */
const PRESETS = [
  { label: "1m",  ms: 1  * 60_000 },
  { label: "5m",  ms: 5  * 60_000 },
  { label: "10m", ms: 10 * 60_000 },
  { label: "25m", ms: 25 * 60_000 },
  { label: "45m", ms: 45 * 60_000 },
  { label: "1h",  ms: 60 * 60_000 },
];

/* ─── Page ──────────────────────────────────────────────────────── */
function StopwatchPage() {
  const navigate = useNavigate();

  /* Timer core */
  const [allocatedMs, setAllocatedMs] = React.useState(5 * 60_000);
  const [remainingMs, setRemainingMs] = React.useState(5 * 60_000);
  const [isRunning, setIsRunning] = React.useState(false);
  const [isFinished, setIsFinished] = React.useState(false);

  /* Inline edit mode */
  const [editing, setEditing] = React.useState(false);
  const [inputStr, setInputStr] = React.useState("0500"); // 4 digits MMSS

  const runningRef = React.useRef(false);
  const lastRef    = React.useRef(0);
  const rafRef     = React.useRef<number | null>(null);

  /* RAF countdown loop */
  React.useEffect(() => {
    runningRef.current = isRunning;
    if (!isRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = now - lastRef.current;
      lastRef.current = now;

      setRemainingMs((prev) => {
        const next = prev - delta;
        if (next <= 0) {
          runningRef.current = false;
          setIsRunning(false);
          setIsFinished(true);
          playCompletionChime({ sound: true, vibrate: true });
          if ("vibrate" in navigator) {
            try { navigator.vibrate([300, 100, 300, 100, 500]); } catch {}
          }
          return 0;
        }
        return next;
      });

      if (runningRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isRunning]);

  /* Helpers */
  const applyAllocated = (ms: number) => {
    const safe = Math.max(60_000, ms);
    setAllocatedMs(safe);
    setRemainingMs(safe);
    setIsFinished(false);
  };

  const handlePlayPause = () => {
    unlockAudio();
    if (editing) return;
    if (isFinished) {
      stopCompletionChime();
      setIsFinished(false);
      setRemainingMs(allocatedMs);
      setIsRunning(true);
      return;
    }
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    stopCompletionChime();
    setIsRunning(false);
    setIsFinished(false);
    setRemainingMs(allocatedMs);
    setEditing(false);
  };

  /* Text input edit helpers */
  const startEditing = () => {
    if (isRunning || isFinished) return;
    const totalSec = Math.round(allocatedMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    setInputStr(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    setEditing(true);
  };
  const commitEdit = (raw: string) => {
    // Accept MM:SS or just a number of minutes
    const parts = raw.trim().split(":");
    let mm = 0, ss = 0;
    if (parts.length === 2) {
      mm = parseInt(parts[0], 10) || 0;
      ss = Math.min(59, parseInt(parts[1], 10) || 0);
    } else {
      mm = parseInt(parts[0], 10) || 0;
    }
    const total = (mm * 60 + ss) * 1000;
    if (total > 0) applyAllocated(total);
    setEditing(false);
  };

  /* Display values */
  const totalSec   = Math.ceil(remainingMs / 1000);
  const dispM      = Math.floor(totalSec / 60);
  const dispS      = totalSec % 60;
  const pct        = allocatedMs > 0 ? ((allocatedMs - remainingMs) / allocatedMs) * 100 : 0;
  const isIdle     = !isRunning && !isFinished;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">

      {/* Ambient radial bloom */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{
          background: isFinished
            ? "radial-gradient(ellipse 100% 80% at 50% 50%, oklch(0.88 0.18 65 / 0.16) 0%, transparent 70%)"
            : isRunning
            ? "radial-gradient(ellipse 100% 80% at 50% 50%, oklch(0.88 0.21 118 / 0.10) 0%, transparent 70%)"
            : "radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.88 0.21 118 / 0.05) 0%, transparent 70%)",
        }}
      />

      {/* ── Top bar ──────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <button
          onClick={() => { stopCompletionChime(); navigate({ to: "/" }); }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-card/30 text-muted-foreground backdrop-blur transition hover:text-foreground"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
          {isFinished ? "Done 🎉" : isRunning ? "Running" : editing ? "Set Time" : "Timer"}
        </span>

        <button
          onClick={handleReset}
          disabled={isIdle && !editing && remainingMs === allocatedMs}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-card/30 text-muted-foreground backdrop-blur transition hover:text-foreground disabled:opacity-20"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Ring + centre ────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        {/* Ring wrapper — as large as possible */}
        <div
          className="relative flex shrink-0 items-center justify-center"
          style={{
            width:  "min(88vw, calc(100svh - 260px))",
            height: "min(88vw, calc(100svh - 260px))",
          }}
        >
          {/* Outer bloom */}
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: "-6%",
              background: isFinished
                ? "radial-gradient(circle, oklch(0.88 0.18 65 / 0.22) 0%, transparent 65%)"
                : "radial-gradient(circle, oklch(0.88 0.21 118 / 0.18) 0%, transparent 65%)",
              filter: "blur(20px)",
              transition: "background 0.7s ease",
            }}
          />

          <Ring pct={pct} isFinished={isFinished} />

          {/* ── Centre content ───────────────────────── */}
          <div className="relative flex flex-col items-center gap-1">

            {editing ? (
              /* Plain text input — user just types */
              <div className="flex flex-col items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  placeholder="MM:SS"
                  value={inputStr}
                  onChange={(e) => setInputStr(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(inputStr);
                    if (e.key === "Escape") setEditing(false);
                  }}
                  onBlur={() => commitEdit(inputStr)}
                  className="w-[180px] rounded-2xl border bg-card/40 text-center backdrop-blur-sm outline-none"
                  style={{
                    fontFamily: "var(--font-mono), ui-monospace",
                    fontSize: "clamp(2.2rem, 10vw, 4rem)",
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                    color: "oklch(0.88 0.21 118)",
                    borderColor: "oklch(0.88 0.21 118 / 0.4)",
                    padding: "12px 16px",
                    background: "oklch(1 0 0 / 0.05)",
                    boxShadow: "0 0 24px oklch(0.88 0.21 118 / 0.15)",
                  }}
                />
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                  Enter to confirm · Esc to cancel
                </span>
              </div>
            ) : (
              /* Normal countdown / set display */
              <button
                onClick={startEditing}
                className="flex flex-col items-center gap-1 rounded-xl outline-none transition-opacity"
                style={{ opacity: isRunning || isFinished ? 1 : 0.9 }}
                title="Tap to edit"
              >
                <div
                  className="premium-numeral select-none"
                  style={{
                    fontFamily: "var(--font-mono), ui-monospace",
                    fontSize: "clamp(3rem, 14vw, 6.5rem)",
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {String(dispM).padStart(2, "0")}
                  <span
                    style={{
                      display: "inline-block",
                      animation: isRunning ? "sw-blink 1s step-end infinite" : "none",
                      opacity: isRunning ? 1 : 0.4,
                      transition: "opacity 0.3s",
                    }}
                  >:</span>
                  {String(dispS).padStart(2, "0")}
                </div>
                {isIdle && (
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                    tap to edit
                  </span>
                )}
                {isRunning && (
                  <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: "oklch(0.88 0.21 118 / 0.7)" }}>
                    {Math.round(pct)}% elapsed
                  </span>
                )}
                {isFinished && (
                  <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: "oklch(0.88 0.18 65)" }}>
                    time&apos;s up!
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Preset chips (always visible when idle) ── */}
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-2 px-6 transition-opacity duration-300"
          style={{ opacity: isRunning || isFinished ? 0 : 1, pointerEvents: isRunning || isFinished ? "none" : "auto" }}
        >
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => { setEditing(false); applyAllocated(p.ms); }}
              className="rounded-full border px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
              style={{
                borderColor: allocatedMs === p.ms && !editing ? "oklch(0.88 0.21 118 / 0.6)" : "oklch(1 0 0 / 0.1)",
                background:  allocatedMs === p.ms && !editing ? "oklch(0.88 0.21 118 / 0.12)" : "transparent",
                color:       allocatedMs === p.ms && !editing ? "oklch(0.88 0.21 118)" : "oklch(0.65 0.018 95)",
                boxShadow:   allocatedMs === p.ms && !editing ? "0 0 12px oklch(0.88 0.21 118 / 0.25)" : "none",
              }}
            >
              {p.label}
            </button>
          ))}
          {/* Custom chip */}
          <button
            onClick={startEditing}
            className="rounded-full border px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
            style={{
              borderColor: editing ? "oklch(0.88 0.21 118 / 0.6)" : "oklch(1 0 0 / 0.18)",
              background:  editing ? "oklch(0.88 0.21 118 / 0.12)" : "oklch(1 0 0 / 0.04)",
              color:       editing ? "oklch(0.88 0.21 118)" : "oklch(0.65 0.018 95)",
              boxShadow:   editing ? "0 0 12px oklch(0.88 0.21 118 / 0.25)" : "none",
            }}
          >
            Custom…
          </button>
        </div>
      </div>

      {/* ── Play / Pause ──────────────────────────────── */}
      <div className="relative z-10 flex shrink-0 justify-center pb-[max(env(safe-area-inset-bottom),32px)] pt-4">
        <button
          onClick={handlePlayPause}
          disabled={editing || (isIdle && allocatedMs === 0)}
          className="relative flex h-20 w-20 items-center justify-center rounded-full transition-transform duration-150 active:scale-90 disabled:opacity-30"
          style={{
            backgroundImage: isFinished
              ? "linear-gradient(135deg, oklch(0.88 0.18 65), oklch(0.68 0.22 28))"
              : "var(--gradient-primary)",
            boxShadow: isFinished
              ? "0 0 40px oklch(0.88 0.18 65 / 0.55), 0 0 80px oklch(0.88 0.18 65 / 0.2)"
              : "var(--shadow-glow)",
          }}
        >
          {(isRunning || isFinished) && (
            <span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                animation: isFinished
                  ? "sw-warn-pulse 1.3s ease-out infinite"
                  : "sw-run-pulse 2s ease-out infinite",
              }}
            />
          )}
          {isRunning
            ? <Pause className="h-9 w-9 fill-current text-primary-foreground" />
            : <Play  className="ml-1.5 h-9 w-9 fill-current text-primary-foreground" />
          }
        </button>
      </div>

      <style>{`
        @keyframes sw-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.15; }
        }
        @keyframes sw-run-pulse {
          0%   { box-shadow: 0 0 0 0    oklch(0.88 0.21 118 / 0.6); }
          70%  { box-shadow: 0 0 0 26px oklch(0.88 0.21 118 / 0);   }
          100% { box-shadow: 0 0 0 0    oklch(0.88 0.21 118 / 0);   }
        }
        @keyframes sw-warn-pulse {
          0%   { box-shadow: 0 0 0 0    oklch(0.88 0.18 65 / 0.7); }
          70%  { box-shadow: 0 0 0 30px oklch(0.88 0.18 65 / 0);   }
          100% { box-shadow: 0 0 0 0    oklch(0.88 0.18 65 / 0);   }
        }
      `}</style>
    </div>
  );
}
