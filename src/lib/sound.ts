// Tiny WebAudio chime — no external assets needed.
let ctx: AudioContext | null = null;
let unlocked = false;
// Track active oscillators so we can stop them on demand.
const activeOscillators: OscillatorNode[] = [];

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
  activeOscillators.push(osc);
  osc.onended = () => {
    const i = activeOscillators.indexOf(osc);
    if (i !== -1) activeOscillators.splice(i, 1);
  };
}

// Track the timeout that schedules the next loop cycle.
let loopTimeout: ReturnType<typeof setTimeout> | null = null;
// Whether the chime is currently supposed to be looping.
let chimeLooping = false;

/** Stop any currently-playing chime and cancel the loop immediately. */
export function stopCompletionChime() {
  chimeLooping = false;
  if (loopTimeout !== null) {
    clearTimeout(loopTimeout);
    loopTimeout = null;
  }
  const c = getCtx();
  const t = c ? c.currentTime : 0;
  for (const osc of activeOscillators.splice(0)) {
    try {
      osc.stop(t);
    } catch {
      /* already stopped */
    }
  }
}

/** Play one cycle of the ~6s completion chime. */
function _playOneCycle() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  // Phase 1 (0.0–1.2s): bright ascending arpeggio C5 E5 G5 C6
  tone(523.25, 0.0, 0.45, 0.28);
  tone(659.25, 0.25, 0.45, 0.28);
  tone(783.99, 0.5, 0.5, 0.28);
  tone(1046.5, 0.8, 0.6, 0.3);

  // Phase 2 (1.4–3.2s): gentle repeat, softer
  tone(659.25, 1.5, 0.5, 0.2);
  tone(783.99, 1.8, 0.5, 0.2);
  tone(1046.5, 2.1, 0.7, 0.22);

  // Phase 3 (3.4–6.0s): sustained resolve chord C5 + G5 + C6
  tone(523.25, 3.6, 2.4, 0.18);
  tone(783.99, 3.6, 2.4, 0.16);
  tone(1046.5, 3.7, 2.3, 0.18);
  // Final sparkle
  tone(1318.51, 5.0, 0.9, 0.16);
}

/**
 * Start the completion chime and keep repeating it every ~6.5s
 * until stopCompletionChime() is called.
 */
export function playCompletionChime() {
  // Stop any previous loop first.
  stopCompletionChime();
  chimeLooping = true;

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate?.([
        200, 120, 200, 120, 200, 400,
        150, 100, 150, 100, 300, 500,
        400, 200, 600,
      ]);
    } catch {
      /* ignore */
    }
  }

  function scheduleNext() {
    if (!chimeLooping) return;
    _playOneCycle();
    // ~6.5s — slight gap so cycles don't overlap.
    loopTimeout = setTimeout(scheduleNext, 6500);
  }

  scheduleNext();
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
