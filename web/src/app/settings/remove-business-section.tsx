"use client";

import { useActionState, useId, useRef, useState } from "react";
import { REMOVE_BUSINESS_PHRASE, isRemovalPhrase } from "@/lib/organizations/removal";
import { removeBusiness, type RemoveBusinessState } from "./remove-business-actions";

// Settings → Remove business (D-061), shown to owners only (organization.delete). The confirm dialog is a native modal
// <dialog> (focus stays inside, the page behind is inert, Escape cancels). Its remove button stays disabled until the
// field holds the exact phrase; the server checks the phrase and the permission again.
export function RemoveBusinessSection({ organizationId, name }: { organizationId: string; name: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // A new key each time the dialog opens, so the field and any earlier error start empty.
  const [round, setRound] = useState(0);

  const open = () => {
    setRound((r) => r + 1);
    dialogRef.current?.showModal();
    // The field is the first thing to do; focus it once the dialog is open (WCAG 2.4.3).
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const close = () => dialogRef.current?.close();

  return (
    <section id="remove-business" className="card mt-8 scroll-mt-20" aria-labelledby="remove-business-heading">
      <p className="eyebrow">Remove business</p>
      <h2 id="remove-business-heading" className="mt-1 text-lg font-semibold">
        Remove {name} from Braventa
      </h2>
      <p className="mt-2 text-sm text-muted">
        Deletes the business and everything Braventa holds for it, for everyone on the team. This can&apos;t be undone.
      </p>
      <button ref={openerRef} type="button" className="btn-secondary mt-4 text-danger" onClick={open}>
        Remove business
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="remove-business-title"
        aria-describedby="remove-business-summary"
        // Focus goes back to the button that opened the dialog, however it was closed (WCAG 2.4.3).
        onClose={() => openerRef.current?.focus()}
        className="m-auto max-h-[90vh] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border bg-background p-0 text-foreground backdrop:bg-overlay"
      >
        <RemoveForm key={round} organizationId={organizationId} name={name} inputRef={inputRef} onCancel={close} />
      </dialog>
    </section>
  );
}

function RemoveForm({
  organizationId,
  name,
  inputRef,
  onCancel,
}: {
  organizationId: string;
  name: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState<RemoveBusinessState, FormData>(removeBusiness, undefined);
  const [phrase, setPhrase] = useState("");
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const matches = isRemovalPhrase(phrase);

  return (
    <form action={action} className="p-5 text-sm">
      <h2 id="remove-business-title" className="text-lg font-semibold">
        Remove {name}?
      </h2>
      <div id="remove-business-summary">
        <p className="mt-3">This permanently deletes {name} and everything in it, for everyone on the team:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>Website analyses, growth scores, diagnoses and growth plans</li>
          <li>30-day plans and every drafted post, approved or not</li>
          <li>The business profile and your discovery answers</li>
          <li>Team members&apos; access, open invites, access keys and connected AI apps</li>
          <li>
            The Google and HubSpot connections and their data. Braventa first revokes its access at Google and uninstalls
            its HubSpot app.
          </li>
        </ul>
        <p className="mt-3 font-semibold">This can&apos;t be undone.</p>
        <p className="mt-1 text-muted">Your Braventa account stays, and so does any other business you belong to.</p>
      </div>

      <input type="hidden" name="organizationId" value={organizationId} />
      <label htmlFor={`${id}-phrase`} className="mt-5 block font-medium">
        To confirm, type {REMOVE_BUSINESS_PHRASE}
      </label>
      <p id={hintId} className="mt-1 text-xs text-muted">
        In capital letters, exactly as shown.
      </p>
      <input
        ref={inputRef}
        id={`${id}-phrase`}
        name="confirmation"
        type="text"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-describedby={state?.error ? `${hintId} ${errorId}` : hintId}
        aria-invalid={state?.error ? true : undefined}
        className="input mt-2"
      />
      {state?.error && (
        <p id={errorId} className="mt-2 text-danger" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={pending}>
          Keep the business
        </button>
        {/* Destructive: secondary style in the danger color (component-guidelines.md), never the primary button. */}
        <button type="submit" className="btn-secondary text-danger" disabled={!matches || pending}>
          {pending ? "Removing…" : "Remove business"}
        </button>
      </div>
    </form>
  );
}
