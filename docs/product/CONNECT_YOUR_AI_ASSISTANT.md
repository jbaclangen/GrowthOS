# Connect your AI assistant to Braventa

**Audience:** business owners (support article draft for the help site, see [SUPPORT_SITE.md](SUPPORT_SITE.md)).
Technical reference: [MCP_SERVER.md](../architecture/MCP_SERVER.md); developers: [MCP_AND_API.md](../developers/MCP_AND_API.md).

**Status (2026-10-17):** access keys for Claude Desktop and Claude Code are live. "Sign in with Braventa" for
claude.ai, Claude Desktop, Claude Code and ChatGPT, and service keys, are built and go live with the next release
(after the database update). Until then, publish only the "access key" parts of this article.

If you've already worked on your business with Claude or ChatGPT (your services, customers, goals and problems), your
assistant can answer Braventa's setup questions for you. You don't retype anything, and you still review the
diagnosis and approve every draft in Braventa.

## What your assistant can and can't do

**Can:** start an analysis of your website, answer the discovery questions (what's holding the business back),
confirm your top three priorities, answer the follow-up questions, and tell you when your growth plan is ready, with
your growth score and top recommendations.

**Can't:** confirm or correct the diagnosis, accept plan items, or approve drafts. Those stay in Braventa, where you
see the evidence. It also can't publish, send email or change your website.

**Works with:** claude.ai, Claude Desktop, Claude Code and ChatGPT (plans with Developer mode).

**Who can use it:** everyone during the 14-day Pro trial, then any paid plan (Basic, Pro or Premium). After the trial
ends without a plan, the connection pauses; your connections and data stay, and it works again once you're on a plan.

## Set it up with "Sign in with Braventa" (about 3 minutes)

Braventa's server address is **`https://app.braventa.io/api/mcp`**. You also find it, with these steps, in Braventa →
**Settings → Integrations**. Menu names are as of October 2026; the apps move them occasionally.

### claude.ai (and Claude Desktop and mobile)

1. In Claude, open **Customize → Connectors** (on some versions, Settings → Connectors).
2. Select **+ Add**, then **Add custom connector**.
3. Name it **Braventa** and paste the server address. Keep sign-in (OAuth) as the authentication. Select **Add**.
4. Select **Connect**. A Braventa window opens: sign in, choose your business and select **Approve**.
5. In a chat, select **+ → Connectors** and turn Braventa on.

Claude Desktop uses the same connectors as claude.ai, so it appears there too. On Team and Enterprise plans, an owner
first adds the connector under **Organization settings → Connectors**; then each person connects it from Customize →
Connectors.

### Claude Code

1. In a terminal, run: `claude mcp add --transport http braventa https://app.braventa.io/api/mcp`
2. Start Claude Code, type `/mcp`, choose **braventa** and select **Authenticate**.
3. Your browser opens Braventa: sign in, choose your business and select **Approve**.

### ChatGPT

See [CONNECT_CHATGPT.md](CONNECT_CHATGPT.md). In short: turn on Developer mode, create a connector with the server
address and OAuth, then sign in to Braventa and approve.

### Then ask

"Use Braventa to set up my business from what you know about it. Ask me about anything you're not sure of."

Your assistant starts the website analysis, answers the questions and tells you when the plan is ready (usually a
few minutes). Then open the report link to review the diagnosis and drafts.

## What you approve

The Braventa sign-in window shows the app's name, where it returns you (for example claude.ai or chatgpt.com), the
business, and what the app can do: **set up your business and check its status**. Only approve a request you started
yourself. If you have more than one business, you choose which one.

## Use an access key instead

Prefer a config file, or your Claude app can't open a browser? In **Settings → Integrations → Use an access key
instead**, choose Claude Desktop or Claude Code, create a key and paste the ready-made setup Braventa shows you:

- **Claude Desktop** (needs [Node.js](https://nodejs.org), LTS version): **Settings → Developer → Edit config**; if the
  file is empty or only has `{}`, replace everything with the setup; if it already has an `mcpServers` section, add
  the `braventa` entry inside it. Save, quit Claude Desktop completely and open it again.
- **Claude Code:** paste the command into a terminal, then start Claude Code. Type `/mcp` to see Braventa listed.

Then ask Claude "Check my Braventa status" and select **Check connection** in Settings.

## Service keys (for automation)

Owners can create **service keys** in Settings → Integrations for tools such as n8n, Zapier or a developer's script.
A service key belongs to the business, can do the same setup and status steps, and can expire after 30, 90 or 365
days. Braventa shows it once. Revoke it when you stop using the tool. Developer details:
[MCP_AND_API.md](../developers/MCP_AND_API.md).

## Keep your connections safe

- Keys work like a password for your Braventa business. Don't share them or paste them into documents or chats.
- Braventa stores only a scrambled version (a one-way hash), so it can't show a key again. If you lose one, create a
  new one.
- **Settings → Integrations** shows when each key and connected app was last used. **Disconnect** an app or
  **Revoke** a key you no longer use, or right away if you think someone else has it. You can have up to 5 active
  personal keys and 10 service keys.

## Troubleshooting

| What you see | What to do |
|---|---|
| The Braventa window says the app isn't registered or the return address isn't recognized | Remove the connector in your app and add it again. |
| The sign-in window opens but nothing happens after Approve | Make sure JavaScript is on, then try again from your app. |
| Your app says it was disconnected or asks you to sign in again | Someone selected Disconnect in Braventa, the connection wasn't used for 30 days, or the sign-in was reused from another device. Connect again from the app. |
| Braventa doesn't appear in Claude Desktop (key setup) | Check that Node.js is installed, the config file is valid JSON, and that you fully quit and reopened Claude Desktop. |
| "Check connection" says Braventa hasn't heard from Claude | Ask Claude something about Braventa first; the check only sees requests Claude has already made. |
| Your assistant says the key isn't valid | The key may be revoked, expired or mistyped. Create a new key and replace the old one. |
| Your assistant says your trial has ended | Choose a plan on the Plans page; the connection works again right away. |
| Your assistant says it's sending requests too fast | Wait a minute and try again (limits: 30 requests a minute, 300 an hour per key or app). |
