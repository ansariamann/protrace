import { Link } from "@tanstack/react-router";
import { Clock, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Today", icon: Clock },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="group flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 text-muted-foreground transition-colors"
            activeProps={{ className: "!text-primary" }}
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "flex h-9 w-12 items-center justify-center rounded-full transition-all",
                    isActive && "bg-primary/10",
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
                </div>
                <span className="text-[11px] font-medium">{label}</span>
              </>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
