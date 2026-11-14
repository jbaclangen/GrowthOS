"use client";

import { useEffect } from "react";
import Link from "next/link";

// A page that threw (plain-language errors, ROADMAP Next item 1). Server errors reach the browser as a generic message
// with a digest; the digest is shown as a reference so the team can find the server log entry. The raw message
// never is.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
      <div className="card" role="alert">
        <h1 className="text-xl font-semibold">This page didn&apos;t load</h1>
        <p className="mt-2 text-sm">
          Something went wrong on our side. Your data is safe. Try again, and if it keeps happening, contact us at
          hello@braventa.io{digest ? " with the reference below" : ""}.
        </p>
        {digest && <p className="mt-2 text-xs text-muted">Reference: {digest}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => retry()} className="btn-primary">
            Try again
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Go to your dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
