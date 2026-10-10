// Generates every Braventa logo, icon and social asset from geometry + font outlines.
// Source of truth for the mark is the SYMBOL constant below; colours come from design-system/tokens.json.
// Output: web/public/brand/** (SVG + PNG), web/src/app/{icon.svg,apple-icon.png,favicon.ico,opengraph-image.png}.
//
// The build tools are deliberately NOT app dependencies. To regenerate:
//   mkdir /tmp/brand-tools && cd /tmp/brand-tools && npm init -y
//   npm i fontkit wawoff2 sharp png-to-ico @fontsource-variable/quicksand @fontsource-variable/comfortaa
//   BRAND_TOOLS_DIR=/tmp/brand-tools node design-system/scripts/build-brand-assets.mjs   (from repo root)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TOOLS = process.env.BRAND_TOOLS_DIR;
if (!TOOLS) throw new Error("Set BRAND_TOOLS_DIR (see header comment).");
const req = createRequire(join(TOOLS, "package.json"));
const load = async (name) => {
  const mod = await import(pathToFileURL(req.resolve(name)).href);
  return mod.default ?? mod;
};
const fontkit = await load("fontkit");
const wawoff = await load("wawoff2");
const sharp = await load("sharp");
const pngToIco = await load("png-to-ico");

// ---- Colours (from tokens) -------------------------------------------------------------------
const tokens = JSON.parse(readFileSync(join(ROOT, "design-system/tokens.json"), "utf8"));
const c = (path) => path.split(".").reduce((n, k) => n[k], tokens.color).$value;
const INK = c("brand.ink"), PAPER = c("brand.paper"), COBALT = c("brand.cobalt"), VOLT = c("brand.volt");
const WHITE = "#FFFFFF", INK_400 = c("ink.400"), INK_700 = c("ink.700"), INK_800 = c("ink.800");

