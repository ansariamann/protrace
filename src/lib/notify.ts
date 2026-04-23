// Live timer notification for mobile. Uses the Web Notification API with a
// stable tag so repeated notify() calls UPDATE the same banner instead of
// stacking. On Android Chrome this shows a persistent countdown in the
// notification tray while a timer is running.

let permission: NotificationPermission | "unsupported" = "unsupported";
let activeTag: string | null = null;
let lastBody = "";

function supported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!supported()) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    permission = Notification.permission;
    return permission;
  }
  try {
    const p = await Notification.requestPermission();
    permission = p;
    return p;
  } catch {
    return "default";
  }
}

export function notificationsGranted(): boolean {
  return supported() && Notification.permission === "granted";
}

/** Show / update a live timer notification. Silent updates (no sound/vibrate). */
export function showTimerNotification(opts: {
  tag: string;
  title: string;
  body: string;
}) {
  if (!notificationsGranted()) return;
  // Skip when tab is visible — avoid redundant banners.
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    // Still cache tag so we can close it when tab is hidden later.
    activeTag = opts.tag;
    return;
  }
  if (opts.body === lastBody && activeTag === opts.tag) return;
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      silent: true,
      requireInteraction: false,
      badge: "/icon-192.png",
      icon: "/icon-192.png",
    });
    // Auto-close previous when a new one takes its place via tag — safe no-op.
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      n.close();
    };
    activeTag = opts.tag;
    lastBody = opts.body;
  } catch {
    /* ignore */
  }
}

export function clearTimerNotification() {
  activeTag = null;
  lastBody = "";
}
