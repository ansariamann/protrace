import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, Check, X, Sun, Moon, Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/hooks/use-app-state";
import { type Theme, formatMin } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Daily Activity Timer" },
      { name: "description", content: "Manage activity templates and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    state,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplates,
    setTheme,
    setAutoApply,
    clearAll,
  } = useAppState();

  const [name, setName] = React.useState("");
  const [minutes, setMinutes] = React.useState<number | "">(30);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editMinutes, setEditMinutes] = React.useState<number>(30);

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
    <div className="px-5 pt-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Preferences</h1>
      </header>

      {/* Templates */}
      <section className="mt-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold">Activity templates</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quick-add activities you do regularly.
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
            Apply to today
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {state.templates.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-center text-sm text-muted-foreground">
              No templates yet.
            </p>
          )}
          {state.templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]"
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
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{formatMin(t.allocatedMs)}</p>
                  </div>
                  <button
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => startEdit(t.id, t.name, t.allocatedMs)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
                Add
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Auto-apply */}
      <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Auto-load templates each day</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              When a new day starts, populate today with your templates.
            </p>
          </div>
          <Switch checked={state.autoApplyTemplates} onCheckedChange={setAutoApply} />
        </div>
      </section>

      {/* Theme */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold">Theme</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ThemeOption value="light" current={state.theme} onSelect={setTheme} icon={Sun} label="Light" />
          <ThemeOption value="dark" current={state.theme} onSelect={setTheme} icon={Moon} label="Dark" />
          <ThemeOption value="system" current={state.theme} onSelect={setTheme} icon={Monitor} label="Auto" />
        </div>
      </section>

      {/* Danger */}
      <section className="mt-8 mb-4">
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
        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
        active
          ? "border-primary bg-primary/10 text-primary shadow-[var(--shadow-glow)]"
          : "border-border bg-card text-muted-foreground hover:bg-accent",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
