"use client";

import { useEffect, useRef, useState } from "react";

// The submit button of a connect form (connect-form.tsx). The form leaves Braventa for the provider's consent screen,
// so the page normally unloads; until it does, the button says it's opening the provider. If the page is still here
// after STALL_MS (the browser blocked the redirect, or the network is stuck), it says so instead of staying silent.
// The outcome after the provider (connected, denied, failed) is shown by ConnectionNotice when the owner comes back.
const STALL_MS = 10_000;

export function ConnectSubmit({ label, provider, className }: { label: string; provider: string; className: string }) {
  const [state, setState] = useState<"idle" | "opening" | "stalled">("idle");
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const form = button.current?.form;
    if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onSubmit = () => {
      setState("opening");
      clearTimeout(timer);
      timer = setTimeout(() => setState("stalled"), STALL_MS);
    };
    // Coming back with the browser's Back button can restore this page from the cache in its "opening" state.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        clearTimeout(timer);
        setState("idle");
      }
    };
    form.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return (
    <>
      <button ref={button} type="submit" className={className} aria-disabled={state === "opening"}>
        {state === "opening" ? `Opening ${provider}…` : label}
      </button>
      {state === "stalled" && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-foreground" role="alert">
          {provider} didn&apos;t open. Reload this page and try again. If it still doesn&apos;t open, tell the Braventa team.
        </p>
      )}
    </>
  );
}