// ---- The Waypoint symbol (48-unit grid) -------------------------------------------------------
// A "B" drawn as a stem and two forward chevrons. The lower path stops short of a detached node:
// the path leads to the next action. Stroke 5.5u, round caps and joins; node r = 5.5u.
const SYMBOL = {
  stroke: 5.5,
  paths: ["M12 8 V40 M12 8 L31 16 L12 24 M12 24 L29 30.5", "M12 40 L29 33.5"],
  node: { cx: 35, cy: 32, r: 5.5 },
  // Tight bounds of the drawn shape, used when the symbol appears without its tile.
  box: { x: 9.25, y: 5.25, w: 31.25, h: 37.5 },
};
const glyph = (fg, node) =>
  SYMBOL.paths
    .map((d) => `<path d="${d}" fill="none" stroke="${fg}" stroke-width="${SYMBOL.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("") + `<circle cx="${SYMBOL.node.cx}" cy="${SYMBOL.node.cy}" r="${SYMBOL.node.r}" fill="${node}"/>`;

// ---- Font outlines ---------------------------------------------------------------------------
async function openFont(pkgFile) {
  const ttf = await wawoff.decompress(readFileSync(req.resolve(pkgFile)));
  return fontkit.create(Buffer.from(ttf));
}
// Founder decision D-015: Quicksand for headings and the wordmark, Comfortaa for everything else.
const quicksand = await openFont("@fontsource-variable/quicksand/files/quicksand-latin-wght-normal.woff2");
const comfortaa = await openFont("@fontsource-variable/comfortaa/files/comfortaa-latin-wght-normal.woff2");

// Returns an SVG path for `text` in font units, baseline at y=0, plus advance width and cap height.
function outline(font, text, { variation, track = 0 }) {
  const f = font.getVariation(variation);
  let x = 0, d = "";
  for (const ch of text) {
    const id = font.glyphForCodePoint(ch.codePointAt(0)).id;
    const g = f.getGlyph(id);
    d += g.path.scale(1, -1).translate(x, 0).toSVG();
    x += g.advanceWidth + track;
  }
  return { d, width: x - track, cap: font.capHeight };
}
// Places outlined text so its cap height = `cap` px, left edge at x, baseline at y.
function text(o, { x, y, cap, fill }) {
  const s = cap / o.cap;
  return { svg: `<path transform="translate(${r(x)} ${r(y)}) scale(${r(s, 5)})" d="${o.d}" fill="${fill}"/>`, width: o.width * s };
}
const r = (n, p = 2) => Number(n.toFixed(p));

// Lowercase Quicksand Bold: its round terminals echo the symbol's round caps. "cap" sizing uses the
// font's cap height, which matches the ascender of b and t.
const WORDMARK = outline(quicksand, "braventa", { variation: { wght: 700 }, track: 0 });

// ---- Lockups ---------------------------------------------------------------------------------
// Units: wordmark cap height = 100. Symbol height = 1.3 × cap. Gap symbol→wordmark = 0.45 × cap.
const SCHEMES = {
  "": { fg: INK, node: COBALT, word: INK }, // for light backgrounds (primary)
  "-reversed": { fg: PAPER, node: VOLT, word: PAPER }, // for dark backgrounds
  "-mono-black": { fg: INK, node: INK, word: INK },
  "-mono-white": { fg: WHITE, node: WHITE, word: WHITE },
};
const svgDoc = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${r(w)}" height="${r(h)}" viewBox="0 0 ${r(w)} ${r(h)}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;
function placeSymbol(x, y, height, fg, node) {
  const s = height / SYMBOL.box.h;
  return `<g transform="translate(${r(x - SYMBOL.box.x * s)} ${r(y - SYMBOL.box.y * s)}) scale(${r(s, 5)})">${glyph(fg, node)}</g>`;
}
const symbolWidth = (height) => (SYMBOL.box.w / SYMBOL.box.h) * height;

function horizontal({ fg, node, word }) {
  const cap = 100, symH = 130, gap = 45;
  const sw = symbolWidth(symH);
  const t = text(WORDMARK, { x: sw + gap, y: symH / 2 + cap / 2, cap, fill: word });
  return svgDoc(sw + gap + t.width, symH, placeSymbol(0, 0, symH, fg, node) + t.svg, "Braventa");
}
function stacked({ fg, node, word }) {
  const cap = 100, symH = 220, gap = 60;
  const wordW = WORDMARK.width * (cap / WORDMARK.cap);
  const sw = symbolWidth(symH);
  const t = text(WORDMARK, { x: 0, y: symH + gap + cap, cap, fill: word });
  return svgDoc(wordW, symH + gap + cap, placeSymbol((wordW - sw) / 2, 0, symH, fg, node) + t.svg, "Braventa");
}
function wordmark({ word }) {
  const cap = 100;
  const t = text(WORDMARK, { x: 0, y: cap, cap, fill: word });
  return svgDoc(t.width, cap, t.svg, "Braventa");
}
function symbol({ fg, node }) {
  const h = 160;
  return svgDoc(symbolWidth(h), h, placeSymbol(0, 0, h, fg, node), "Braventa");
}
// App icon: Ink tile, Paper glyph, Volt node. `rounded` false = full-bleed (Apple applies its own mask).
// `inset` < 1 shrinks the glyph for surfaces that crop to a circle (social avatars).
const appIcon = (size, rounded = true, inset = 1) =>
  svgDoc(
    size,
    size,
    `<g transform="scale(${r(size / 48, 5)})"><rect width="48" height="48" ${rounded ? 'rx="11"' : ""} fill="${INK}"/><g transform="translate(24 24) scale(${inset}) translate(-24 -24)">${glyph(PAPER, VOLT)}</g></g>`,
    "Braventa",
  );

// ---- Social artwork --------------------------------------------------------------------------
// Ink canvas, a quiet dot grid (the "map" texture) and a few connected nodes (the "graph"), one Volt.
function graphTexture(w, h, { x0, x1, y0, y1 }) {
  let dots = "";
  for (let y = 24; y < h; y += 24) for (let x = 24; x < w; x += 24) dots += `<circle cx="${x}" cy="${y}" r="1.1" fill="${INK_800}"/>`;
  // Node positions normalised to the region; node 4 is the Volt "next action".
  const pts = [[0, 0.5], [0.42, 0], [0.82, 0.3], [0.58, 0.85], [1, 0.7], [0.22, 1]].map(([px, py]) => [
    Math.round(x0 + px * (x1 - x0)),
    Math.round(y0 + py * (y1 - y0)),
  ]);
  const edges = [[0, 1], [1, 2], [0, 3], [2, 3], [3, 4], [3, 5]];
  const lines = edges.map(([a, b]) => `<line x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="${INK_700}" stroke-width="2"/>`).join("");
  const nodes = pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 4 ? 9 : 6}" fill="${i === 4 ? VOLT : INK}" stroke="${i === 4 ? VOLT : INK_400}" stroke-width="2"/>`).join("");
  return dots + lines + nodes;
}
const HEADLINE = (t) => outline(quicksand, t, { variation: { wght: 700 }, track: 0 });
const LABEL = (t) => outline(comfortaa, t, { variation: { wght: 600 }, track: 90 });

