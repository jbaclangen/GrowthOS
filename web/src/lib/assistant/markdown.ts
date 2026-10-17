// A tiny, safe markdown subset for assistant answers (D-043): paragraphs, bulleted and numbered lists (one level of
// nesting), **bold**, `code` and [links](/route), including links inside bold. It returns plain data that React
// renders as text, so model output can never inject HTML. Links are kept only for app routes ("/…") and https links
// on braventa.io; anything else stays as text. Pure logic, unit-tested.

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; inlines: Inline[] } // text, code and links; never nested bold
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string; external: boolean };

// `start` is the first item's number as written (numbered lists only), so a list split by the model still counts on.
export type List = { type: "ul" | "ol"; start: number; items: ListItem[] };
export type ListItem = { inlines: Inline[]; sub: List | null };
export type Block = { type: "p"; inlines: Inline[] } | List;

export function safeHref(href: string): { href: string; external: boolean } | null {
  const h = href.trim();
  // App routes only: "/settings", "/analysis/…#x". Not protocol-relative ("//evil.com") or backslash tricks.
  if (/^\/(?![/\\])[^\s]*$/.test(h)) {
    // Placeholder routes ("/analysis/[id]") aren't real pages.
    if (/[[\]]/.test(h)) return null;
    return { href: h, external: false };
  }
  try {
    const url = new URL(h);
    if (url.protocol === "https:" && (url.hostname === "braventa.io" || url.hostname.endsWith(".braventa.io"))) {
      return { href: url.toString(), external: true };
    }
  } catch {
    // Not a URL: render as text.
  }
  return null;
}

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    // Bold content can't contain "*", so parsing it again finds code and links but never more bold.
    if (m[1] !== undefined) out.push({ type: "strong", inlines: parseInline(m[1]) });
    else if (m[2] !== undefined) out.push({ type: "code", text: m[2] });
    else {
      const link = safeHref(m[4]);
      out.push(link ? { type: "link", text: m[3], ...link } : { type: "text", text: m[3] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  // Merge neighbouring text runs.
  return out.reduce<Inline[]>((acc, i) => {
    const prev = acc[acc.length - 1];
    if (i.type === "text" && prev?.type === "text") prev.text += i.text;
    else acc.push({ ...i });
    return acc;
  }, []);
}

type DraftList = { type: "ul" | "ol"; start: number; items: { text: string; sub: { type: "ul" | "ol"; start: number; items: string[] } | null }[] };

const ITEM = /^(?:([-*•])|(\d+)[.)])\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  // Assigned inside flushList too, so the type is declared rather than narrowed from the initial null.
  let list = null as DraftList | null;
  // A blank line since the last list line: the list stays open in case the next line continues it ("1." blank "2.").
  let gap = false;

  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", inlines: parseInline(para.join(" ")) });
    para = [];
  };
  const flushList = () => {
    if (list) {
      blocks.push({
        type: list.type,
        start: list.start,
        items: list.items.map((item) => ({
          inlines: parseInline(item.text),
          sub: item.sub ? { ...item.sub, items: item.sub.items.map((t) => ({ inlines: parseInline(t), sub: null })) } : null,
        })),
      });
    }
    list = null;
    gap = false;
  };

  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const indented = /^(?: {2,}|\t)/.test(raw);
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const item = line.match(ITEM);
    if (!line) {
      flushPara();
      if (list) gap = true;
      continue;
    }
    if (item) {
      const type = item[1] ? "ul" : "ol";
      const start = item[2] ? Number(item[2]) : 1;
      const text = item[3];
      if (list && indented && list.items.length) {
        // An indented item belongs to the item above it ("1. Open Settings" then "   - Choose Claude Desktop").
        const parent = list.items[list.items.length - 1];
        if (!parent.sub) parent.sub = { type, start, items: [] };
        parent.sub.items.push(text);
        gap = false;
        continue;
      }
      flushPara();
      if (list && list.type !== type) flushList();
      if (!list) list = { type, start, items: [] };
      list.items.push({ text, sub: null });
      gap = false;
      continue;
    }
    if (heading) {
      flushPara();
      flushList();
      // Headings become bold paragraphs; the answer sits inside a dialog with its own heading.
      blocks.push({ type: "p", inlines: [{ type: "strong", inlines: parseInline(heading[1].replace(/\*\*/g, "")) }] });
      continue;
    }
    if (list && indented) {
      // Continuation of the last list item (or of its last sub-item when there was no blank line).
      const last = list.items[list.items.length - 1];
      if (last.sub && !gap) last.sub.items[last.sub.items.length - 1] += ` ${line}`;
      else last.text += ` ${line}`;
      gap = false;
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}
