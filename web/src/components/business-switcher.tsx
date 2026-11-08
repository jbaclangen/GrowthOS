"use client";

import { useId, useRef } from "react";
import Link from "next/link";
import { switchBusiness } from "@/app/settings/business-actions";

export type SwitcherBusiness = { id: string; name: string; plan: string };

// The business switcher (D-062): the business the person is working on, with the others they belong to one select
// away. A native popover, like AccountMenu: light dismiss, keyboard order from the button. Each business is a small
// form, so switching works without JavaScript too; the server checks membership before remembering the choice.
export function BusinessSwitcher({
  businesses,
  currentId,
  className = "",
  onNavigate,
}: {
  businesses: SwitcherBusiness[];
  currentId: string | null;
  className?: string;
  onNavigate?: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const current = businesses.find((b) => b.id === currentId) ?? businesses[0];
  if (!current) return null;
  const hide = () => {
    ref.current?.hidePopover();
    onNavigate?.();
  };

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={`Business: ${current.name}. Switch business`}
        className={`btn-secondary max-w-48 min-w-0 gap-1 ${className}`}
      >
        <span className="truncate">{current.name}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m6 8 4 4 4-4" />
        </svg>
      </button>
      <div
        ref={ref}
        id={id}
        popover="auto"
        aria-label="Your businesses"
        className="fixed top-14 right-4 bottom-auto left-auto m-0 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-3 text-sm text-foreground shadow-md"
      >
        <p className="px-1 text-xs text-muted">Your businesses</p>
        <ul className="mt-2 space-y-1">
          {businesses.map((b) => (
            <li key={b.id}>
              {b.id === current.id ? (
                <p className="flex items-center justify-between gap-2 rounded-md bg-surface-muted px-2 py-2" aria-current="true">
                  <span className="truncate font-medium">
                    {b.name}
                    <span className="sr-only"> (current)</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{b.plan}</span>
                </p>
              ) : (
                <form action={switchBusiness}>
                  <input type="hidden" name="organizationId" value={b.id} />
                  <button type="submit" className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left hover:bg-surface-muted">
                    <span className="truncate">{b.name}</span>
                    <span className="shrink-0 text-xs text-muted">{b.plan}</span>
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
          <Link href="/onboarding?business=new" onClick={hide} className="rounded-md px-2 py-2 hover:bg-surface-muted">
            Add a business
          </Link>
          <Link href="/settings#businesses" onClick={hide} className="rounded-md px-2 py-2 hover:bg-surface-muted">
            Manage businesses
          </Link>
        </div>
      </div>
    </>
  );
}
