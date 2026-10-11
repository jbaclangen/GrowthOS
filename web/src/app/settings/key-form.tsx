"use client";

import { useActionState, useState } from "react";
import { createAccessKey, type CreateKeyState } from "./actions";

// Creates a key and shows it once, with ready-to-paste setup for Claude Code and Claude Desktop.
export function KeyForm({ serverUrl }: { serverUrl: string }) {
  const [state, action, pending] = useActionState<CreateKeyState, FormData>(createAccessKey, undefined);

  return (
    <div className="mt-4 space-y-4">
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm">
          <span className="font-medium">Key name</span>
          <input name="name" maxLength={60} required placeholder="Claude Desktop on my laptop" className="input mt-1" />
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Creating…" : "Create key"}
        </button>
      </form>
      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.key && <NewKey keyValue={state.key} serverUrl={serverUrl} />}
    </div>
  );
}

function NewKey({ keyValue, serverUrl }: { keyValue: string; serverUrl: string }) {
  const claudeCode = `claude mcp add --transport http braventa ${serverUrl} --header "Authorization: Bearer ${keyValue}"`;
  const desktop = JSON.stringify(
    {
      mcpServers: {
        braventa: {
          command: "npx",
          args: ["-y", "mcp-remote", serverUrl, "--header", "Authorization:${BRAVENTA_AUTH}"],
          env: { BRAVENTA_AUTH: `Bearer ${keyValue}` },
        },
      },
    },
    null,
    2,
  );
  return (
    <div className="rounded-md border border-accent bg-accent-soft p-4 text-sm text-accent-soft-foreground" role="status">
      <p className="font-semibold">Copy your key now. You won&apos;t see it again.</p>
      <CopyBlock label="Access key" value={keyValue} />
      <p className="mt-4 font-medium">Claude Code</p>
      <p className="text-muted">Run this in a terminal:</p>
      <CopyBlock label="Claude Code command" value={claudeCode} />
      <p className="mt-4 font-medium">Claude Desktop</p>
      <p className="text-muted">
        Add this to <code>claude_desktop_config.json</code> (Settings → Developer → Edit config), then restart Claude
        Desktop. It needs Node.js installed.
      </p>
      <CopyBlock label="Claude Desktop config" value={desktop} />
      <p className="mt-4">Then ask Claude: &quot;Use Braventa to set up my business from what you know about it.&quot;</p>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-surface p-3 text-xs text-foreground">
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
