import { Link } from "@tanstack/react-router";
import { Clock, History, Settings, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Today", icon: Clock },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/80 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 text-muted-foreground transition-colors"
              activeProps={{ className: "!text-primary" }}
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      "flex h-9 w-12 items-center justify-center rounded-full transition-all",
                      isActive && "bg-primary/15",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} strokeWidth={2.25} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                  {isActive && (
                    <span className="absolute -top-px left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary shadow-[var(--shadow-glow)]" />
                  )}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop side rail */}
      <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-64 flex-col border-r border-border bg-card/40 backdrop-blur-xl px-5 py-8 lg:flex">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Hourglass className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-base font-bold leading-tight tracking-tight">Protrace</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Daily Timer
            </p>
          </div>
        </div>

        <nav className="mt-10 flex flex-col gap-1">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
              activeProps={{
                className: "!bg-primary/10 !text-primary",
              }}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={2.25} />
              {label}
            </Link>
          ))}
        </nav>

        <p className="mt-auto text-[10px] text-muted-foreground">
          Resets every day · Stored locally
        </p>
      </aside>
    </>
  );
}
