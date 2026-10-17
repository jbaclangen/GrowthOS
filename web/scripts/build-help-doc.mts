// Writes docs/help/APP_GUIDE.md from the in-app assistant's knowledge base (web/src/lib/assistant/knowledge.ts, the
// source). `--check` fails when the file is out of date instead (a unit test checks the same).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderGuide } from "../src/lib/assistant/knowledge";

const target = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/help/APP_GUIDE.md");
const content = renderGuide();

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
  } catch {
    // Missing file: out of date.
  }
  if (current !== content) {
    console.error("docs/help/APP_GUIDE.md is out of date. Run `npm run help:doc` in web/.");
    process.exit(1);
  }
  console.log("docs/help/APP_GUIDE.md is current.");
} else {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(`Wrote ${target}`);
}
