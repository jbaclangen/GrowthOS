// Double-clickjacking guard for the consent screen's Approve button. Pure apart from the environment passed in, so
// it's unit-tested with a fake one.
//
// The attack (Yibelo, 2024) needs no frame: another site asks for a double-click, swaps this page in under the
// pointer between the two clicks (navigating its opener window, then closing itself), and the second click lands on
// Approve. So Approve is enabled only once the page has been visible and focused for a short, uninterrupted moment,
// and every blur, hide, focus or show starts that moment again. The server re-validates everything regardless.

export const ARM_DELAY_MS = 750;

export type GuardEnvironment = {
  isVisible(): boolean;
  hasFocus(): boolean;
  // Subscribes to focus, blur and visibilitychange; returns the unsubscribe function.
  listen(onEvent: () => void): () => void;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
};

// Calls onChange(true) once the page has been visible and focused for delayMs, and onChange(false) whenever that
// stops. Starts disarmed and never calls onChange synchronously. Returns a cleanup function.
export function guardClicks(env: GuardEnvironment, onChange: (armed: boolean) => void, delayMs = ARM_DELAY_MS) {
  let armed = false;
  let timer: unknown = null;
  const set = (value: boolean) => {
    if (value !== armed) {
      armed = value;
      onChange(value);
    }
  };
  const restart = () => {
    if (timer !== null) env.clearTimer(timer);
    timer = null;
    set(false);
    if (env.isVisible() && env.hasFocus()) {
      timer = env.setTimer(() => {
        timer = null;
        if (env.isVisible() && env.hasFocus()) set(true);
      }, delayMs);
    }
  };
  // The first check can't arm (armed is already false), so starting never calls onChange synchronously.
  restart();
  const unlisten = env.listen(restart);
  return () => {
    unlisten();
    if (timer !== null) env.clearTimer(timer);
  };
}

// The browser environment.
export function browserGuardEnvironment(): GuardEnvironment {
  return {
    isVisible: () => document.visibilityState === "visible",
    hasFocus: () => document.hasFocus(),
    listen(onEvent) {
      window.addEventListener("focus", onEvent);
      window.addEventListener("blur", onEvent);
      document.addEventListener("visibilitychange", onEvent);
      return () => {
        window.removeEventListener("focus", onEvent);
        window.removeEventListener("blur", onEvent);
        document.removeEventListener("visibilitychange", onEvent);
      };
    },
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (handle) => window.clearTimeout(handle as number),
  };
}
