// Live timer notification for mobile. Uses the Web Notification API with a
// stable tag so repeated notify() calls UPDATE the same banner instead of
// stacking. On Android Chrome this shows a persistent countdown in the
// notification tray while a timer is running.

let permission: NotificationPermission | "unsupported" = "unsupported";
let activeTag: string | null = null;
let lastBody = "";
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function supported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function serviceWorkersSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkersSupported()) return null;
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .catch(() => null);
  }
  return registrationPromise;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!supported()) return "unsupported";
  void registerNotificationServiceWorker();
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
export async function showTimerNotification(opts: {
  tag: string;
  title: string;
  body: string;
}) {
  if (!notificationsGranted()) return;
  if (opts.body === lastBody && activeTag === opts.tag) return;

  try {
    const registration = await registerNotificationServiceWorker();

    if (registration) {
      await registration.showNotification(opts.title, {
        body: opts.body,
        tag: opts.tag,
        silent: true,
        renotify: false,
        requireInteraction: true,
        badge: "/icon-192.png",
        icon: "/icon-192.png",
        timestamp: Date.now(),
        data: { url: "/" },
      });
    } else {
      const n = new Notification(opts.title, {
        body: opts.body,
        tag: opts.tag,
        silent: true,
        requireInteraction: false,
        badge: "/icon-192.png",
        icon: "/icon-192.png",
      });
      n.onclick = () => {
        try {
          window.focus();
        } catch {
          /* ignore */
        }
        n.close();
      };
    }

    activeTag = opts.tag;
    lastBody = opts.body;
  } catch {
    /* ignore */
  }
}

export async function clearTimerNotification() {
  const currentTag = activeTag;
  activeTag = null;
  lastBody = "";

  try {
    const registration = await registerNotificationServiceWorker();
    const notifications = registration ? await registration.getNotifications() : [];
    for (const notification of notifications) {
      if (!currentTag || notification.tag === currentTag || notification.tag.startsWith("protrace-timer-")) {
        notification.close();
      }
    }
  } catch {
    /* ignore */
  }
}
