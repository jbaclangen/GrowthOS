import { CopyBlock } from "./copy-block";

// Step-by-step "Sign in with Braventa" setup for each AI app. Menu names checked against Anthropic's and OpenAI's
// help pages in October 2026; the apps rename menus now and then, so the copy says "as of October 2026".

export function ConnectInstructions({ serverUrl }: { serverUrl: string }) {
  return (
    <div className="mt-4 space-y-3">
      <CopyBlock label="Server URL" value={serverUrl} />
      <p className="text-xs text-muted">Menu names below are as of October 2026; the apps move them around occasionally.</p>

      <Guide title="claude.ai (web, desktop and mobile)">
        <li>
          In Claude, open <strong>Customize → Connectors</strong> (on some versions, Settings → Connectors).
        </li>
        <li>
          Select <strong>+ Add</strong>, then <strong>Add custom connector</strong>.
        </li>
        <li>
          Name it <strong>Braventa</strong> and paste the server URL above. Leave authentication on sign-in (OAuth), then select{" "}
          <strong>Add</strong>.
        </li>
        <li>Select Connect. A Braventa window opens: sign in, choose your business and select Approve.</li>
        <li>
          In a chat, select <strong>+ → Connectors</strong> and turn Braventa on.
        </li>
        <li className="text-muted">
          Team and Enterprise plans: an owner adds the connector under Organization settings → Connectors first, then each
          person connects it from Customize → Connectors.
        </li>
      </Guide>

      <Guide title="Claude Desktop">
        <li>
          Claude Desktop uses the same connectors as claude.ai: add Braventa there (above) while signed in to the same Claude
          account, and it appears in the desktop app too.
        </li>
        <li className="text-muted">
          Prefer a config file? Use an access key with the mcp-remote setup in &quot;Use an access key instead&quot; below.
        </li>
      </Guide>

      <Guide title="Claude Code">
        <li>
          Run this in a terminal:
          <CopyBlock label="Claude Code command" value={`claude mcp add --transport http braventa ${serverUrl}`} />
        </li>
        <li>
          Start Claude Code, type <code>/mcp</code>, choose braventa and select <strong>Authenticate</strong>. Your browser
          opens Braventa: sign in, choose your business and select Approve.
        </li>
        <li className="text-muted">For a headless machine or CI, use an access key or a service key in a header instead.</li>
      </Guide>

      <Guide title="ChatGPT">
        <li>
          Needs a plan with Developer mode (Plus, Pro, Business, Enterprise or Edu). In a business workspace, an admin may
          have to allow custom connectors.
        </li>
        <li>
          In ChatGPT, open <strong>Settings → Apps</strong> (also called Apps &amp; Connectors) <strong>→ Advanced settings</strong>{" "}
          and turn on <strong>Developer mode</strong>.
        </li>
        <li>
          Choose <strong>Create</strong> (or Add custom MCP server). Name: Braventa. MCP server URL: the server URL above.
          Authentication: <strong>OAuth</strong>.
        </li>
        <li>Confirm you trust the connector and create it. Sign in to Braventa when asked, choose your business and select Approve.</li>
        <li>
          In a new chat, turn on Braventa from the <strong>+</strong> menu. ChatGPT asks before each action that changes
          something; approve each one.
        </li>
      </Guide>

      <div className="rounded-md bg-surface-muted px-3 py-2 text-sm">
        <p className="font-medium">Then ask your assistant</p>
        <p className="mt-1 text-muted">
          &quot;Use Braventa to set up my business from what you know about it. Ask me about anything you&apos;re not sure
          of.&quot;
        </p>
      </div>
    </div>
  );
}

function Guide({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-md border border-border px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <ol className="mt-2 list-decimal space-y-1 pb-1 pl-5 text-sm">{children}</ol>
    </details>
  );
}
