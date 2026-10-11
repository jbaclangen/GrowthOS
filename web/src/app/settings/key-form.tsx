"use client";

import { useActionState, useState } from "react";
import { createAccessKey, keyLastUsed, type CreateKeyState } from "./actions";

type App = "desktop" | "code";

// Guided setup: pick the app, create a key (shown once), paste the ready-made setup, then check the connection.
export function KeyForm({ serverUrl, needsBusiness }: { serverUrl: string; needsBusiness: boolean }) {
  const [app, setApp] = useState<App>("desktop");
  const [state, action, pending] = useActionState<CreateKeyState, FormData>(createAccessKey, undefined);

  return (
    <ol className="mt-4 space-y-6">
      <Step n={1} title="Choose where you use Claude">
        <fieldset className="mt-2 flex flex-wrap gap-2">
          <legend className="sr-only">Claude app</legend>
          {(
            [
              ["desktop", "Claude Desktop"],
              ["code", "Claude Code"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`chip cursor-pointer ${app === value ? "bg-accent text-accent-foreground" : "bg-surface-muted"}`}
            >
              <input
                type="radio"
                name="app"
                value={value}
                checked={app === value}
                onChange={() => setApp(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <p className="mt-2 text-xs text-muted">claude.ai and ChatGPT are coming soon.</p>
      </Step>

      <Step n={2} title="Create an access key">
        <form action={action} className="mt-2 space-y-2">
          {needsBusiness && (
            <label className="block text-sm">
              <span className="font-medium">Business name</span>
              <input name="businessName" maxLength={120} required placeholder="Acme Plumbing" className="input mt-1" />
            </label>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm">
              <span className="font-medium">Key name</span>
              <input
                name="name"
                maxLength={60}
                required
                defaultValue={app === "desktop" ? "Claude Desktop" : "Claude Code"}
                key={app}
                className="input mt-1"
              />
            </label>
            <button type="submit" disabled={pending || Boolean(state?.key)} className="btn-primary">
              {pending ? "Creating…" : state?.key ? "Key created" : "Create key"}
            </button>
          </div>
        </form>
        {state?.error && (
          <p className="mt-2 text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}
      </Step>

      {state?.key && state.prefix && (
        <>
          <Step n={3} title={app === "desktop" ? "Add Braventa to Claude Desktop" : "Add Braventa to Claude Code"}>
            <p className="mt-1 text-sm font-medium text-accent">Copy it now. You won&apos;t see this key again.</p>
            {app === "desktop" ? <DesktopSetup keyValue={state.key} serverUrl={serverUrl} /> : <CodeSetup keyValue={state.key} serverUrl={serverUrl} />}
          </Step>
          <Step n={4} title="Check the connection">
            <ConnectionCheck prefix={state.prefix} />
          </Step>
          <Step n={5} title="Ask Claude to set up your business">
            <p className="mt-1 text-sm text-muted">Start a new conversation and paste:</p>
            <CopyBlock
              label="Prompt"
              value="Use Braventa to set up my business from what you know about it. Ask me about anything you're not sure of."
            />
            <p className="mt-2 text-sm text-muted">
              Claude fills in your website, the problems holding the business back, your priorities and the follow-up
              questions. You then review the diagnosis and approve drafts here in Braventa.
            </p>
          </Step>
        </>
      )}
    </ol>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-foreground"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold">
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
        {children}
      </div>
    </li>
  );
}

function DesktopSetup({ keyValue, serverUrl }: { keyValue: string; serverUrl: string }) {
  const config = JSON.stringify(
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
    <div className="mt-2 space-y-2 text-sm">
      <p>
        You need <a href="https://nodejs.org" className="underline" target="_blank" rel="noreferrer">Node.js</a> installed
        (the LTS version).
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-muted">
        <li>In Claude Desktop, open Settings → Developer → Edit config. This opens claude_desktop_config.json.</li>
        <li>
          If the file is empty or only has <code>{"{}"}</code>, replace everything with the setup below. If it already has
          an <code>mcpServers</code> section, add the <code>braventa</code> entry inside it.
        </li>
        <li>Save the file, then quit Claude Desktop completely and open it again.</li>
      </ol>
      <CopyBlock label="Claude Desktop setup" value={config} />
    </div>
  );
}

function CodeSetup({ keyValue, serverUrl }: { keyValue: string; serverUrl: string }) {
  const command = `claude mcp add --transport http braventa ${serverUrl} --header "Authorization: Bearer ${keyValue}"`;
  return (
    <div className="mt-2 space-y-2 text-sm">
      <p className="text-muted">Run this in a terminal, then start Claude Code. Type /mcp to see Braventa listed.</p>
      <CopyBlock label="Claude Code command" value={command} />
    </div>
  );
}

function ConnectionCheck({ prefix }: { prefix: string }) {
  const [status, setStatus] = useState<"idle" | "checking" | "connected" | "waiting">("idle");
  const [when, setWhen] = useState<string | null>(null);
  return (
    <div className="mt-2 text-sm">
      <p className="text-muted">
        After restarting Claude, ask it: &quot;Check my Braventa status.&quot; Then check here.
      </p>
      <button
        type="button"
        className="btn-secondary mt-2"
        disabled={status === "checking"}
        onClick={async () => {
          setStatus("checking");
          const lastUsed = await keyLastUsed(prefix);
          setWhen(lastUsed);
          setStatus(lastUsed ? "connected" : "waiting");
        }}
      >
        {status === "checking" ? "Checking…" : "Check connection"}
      </button>
      <p className="mt-2" role="status">
        {status === "connected" && when && (
          <span className="text-success">Connected. Claude reached Braventa at {new Date(when).toLocaleTimeString()}.</span>
        )}
        {status === "waiting" && (
          <span>
            Braventa hasn&apos;t heard from Claude yet. Make sure you restarted Claude and asked it something about
            Braventa, then check again.
          </span>
        )}
      </p>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
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
