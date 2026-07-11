import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStoredMute, playSound, setStoredMute } from "@/lib/sound";

// The vitest environment is Node, so `window` is undefined here — this
// exercises exactly the guard paths the design standard requires ("guard
// for environments without it"), the same paths that protect SSR.
describe("sound in a non-browser environment", () => {
  it("getStoredMute defaults to false without throwing", () => {
    expect(getStoredMute()).toBe(false);
  });

  it("setStoredMute is a no-op without throwing", () => {
    expect(() => setStoredMute(true)).not.toThrow();
    expect(getStoredMute()).toBe(false);
  });

  it("playSound is a no-op without throwing for every sound name", () => {
    expect(() => playSound("submit")).not.toThrow();
    expect(() => playSound("vote")).not.toThrow();
    expect(() => playSound("arrival")).not.toThrow();
  });
});

// Stubs a minimal `window` (AudioContext + localStorage) so the actual
// synthesis path in sound.ts — otherwise only reachable from a real
// browser — gets exercised. Each test resets the module registry and
// re-imports so the module-level `sharedContext` singleton starts fresh.
describe("sound with a mocked WebAudio browser environment", () => {
  class MockGainNode {
    gain = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    connect = vi.fn();
  }

  class MockOscillatorNode {
    type = "";
    frequency = { value: 0 };
    connect = vi.fn();
    start = vi.fn();
    stop = vi.fn();
  }

  function mockAudioContextClass() {
    const oscillators: MockOscillatorNode[] = [];
    class MockAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = new MockOscillatorNode();
        oscillators.push(oscillator);
        return oscillator;
      }
      createGain() {
        return new MockGainNode();
      }
    }
    return { MockAudioContext, oscillators };
  }

  function mockLocalStorage() {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plays two ascending triangle tones for the submit sound", async () => {
    const { MockAudioContext, oscillators } = mockAudioContextClass();
    vi.stubGlobal("window", { AudioContext: MockAudioContext, localStorage: mockLocalStorage() });
    const { playSound: play } = await import("@/lib/sound");

    play("submit");

    expect(oscillators).toHaveLength(2);
    expect(oscillators[0]!.type).toBe("triangle");
    expect(oscillators[0]!.frequency.value).toBe(587);
    expect(oscillators[1]!.frequency.value).toBe(880);
    expect(oscillators[0]!.start).toHaveBeenCalledOnce();
    expect(oscillators[0]!.stop).toHaveBeenCalledOnce();
  });

  it("plays a single sine tone for the vote sound", async () => {
    const { MockAudioContext, oscillators } = mockAudioContextClass();
    vi.stubGlobal("window", { AudioContext: MockAudioContext, localStorage: mockLocalStorage() });
    const { playSound: play } = await import("@/lib/sound");

    play("vote");

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]!.type).toBe("sine");
    expect(oscillators[0]!.frequency.value).toBe(660);
  });

  it("plays a single tone for the arrival sound", async () => {
    const { MockAudioContext, oscillators } = mockAudioContextClass();
    vi.stubGlobal("window", { AudioContext: MockAudioContext, localStorage: mockLocalStorage() });
    const { playSound: play } = await import("@/lib/sound");

    play("arrival");

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]!.frequency.value).toBe(440);
  });

  it("never touches AudioContext while muted", async () => {
    const { MockAudioContext, oscillators } = mockAudioContextClass();
    const storage = mockLocalStorage();
    storage.setItem("swl_muted", "1");
    vi.stubGlobal("window", { AudioContext: MockAudioContext, localStorage: storage });
    const { playSound: play } = await import("@/lib/sound");

    play("submit");

    expect(oscillators).toHaveLength(0);
  });

  it("falls back to webkitAudioContext when AudioContext is unavailable", async () => {
    const { MockAudioContext, oscillators } = mockAudioContextClass();
    vi.stubGlobal("window", { webkitAudioContext: MockAudioContext, localStorage: mockLocalStorage() });
    const { playSound: play } = await import("@/lib/sound");

    play("vote");

    expect(oscillators).toHaveLength(1);
  });

  it("is a no-op when neither AudioContext nor webkitAudioContext exists", async () => {
    vi.stubGlobal("window", { localStorage: mockLocalStorage() });
    const { playSound: play } = await import("@/lib/sound");

    expect(() => play("submit")).not.toThrow();
  });

  it("round-trips both the muted and unmuted state through localStorage", async () => {
    vi.stubGlobal("window", { localStorage: mockLocalStorage() });
    const { getStoredMute: storedMute, setStoredMute: setMute } = await import("@/lib/sound");

    setMute(true);
    expect(storedMute()).toBe(true);

    setMute(false);
    expect(storedMute()).toBe(false);
  });

  it("treats a throwing localStorage (private mode, quota) as unmuted rather than throwing", async () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error("storage disabled");
      },
      setItem: () => {
        throw new Error("storage disabled");
      },
    };
    vi.stubGlobal("window", { localStorage: throwingStorage });
    const { getStoredMute: storedMute, setStoredMute: setMute } = await import("@/lib/sound");

    expect(storedMute()).toBe(false);
    expect(() => setMute(true)).not.toThrow();
  });
});
