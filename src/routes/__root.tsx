import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppStateProvider } from "@/hooks/use-app-state";
import { BottomNav } from "@/components/BottomNav";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
      },
      { title: "Daily Activity Timer — Track your time, every day" },
      {
        name: "description",
        content:
          "Plan your day, allocate time to activities, run a stopwatch for each, and review your last 5 days of efficiency.",
      },
      { name: "theme-color", content: "#ffffff" },
      { property: "og:title", content: "Daily Activity Timer — Track your time, every day" },
      {
        property: "og:description",
        content: "Track how efficiently you spend your day. Resets every day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Daily Activity Timer — Track your time, every day" },
      { name: "description", content: "Daily Focus Timer is a mobile app for tracking time spent on daily activities." },
      { property: "og:description", content: "Daily Focus Timer is a mobile app for tracking time spent on daily activities." },
      { name: "twitter:description", content: "Daily Focus Timer is a mobile app for tracking time spent on daily activities." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/32922448-981a-4c4e-9f32-1fb6c95d09ab/id-preview-4c4ab75a--20705ef1-0be6-4611-83c3-27e5997dec1c.lovable.app-1776668135002.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/32922448-981a-4c4e-9f32-1fb6c95d09ab/id-preview-4c4ab75a--20705ef1-0be6-4611-83c3-27e5997dec1c.lovable.app-1776668135002.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppStateProvider>
      <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
        <Outlet />
      </div>
      <BottomNav />
      <Toaster />
    </AppStateProvider>
  );
}
