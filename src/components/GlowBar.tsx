import { cn } from "@/lib/utils";

type Props = {
  /** 0..1 progress (clamped). */
  value: number;
  /** Visual state — switches color palette. */
  tone?: "primary" | "warning";
  /** Show the moving sheen sweep animation. */
  active?: boolean;
  className?: string;
  height?: number;
};

/**
 * Glowing capsule progress bar. Glassy gradient fill with a bright leading-edge
 * halo, animated sheen sweep when active, and a soft outer bloom.
 */
export function GlowBar({
  value,
  tone = "primary",
  active = false,
  className,
  height = 18,
}: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const isWarn = tone === "warning";

  return (
    <div
      className={cn("glow-bar-track relative w-full", className)}
      style={{ height }}
      data-tone={tone}
    >
      {/* Inner shadow / depth */}
      <div className="glow-bar-inset" />

      {/* Filled portion */}
      <div
        className={cn("glow-bar-fill", active && "glow-bar-fill--active")}
        style={{ width: `${pct}%` }}
        data-tone={tone}
      >
        {/* Top highlight gloss */}
        <div className="glow-bar-gloss" />
        {/* Bubble specks (subtle) */}
        <div className="glow-bar-bubbles" />
        {/* Bright leading-edge halo */}
        {pct > 1 && pct < 100 && <div className="glow-bar-tip" />}
        {/* Moving sheen sweep */}
        {active && <div className="glow-bar-sheen" />}
      </div>

      {/* Outer bloom (only when there's progress) */}
      {pct > 4 && (
        <div
          className="glow-bar-bloom"
          style={{ width: `${pct}%` }}
          aria-hidden
          data-warn={isWarn || undefined}
        />
      )}
    </div>
  );
}
