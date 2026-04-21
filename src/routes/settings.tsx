import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, Check, X, Sun, Moon, Monitor, Sparkles, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { type Theme, formatMin } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Protrace" },
      { name: "description", content: "Manage activities, templates and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    state,
    addActivity,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplates,
    setTheme,
    setAutoApply,
    setSoundEnabled,
    clearAll,
  } = useAppState();

  // Quick-add today
  const [todayName, setTodayName] = React.useState("");
  const [todayMin, setTodayMin] = React.useState<number | "">(30);

  // Template add
  const [name, setName] = React.useState("");
  const [minutes, setMinutes] = React.useState<number | "">(30);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editMinutes, setEditMinutes] = React.useState<number>(30);

  const handleAddToday = () => {
    const m = typeof todayMin === "number" ? todayMin : Number(todayMin);
    if (!todayName.trim() || !m || m < 1) return;
    addActivity(todayName, m);
    toast.success(`Added "${todayName}" to today`);
    setTodayName("");
    setTodayMin(30);
  };

  const handleAdd = () => {
    const m = typeof minutes === "number" ? minutes : Number(minutes);
    if (!name.trim() || !m || m < 1) return;
    addTemplate(name, m);
    setName("");
    setMinutes(30);
  };

  const startEdit = (id: string, n: string, ms: number) => {
    setEditingId(id);
    setEditName(n);
    setEditMinutes(Math.round(ms / 60_000));
  };

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 lg:px-10 lg:pt-12">
      <header className="border-b border-border pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
          ◆ Settings
        </p>
        <h1 className="mt-3 font-display text-5xl font-black tracking-tight lg:text-6xl">
          Setup.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add activities to today, manage templates, tweak preferences.
        </p>
      </header>

      {/* Quick add to today */}
      <section className="mt-6 rounded-2xl border border-primary/30 bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-bold tracking-tight">
            Add to today
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          One-off activity for today only.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="e.g. Deep work"
            value={todayName}
            onChange={(e) => setTodayName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddToday()}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={todayMin}
              onChange={(e) =>
                setTodayMin(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-24"
              placeholder="min"
            />
            <Button onClick={handleAddToday} disabled={!todayName.trim() || !todayMin}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Templates
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reusable activities you can add to today in one tap.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={state.templates.length === 0}
            onClick={() => {
              applyTemplates();
              toast.success("Templates added to today");
            }}
          >
            Apply all
          </Button>
        </div>

        <div className="mt-4 space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {state.templates.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-center text-sm text-muted-foreground lg:col-span-2">
              No templates yet.
            </p>
          )}
          {state.templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] transition-colors hover:border-primary/30"
            >
              {editingId === t.id ? (
                <div className="space-y-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">minutes</span>
                    <div className="ml-auto flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => {
                          updateTemplate(t.id, editName, editMinutes);
                          setEditingId(null);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatMin(t.allocatedMs)}
                    </p>
                  </div>
                  <button
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => startEdit(t.id, t.name, t.allocatedMs)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => deleteTemplate(t.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add template */}
        <div className="mt-3 rounded-xl border border-dashed border-border bg-card/40 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="New template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={minutes}
                onChange={(e) =>
                  setMinutes(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-24"
                placeholder="min"
              />
              <Button onClick={handleAdd} disabled={!name.trim() || !minutes}>
                <Plus className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold tracking-tight">Preferences</h2>

        <div className="mt-4 space-y-3">
          <Toggle
            label="Auto-load templates each day"
            description="When a new day starts, populate today with your templates."
            checked={state.autoApplyTemplates}
            onChange={setAutoApply}
          />
          <Toggle
            label="Sound when timer ends"
            description="Play a chime when an activity reaches its allocated time."
            icon={<Volume2 className="h-4 w-4 text-primary" />}
            checked={state.soundEnabled}
            onChange={setSoundEnabled}
          />
        </div>
      </section>

      {/* Theme */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold tracking-tight">Theme</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ThemeOption value="light" current={state.theme} onSelect={setTheme} icon={Sun} label="Light" />
          <ThemeOption value="dark" current={state.theme} onSelect={setTheme} icon={Moon} label="Dark" />
          <ThemeOption value="system" current={state.theme} onSelect={setTheme} icon={Monitor} label="Auto" />
        </div>
      </section>

      {/* Danger */}
      <section className="mt-10 mb-4">
        <Button
          variant="ghost"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            if (confirm("Clear all activities, history and templates? This cannot be undone.")) {
              clearAll();
              toast.success("All data cleared");
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Clear all data
        </Button>
      </section>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ThemeOption({
  value,
  current,
  onSelect,
  icon: Icon,
  label,
}: {
  value: Theme;
  current: Theme;
  onSelect: (t: Theme) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const active = value === current;
  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border p-4 text-xs font-semibold transition-all",
        active
          ? "border-primary bg-primary/10 text-primary shadow-[var(--shadow-glow)]"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
