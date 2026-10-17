// A tiny, safe markdown subset for assistant answers (D-042): paragraphs, bulleted and numbered lists, **bold**,
// `code` and [links](/route). It returns plain data that React renders as text, so model output can never inject
// HTML. Links are kept only for app routes ("/…") and https links on braventa.io; anything else stays as text.
// Pure logic, unit-tested.

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string; external: boolean };

export type Block = { type: "p"; inlines: Inline[] } | { type: "ul" | "ol"; items: Inline[][] };

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
    if (m[1] !== undefined) out.push({ type: "strong", text: m[1] });
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

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", inlines: parseInline(para.join(" ")) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: list.type, items: list.items.map(parseInline) });
    list = null;
  };

  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    // Headings become bold paragraphs; the answer sits inside a dialog with its own heading.
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (!line) {
      flushPara();
      flushList();
    } else if (bullet || numbered) {
      flushPara();
      const type = bullet ? "ul" : "ol";
      if (list && list.type !== type) flushList();
      if (!list) list = { type, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (heading) {
      flushPara();
      flushList();
      blocks.push({ type: "p", inlines: [{ type: "strong", text: heading[1].replace(/\*\*/g, "") }] });
    } else if (list && /^\s{2,}/.test(raw)) {
      // Continuation of a list item.
      list.items[list.items.length - 1] += ` ${line}`;
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}
