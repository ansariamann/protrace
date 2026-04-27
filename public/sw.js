// Protrace Service Worker — drives live timer notifications even when the page
// is suspended on mobile. The page sends { type: "TIMER_TICK", ... } messages
// and we show/update the notification. When the timer ends the page sends
// { type: "TIMER_CLEAR" }.

let timerInterval = null;
let timerState = null; // { tag, title, body, endAt, activityName }

// Keep SW alive by responding to a heartbeat.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "TIMER_TICK") {
    // Page is alive — update notification once, let SW take over.
    timerState = {
      tag: data.tag,
      activityName: data.activityName,
      endAt: data.endAt,      // absolute timestamp when timer finishes
      allocated: data.allocated,
    };
    _updateNotification();
    _ensureInterval();
  } else if (data.type === "TIMER_CLEAR") {
    _stopTimer();
  }
});

function _ensureInterval() {
  if (timerInterval) return;
  timerInterval = setInterval(_updateNotification, 1000);
}

function _stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (!timerState) return;
  const tag = timerState.tag;
  timerState = null;
  self.registration.getNotifications({ tag }).then((notes) => {
    notes.forEach((n) => n.close());
  });
}

function _updateNotification() {
  if (!timerState) return;
  const now = Date.now();
  const remaining = Math.max(0, timerState.endAt - now);
  const elapsed = timerState.allocated - remaining;
  const pct = Math.min(100, Math.round((elapsed / timerState.allocated) * 100));
  const title = `⏱ ${timerState.activityName} · ${_formatHMS(remaining)} left`;
  const body = `${pct}% used — tap to open Protrace`;

  self.registration.showNotification(title, {
    body,
    tag: timerState.tag,
    silent: true,
    requireInteraction: true,
    badge: "/icon-192.png",
    icon: "/icon-192.png",
    data: { url: "/" },
  });

  // Auto-clear when finished.
  if (remaining === 0) _stopTimer();
}

function _formatHMS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow("/");
        return undefined;
      }),
  );
});

self.addEventListener("notificationclose", (event) => {
  // User dismissed the notification — stop the SW timer too.
  if (timerState && event.notification.tag === timerState.tag) {
    _stopTimer();
  }
});

// Keep the SW alive.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));