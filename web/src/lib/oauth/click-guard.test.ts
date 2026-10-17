import { describe, expect, it } from "vitest";
import { ARM_DELAY_MS, guardClicks, type GuardEnvironment } from "./click-guard";

// A fake page: visibility, focus, events and a manual clock.
function fakePage(start: { visible: boolean; focused: boolean }) {
  let now = 0;
  let visible = start.visible;
  let focused = start.focused;
  let listener: (() => void) | null = null;
  const timers = new Map<number, { at: number; fn: () => void }>();
  let nextId = 1;
  const env: GuardEnvironment = {
    isVisible: () => visible,
    hasFocus: () => focused,
    listen(fn) {
      listener = fn;
      return () => (listener = null);
    },
    setTimer(fn, ms) {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimer: (id) => void timers.delete(id as number),
  };
  return {
    env,
    advance(ms: number) {
      now += ms;
      for (const [id, t] of [...timers]) {
        if (t.at <= now) {
          timers.delete(id);
          t.fn();
        }
      }
    },
    focus(value: boolean) {
      focused = value;
      listener?.();
    },
    show(value: boolean) {
      visible = value;
      listener?.();
    },
    get listening() {
      return listener !== null;
    },
    get pendingTimers() {
      return timers.size;
    },
  };
}

describe("consent click guard (double-clickjacking)", () => {
  it("starts disabled and enables Approve only after the page has been visible and focused for a moment", () => {
    const page = fakePage({ visible: true, focused: true });
    const states: boolean[] = [];
    guardClicks(page.env, (armed) => states.push(armed));
    expect(states).toEqual([]);
    page.advance(ARM_DELAY_MS - 1);
    expect(states).toEqual([]);
    page.advance(1);
    expect(states).toEqual([true]);
  });

  it("disables Approve again on blur and waits the full delay after focus returns", () => {
    const page = fakePage({ visible: true, focused: true });
    const states: boolean[] = [];
    guardClicks(page.env, (armed) => states.push(armed));
    page.advance(ARM_DELAY_MS);
    page.focus(false);
    expect(states).toEqual([true, false]);
    // The page swapped in under a double-click gets focus and the second click right away: still disabled.
    page.focus(true);
    page.advance(100);
    expect(states).toEqual([true, false]);
    page.advance(ARM_DELAY_MS);
    expect(states).toEqual([true, false, true]);
  });

  it("stays disabled while hidden or unfocused", () => {
    const page = fakePage({ visible: false, focused: false });
    const states: boolean[] = [];
    guardClicks(page.env, (armed) => states.push(armed));
    page.advance(ARM_DELAY_MS * 5);
    expect(states).toEqual([]);
    page.show(true);
    page.advance(ARM_DELAY_MS * 5);
    expect(states).toEqual([]);
    page.focus(true);
    page.advance(ARM_DELAY_MS);
    expect(states).toEqual([true]);
    page.show(false);
    expect(states).toEqual([true, false]);
  });

  it("restarts the delay on every focus event, so repeated switching can't arm it early", () => {
    const page = fakePage({ visible: true, focused: true });
    const states: boolean[] = [];
    guardClicks(page.env, (armed) => states.push(armed));
    page.advance(ARM_DELAY_MS - 50);
    page.focus(true);
    page.advance(ARM_DELAY_MS - 50);
    expect(states).toEqual([]);
    page.advance(50);
    expect(states).toEqual([true]);
  });

  it("cleans up its listener and timer", () => {
    const page = fakePage({ visible: true, focused: true });
    const stop = guardClicks(page.env, () => undefined);
    expect(page.listening).toBe(true);
    stop();
    expect(page.listening).toBe(false);
    expect(page.pendingTimers).toBe(0);
  });
});
