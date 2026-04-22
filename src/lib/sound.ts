// Tiny WebAudio chime — no external assets needed.
let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(freq: number, start: number, dur: number, gain = 0.25) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Pleasant 4-note completion chime + light vibration on mobile. */
export function playCompletionChime() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  // C5, E5, G5, C6 — bright ascending arpeggio
  tone(523.25, 0, 0.35);
  tone(659.25, 0.14, 0.35);
  tone(783.99, 0.28, 0.45);
  tone(1046.5, 0.42, 0.7, 0.3);

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate?.([80, 60, 80, 60, 160]);
    } catch {
      /* ignore */
    }
  }
}

/** Must be called from a user gesture (click/tap) to unlock audio on iOS/Safari. */
export function unlockAudio() {
  if (unlocked) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  // Play a silent buffer to fully unlock on iOS
  try {
    const buffer = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start(0);
    unlocked = true;
  } catch {
    /* ignore */
  }
}

/** Install a one-time global listener so ANY first user interaction unlocks audio. */
export function installAudioUnlocker() {
  if (typeof window === "undefined" || unlocked) return;
  const handler = () => {
    unlockAudio();
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    window.removeEventListener("touchstart", handler);
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true });
}
