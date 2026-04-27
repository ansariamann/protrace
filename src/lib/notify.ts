// Live timer notification for mobile. Uses the Web Notification API with a
// stable tag so repeated notify() calls UPDATE the same banner instead of
// stacking. The service worker drives the countdown independently so the
// notification keeps updating even when the page is suspended on mobile.

let permission: NotificationPermission | "unsupported" = "unsupported";
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

/** Tell the SW to start/update a live timer notification. */
export async function showTimerNotification(opts: {
  tag: string;
  activityName: string;
  endAt: number;    // absolute timestamp (ms) when the timer finishes
  allocated: number; // total ms allocated
}) {
  if (!notificationsGranted()) return;

  try {
    const registration = await registerNotificationServiceWorker();
    if (registration?.active) {
      registration.active.postMessage({
        type: "TIMER_TICK",
        tag: opts.tag,
        activityName: opts.activityName,
        endAt: opts.endAt,
        allocated: opts.allocated,
      });
    }
  } catch {
    /* ignore */
  }
}

/** Tell the SW to stop and dismiss the timer notification. */
export async function clearTimerNotification() {
  try {
    const registration = await registerNotificationServiceWorker();
    if (registration?.active) {
      registration.active.postMessage({ type: "TIMER_CLEAR" });
    }
    // Belt-and-braces: close any lingering notifications directly.
    if (registration) {
      const notifications = await registration.getNotifications();
      for (const n of notifications) {
        if (n.tag.startsWith("protrace-timer-")) n.close();
      }
    }
  } catch {
    /* ignore */
  }
}
