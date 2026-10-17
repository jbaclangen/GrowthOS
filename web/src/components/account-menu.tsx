"use client";

import { useId, useRef } from "react";
import Link from "next/link";

// Phones only (below sm): the plan chip, Settings and Sign out move into a popover behind one icon button, so the
// 56px header fits at 320px next to the logo and the assistant (component-guidelines: "menu on mobile").
// The native popover gives light dismiss (Escape, a tap outside) and keyboard order from the button; links close it,
// because the header stays mounted across client-side navigation.
export function AccountMenu({ email, plan, signOut }: { email: string; plan: string | null; signOut: () => Promise<void> }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const hide = () => ref.current?.hidePopover();

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label="Account menu"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-muted sm:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>
      <div
        ref={ref}
        id={id}
        popover="auto"
        aria-label="Account"
        className="fixed top-14 right-4 bottom-auto left-auto m-0 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-4 text-sm text-foreground shadow-md"
      >
        <p className="text-xs break-all text-muted">{email}</p>
        <ul className="mt-3 space-y-3">
          {plan && (
            <li>
              <Link href="/plans" onClick={hide} className="chip whitespace-nowrap bg-accent-soft text-accent-soft-foreground hover:underline">
                {plan}
              </Link>
            </li>
          )}
          <li>
            <Link href="/settings" onClick={hide} className="hover:underline">
              Settings
            </Link>
          </li>
          <li>
            <form action={signOut}>
              <button type="submit" className="btn-secondary w-full">
                Sign out
              </button>
            </form>
          </li>
        </ul>
      </div>
    </>
  );
}
