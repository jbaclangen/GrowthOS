#!/usr/bin/env node
// Checks every relative markdown link and [[wikilink]] under map/ resolves to a file.
// Run from the repo root: node map/_meta/check-links.mjs   (exit 1 when a link is broken)
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..", "..");
const mapDir = join(root, "map");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

const files = walk(mapDir);
const slugs = new Map();
for (const f of files) slugs.set(basename(f, ".md"), f);

let broken = 0;
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/\]\(([^)\s#]+\.md)(#[^)]*)?\)/g)) {
    const target = resolve(dirname(f), m[1]);
    if (!existsSync(target)) { console.error(`${relative(root, f)}: broken link ${m[1]}`); broken++; }
  }
  for (const m of text.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
    const slug = m[1].trim().replace(/\.md$/, "");
    if (slug.includes(".")) continue; // a Next.js route segment such as [[...path]], not a wikilink
    if (!slugs.has(slug)) { console.error(`${relative(root, f)}: unknown wikilink [[${slug}]]`); broken++; }
  }
}
console.log(broken ? `${broken} broken link(s)` : `links ok (${files.length} files)`);
process.exit(broken ? 1 : 0);
