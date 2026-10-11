# Connect your AI assistant to Braventa

**Audience:** business owners (support article draft for the help site, see [SUPPORT_SITE.md](SUPPORT_SITE.md)).
Technical reference: [MCP_SERVER.md](../architecture/MCP_SERVER.md).

If you've already worked on your business with Claude (your services, customers, goals and problems), Claude can
answer Braventa's setup questions for you. You don't retype anything, and you still review the diagnosis and approve
every draft in Braventa.

## What Claude can and can't do

**Can:** start an analysis of your website, answer the discovery questions (what's holding the business back),
confirm your top three priorities, answer the follow-up questions, and tell you when your growth plan is ready, with
your growth score and top recommendations.

**Can't:** confirm or correct the diagnosis, accept plan items, or approve drafts. Those stay in Braventa, where you
see the evidence. Claude also can't publish, send email or change your website.

**Works with:** Claude Desktop and Claude Code. claude.ai and ChatGPT are coming soon.

**Who can use it:** everyone during the 14-day Pro trial, then any paid plan (Basic, Pro or Premium). After the trial
ends without a plan, the connection pauses; your keys and data stay, and it works again once you're on a plan.

## Set it up (about 5 minutes)

1. **Sign in to Braventa** at app.braventa.io and open **Settings** (top right). New account? You can start here
   without analyzing a website first: you'll be asked for your business name.
2. **Choose your Claude app:** Claude Desktop or Claude Code.
3. **Create an access key.** Give it a name you'll recognize, such as "Claude Desktop on my laptop", and select
   **Create key**. Braventa shows the key once, already placed in the setup you need. Copy it before leaving the page.
4. **Add Braventa to Claude.**
   - **Claude Desktop** (needs [Node.js](https://nodejs.org), LTS version):
     1. In Claude Desktop, open **Settings → Developer → Edit config**.
     2. If the file is empty or only has `{}`, replace everything with the setup Braventa showed you. If it already
        has an `mcpServers` section, add the `braventa` entry inside it.
     3. Save, quit Claude Desktop completely, and open it again.
   - **Claude Code:** paste the command Braventa showed you into a terminal, then start Claude Code. Type `/mcp` to
     see Braventa listed.
5. **Check the connection.** Ask Claude "Check my Braventa status", then select **Check connection** in Settings.
   It says when Claude last reached Braventa.
6. **Ask Claude to set up your business.** For example: "Use Braventa to set up my business from what you know about
   it. Ask me about anything you're not sure of."

Claude will start the website analysis, answer the questions and tell you when the plan is ready (usually a few
minutes). Then open the report link to review the diagnosis and drafts.

## Keep your key safe

- The key works like a password for your Braventa business. Don't share it or paste it into documents or chats.
- Braventa stores only a scrambled version (a one-way hash), so we can't show it to you again. If you lose it, create
  a new one.
- Settings shows when each key was last used. **Revoke** a key you no longer use, or right away if you think someone
  else has it. You can have up to 5 active keys.

## Troubleshooting

| What you see | What to do |
|---|---|
| Braventa doesn't appear in Claude Desktop | Check that Node.js is installed, the config file is valid JSON (no missing commas or brackets), and that you fully quit and reopened Claude Desktop. |
| "Check connection" says Braventa hasn't heard from Claude | Ask Claude something about Braventa first; the check only sees requests Claude has already made. |
| Claude says the key isn't valid | The key may be revoked or mistyped. Create a new key and replace the old one in the setup. |
| Claude says your trial has ended | Choose a plan on the Plans page; the connection works again right away. |
| Claude says it's sending requests too fast | Wait a minute and try again (limits: 30 requests a minute, 300 an hour per key). |

## Service keys and the API

There are no service keys or a public API yet. Access keys are personal: each belongs to one person and one business,
and works only with Braventa's MCP connection for the setup steps above. Keys for other systems (for example,
automation tools) and a public API aren't available; if you need one, tell us through the contact page.
