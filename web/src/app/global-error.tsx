"use client";

import "./globals.css";

// When the root layout itself fails, this replaces it, so it brings its own document and styles (no header, no
// fonts). Same wording as error.tsx; a plain link instead of next/link, since the router may be what failed.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  return (
    <html lang="en">
      <body className="flex min-h-full flex-col font-sans">
        <title>Something went wrong · Braventa</title>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
          <div className="card" role="alert">
            <h1 className="text-xl font-semibold">Braventa didn&apos;t load</h1>
            <p className="mt-2 text-sm">
              Something went wrong on our side. Your data is safe. Try again, and if it keeps happening, contact us at
              hello@braventa.io{digest ? " with the reference below" : ""}.
            </p>
            {digest && <p className="mt-2 text-xs text-muted">Reference: {digest}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => retry()} className="btn-primary">
                Try again
              </button>
              <a href="/dashboard" className="btn-secondary">
                Go to your dashboard
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
