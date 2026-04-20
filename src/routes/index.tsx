import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ActivityCard } from "@/components/ActivityCard";
import { EfficiencyRing } from "@/components/EfficiencyRing";
import { useAppState, useTicker } from "@/hooks/use-app-state";
import { formatMin, liveElapsed } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Daily Activity Timer" },
      {
        name: "description",
        content: "Today's activities and timers. Track how you spend your day.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { state, addActivity, applyTemplates } = useAppState();
  const now = useTicker(1000);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [minutes, setMinutes] = React.useState<number | "">(30);

  const totalAllocated = state.activities.reduce((s, a) => s + a.allocatedMs, 0);
  const totalElapsed = state.activities.reduce((s, a) => s + liveElapsed(a, now), 0);
  const efficiency = totalAllocated > 0 ? totalElapsed / totalAllocated : 0;
  const pct = Math.round(efficiency * 100);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleAdd = () => {
    const m = typeof minutes === "number" ? minutes : Number(minutes);
    if (!name.trim() || !m || m < 1) return;
    addActivity(name, m);
    setName("");
    setMinutes(30);
    setOpen(false);
  };

  return (
    <div className="px-5 pt-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight">{dateLabel}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMin(totalElapsed)} of {formatMin(totalAllocated || 0)} tracked
          </p>
        </div>
        <EfficiencyRing
          progress={efficiency}
          label={`${pct}%`}
          sublabel="Used"
        />
      </header>

      {/* List */}
      <section className="mt-6 space-y-3">
        {state.activities.length === 0 ? (
          <EmptyState onApplyTemplates={state.templates.length > 0 ? applyTemplates : undefined} />
        ) : (
          state.activities.map((a) => <ActivityCard key={a.id} activity={a} now={now} />)
        )}
      </section>

      {/* Sticky add button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            style={{ backgroundImage: "var(--gradient-primary)" }}
            className="fixed bottom-24 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-95"
            aria-label="Add activity"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            Add activity
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>New activity</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Name
              </label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Deep work"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Allocated minutes
              </label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={minutes}
                onChange={(e) =>
                  setMinutes(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
            <Button
              onClick={handleAdd}
              className="w-full"
              size="lg"
              disabled={!name.trim() || !minutes}
            >
              Add to today
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EmptyState({ onApplyTemplates }: { onApplyTemplates?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-semibold">Plan your day</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Add activities below, or load your saved templates in one tap.
      </p>
      {onApplyTemplates && (
        <Button onClick={onApplyTemplates} variant="secondary" className="mt-4">
          Load templates
        </Button>
      )}
    </div>
  );
}