function social(w, h, { pad, symH, cap, labelCap, lines, graph }) {
  let body = `<rect width="${w}" height="${h}" fill="${INK}"/>` + graphTexture(w, h, graph);
  body += placeSymbol(pad, pad, symH, PAPER, VOLT);
  let y = h - pad - labelCap * 2.6 - (lines.length - 1) * cap * 1.25;
  if (lines.length) {
    body += text(LABEL("BUSINESS GROWTH SYSTEM"), { x: pad, y: y - cap - labelCap * 1.8, cap: labelCap, fill: INK_400 }).svg;
    for (const line of lines) {
      body += text(HEADLINE(line), { x: pad, y, cap, fill: PAPER }).svg;
      y += cap * 1.25;
    }
  }
  body += text(LABEL("BRAVENTA.IO"), { x: pad, y: h - pad, cap: labelCap, fill: INK_400 }).svg;
  return svgDoc(w, h, body, "Braventa — Run your growth as one system.");
}

// ---- Write -----------------------------------------------------------------------------------
const BRAND = join(ROOT, "web/public/brand");
const APP = join(ROOT, "web/src/app");
for (const d of ["", "png", "social"]) mkdirSync(join(BRAND, d), { recursive: true });
const write = (path, data) => {
  writeFileSync(path, data);
  console.log("wrote", path.replace(ROOT, "").replaceAll("\\", "/"));
};
const png = (svg, width, path) => sharp(Buffer.from(svg), { density: 300 }).resize({ width }).png().toBuffer().then((b) => write(path, b));

for (const [suffix, scheme] of Object.entries(SCHEMES)) {
  write(join(BRAND, `braventa-logo-horizontal${suffix}.svg`), horizontal(scheme));
  write(join(BRAND, `braventa-logo-stacked${suffix}.svg`), stacked(scheme));
  write(join(BRAND, `braventa-symbol${suffix}.svg`), symbol(scheme));
  write(join(BRAND, `braventa-wordmark${suffix}.svg`), wordmark(scheme));
}
write(join(BRAND, "braventa-app-icon.svg"), appIcon(48));
await png(horizontal(SCHEMES[""]), 1200, join(BRAND, "png/braventa-logo-horizontal-1200.png"));
await png(horizontal(SCHEMES["-reversed"]), 1200, join(BRAND, "png/braventa-logo-horizontal-reversed-1200.png"));
await png(stacked(SCHEMES[""]), 800, join(BRAND, "png/braventa-logo-stacked-800.png"));
for (const s of [192, 512, 1024]) await png(appIcon(s), s, join(BRAND, `png/braventa-app-icon-${s}.png`));

const socials = {
  "braventa-og-1200x630": social(1200, 630, { pad: 72, symH: 64, cap: 50, labelCap: 15, lines: ["Run your growth", "as one system."], graph: { x0: 700, x1: 1110, y0: 70, y1: 280 } }),
  "braventa-linkedin-cover-1584x396": social(1584, 396, { pad: 56, symH: 48, cap: 38, labelCap: 12, lines: ["Run your growth as one system."], graph: { x0: 980, x1: 1500, y0: 40, y1: 190 } }),
  "braventa-x-header-1500x500": social(1500, 500, { pad: 64, symH: 52, cap: 42, labelCap: 13, lines: ["Run your growth", "as one system."], graph: { x0: 920, x1: 1410, y0: 60, y1: 230 } }),
};
for (const [name, svg] of Object.entries(socials)) {
  write(join(BRAND, `social/${name}.svg`), svg);
  await png(svg, Number(name.match(/(\d+)x\d+$/)[1]), join(BRAND, `social/${name}.png`));
}
await png(appIcon(400, false, 0.78), 400, join(BRAND, "social/braventa-avatar-400.png"));

// Next.js metadata files (app router conventions).
write(join(APP, "icon.svg"), appIcon(48));
await png(appIcon(180, false), 180, join(APP, "apple-icon.png"));
await png(socials["braventa-og-1200x630"], 1200, join(APP, "opengraph-image.png"));
write(join(APP, "opengraph-image.alt.txt"), "Braventa — Run your growth as one system.");
const icoPngs = await Promise.all([16, 32, 48].map((s) => sharp(Buffer.from(appIcon(s))).resize(s).png().toBuffer()));
write(join(APP, "favicon.ico"), await pngToIco(icoPngs));

// Geometry for the in-app <Logo> component, so it renders inline (theme-aware) from the same source.
const wordScale = 100 / WORDMARK.cap;
write(
  join(ROOT, "web/src/components/brand/logo-geometry.ts"),
  `// GENERATED by design-system/scripts/build-brand-assets.mjs — do not edit.
// Waypoint symbol on a 48-unit grid; wordmark outlined from Quicksand Bold, cap height 100.
export const SYMBOL = ${JSON.stringify(SYMBOL)} as const;
export const WORDMARK = ${JSON.stringify({ d: WORDMARK.d, scale: r(wordScale, 6), width: r(WORDMARK.width * wordScale), cap: 100 })} as const;
`,
);
