const MUTE_STORAGE_KEY = "swl_muted";

export function getStoredMute(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setStoredMute(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Storage can be unavailable (private mode, quota) — muting is a nice
    // to have, not worth surfacing an error for.
  }
}

let sharedContext: AudioContext | null = null;

// Created lazily, only the first time a sound actually plays, so the
// AudioContext is always constructed from within a user-gesture handler
// (submit/vote clicks) and never trips the browser's autoplay policy.
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!sharedContext) sharedContext = new AudioContextCtor();
  return sharedContext;
}

function tone(ctx: AudioContext, frequency: number, duration: number, type: OscillatorType, peakGain: number, delay = 0): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const startAt = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

export type SoundName = "submit" | "vote" | "arrival";

// All SFX are synthesized (no audio files); volumes stay low and each
// sound is a couple of short tones so the wall never gets noisy even when
// entries are arriving in a burst.
export function playSound(name: SoundName): void {
  if (getStoredMute()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (name === "submit") {
    tone(ctx, 587, 0.14, "triangle", 0.07);
    tone(ctx, 880, 0.16, "triangle", 0.06, 0.08);
  } else if (name === "vote") {
    tone(ctx, 660, 0.09, "sine", 0.06);
  } else {
    tone(ctx, 440, 0.07, "sine", 0.025);
  }
}
