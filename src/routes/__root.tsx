import * as React from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppStateProvider } from "@/hooks/use-app-state";
import { BottomNav } from "@/components/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { installAudioUnlocker } from "@/lib/sound";
import { registerNotificationServiceWorker } from "@/lib/notify";

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
      { title: "Protrace — Daily Activity Timer" },
      {
        name: "description",
        content:
          "Plan your day, allocate time to activities, run a stopwatch for each, and review your last 5 days of efficiency.",
      },
      { name: "theme-color", content: "#1a1810" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Protrace" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "Protrace — Daily Activity Timer" },
      {
        property: "og:description",
        content: "Track how efficiently you spend your day. Resets every day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Protrace — Daily Activity Timer" },
      { name: "twitter:description", content: "Track how efficiently you spend your day." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", href: "/icon-512.png" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  React.useEffect(() => {
    installAudioUnlocker();
    void registerNotificationServiceWorker();
  }, []);
  return (
    <AppStateProvider>
      <div className="min-h-screen bg-background pb-24 lg:pb-6 lg:pl-64">
        <Outlet />
      </div>
      <BottomNav />
      <Toaster />
    </AppStateProvider>
  );
}
