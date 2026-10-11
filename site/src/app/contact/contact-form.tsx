"use client";

import { useActionState } from "react";
import { sendContact, type ContactState } from "./actions";

const INTENTS = [
  { value: "early_access", label: "Request early access" },
  { value: "demo", label: "Book a walkthrough" },
  { value: "question", label: "Ask a question" },
] as const;

export function ContactForm({ intent }: { intent: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, undefined);

  if (state?.sent) {
    return (
      <div className="card" role="status">
        <h2 className="text-2xl">Thanks{state.name ? `, ${state.name}` : ""}.</h2>
        <p className="mt-2 text-muted">We&apos;ve got your message and will reply by email.</p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-5">
      <fieldset>
        <legend className="text-sm font-semibold">What can we help with?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTENTS.map((i) => (
            <label
              key={i.value}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-border px-4 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
            >
              <input type="radio" name="intent" value={i.value} defaultChecked={i.value === intent} className="accent-accent" />
              {i.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Name</span>
          <input name="name" required maxLength={120} autoComplete="name" className="input mt-1" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Work email</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" className="input mt-1" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">
            Business name <span className="font-normal text-muted">(optional)</span>
          </span>
          <input name="business" maxLength={160} autoComplete="organization" className="input mt-1" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">
            Website <span className="font-normal text-muted">(optional)</span>
          </span>
          <input name="website" maxLength={300} inputMode="url" placeholder="example.com" className="input mt-1" />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-semibold">Message</span>
        <textarea
          name="message"
          required
          maxLength={2000}
          rows={5}
          placeholder="Tell us about your business and what's holding it back."
          className="input mt-1"
        />
      </label>

      {/* Honeypot for bots: hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company URL
          <input name="company_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* D-014: separate, never pre-ticked, never required. */}
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="marketing_opt_in" className="mt-1 h-4 w-4 accent-accent" />
        Send me occasional product updates and growth tips. Unsubscribe anytime.
      </label>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Sending…" : "Send message"}
        </button>
        <p className="text-xs text-muted">
          We use your details only to reply. See <a href="/legal/privacy" className="underline">Privacy</a>.
        </p>
      </div>
    </form>
  );
}
