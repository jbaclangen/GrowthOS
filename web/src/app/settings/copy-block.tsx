"use client";

import { useState } from "react";

// A read-only value (command, config, URL) with a copy button.
export function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-surface-muted p-3 text-xs text-foreground">
        <code aria-label={label}>{value}</code>
      </pre>
      <button
        type="button"
        className="btn-secondary mt-2"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : `Copy ${label.toLowerCase()}`}
      </button>
    </div>
  );
}
