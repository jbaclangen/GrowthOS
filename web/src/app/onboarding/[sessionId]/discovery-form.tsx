"use client";

import { useActionState, useState } from "react";
import { CATEGORIES, painPointsInCategory, type CategoryId } from "@/lib/onboarding/catalog";
import { MAX_STATEMENT } from "@/lib/onboarding/discovery";
import { submitDiscovery, skipDiscovery, type FormState } from "./actions";

export function DiscoveryForm({
  sessionId,
  selected,
  statement,
}: {
  sessionId: string;
  selected: string[];
  statement: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitDiscovery.bind(null, sessionId), undefined);
  // Areas with previously chosen issues start open. Closing an area drops its issues from the answer.
  const [open, setOpen] = useState<Set<CategoryId>>(
    () => new Set(CATEGORIES.filter((c) => painPointsInCategory(c.id).some((p) => selected.includes(p.id))).map((c) => c.id)),
  );
  const toggle = (id: CategoryId) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mt-8 space-y-4">
      <form action={action} className="card space-y-5">
        <fieldset>
          <legend className="text-sm font-medium">Choose the areas that apply</legend>
          <p className="mt-1 text-xs text-muted">Pick any that fit, then the specific problems inside each.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <label
                key={c.id}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  open.has(c.id) ? "border-accent bg-accent-soft" : "border-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={open.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4 accent-accent"
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        {CATEGORIES.filter((c) => open.has(c.id)).map((c) => (
          <fieldset key={c.id} className="border-t border-border pt-4">
            <legend className="text-sm font-medium">{c.label}</legend>
            <div className="mt-2 space-y-2">
              {painPointsInCategory(c.id).map((pp) => (
                <label key={pp.id} className="flex min-h-11 items-start gap-2 text-sm sm:min-h-0">
                  <input
                    type="checkbox"
                    name="painPoints"
                    value={pp.id}
                    defaultChecked={selected.includes(pp.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                  />
                  {pp.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <label className="block border-t border-border pt-4">
          <span className="text-sm font-medium">
            Or describe it in your own words <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea
            name="statement"
            rows={4}
            maxLength={MAX_STATEMENT}
            defaultValue={statement ?? ""}
            placeholder="For example: the phones go quiet every winter, and we don't follow up on old quotes"
            className="input mt-1"
          />
          <span className="mt-1 block text-xs text-muted">
            Braventa matches your description to the issues above and asks you to confirm.
          </span>
        </label>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Saving…" : "Continue"}
        </button>
      </form>

      <form action={skipDiscovery.bind(null, sessionId)} className="text-center">
        <button type="submit" className="text-sm text-muted underline-offset-2 hover:underline">
          Skip for now and build the plan from my website
        </button>
      </form>
    </div>
  );
}
