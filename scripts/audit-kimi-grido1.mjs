import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const read = (path) => readFileSync(path, "utf8");
const html = read("kimi-grido1.html");
const part03 = read("reference/kimi-grido1/part-03-html-markup.html");
const part04 = read("reference/kimi-grido1/part-04-js-engine.html");
const part08b = read("reference/kimi-grido1/part-08b-season-circuit-path.ts");
const part08c = read("reference/kimi-grido1/part-08c-season-map-dots.ts");

function count(source, token) {
  return source.split(token).length - 1;
}

function assertBalanced(source, open, close, label) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let comment = false;

  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    const next = source[i + 1];

    if (comment) {
      if (c === "*" && next === "/") {
        comment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === "\\") {
        escaped = true;
        continue;
      }
      if (c === quote) quote = "";
      continue;
    }

    if (c === "/" && next === "*") {
      comment = true;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (c === open) depth += 1;
    if (c === close) {
      depth -= 1;
      assert.ok(depth >= 0, label + ": unexpected " + close);
    }
  }

  assert.equal(depth, 0, label + ": unbalanced " + open + close);
  assert.equal(quote, "", label + ": unterminated string");
  assert.equal(comment, false, label + ": unterminated comment");
}

const requiredParts = [
  "part-01-head-tokens-base.html",
  "part-02-layout-css.html",
  "part-03-html-markup.html",
  "part-04-js-engine.html",
  "part-05-hero-ui.html",
  "part-06-hero-scene-a.html",
  "part-07-hero-scene-b.html",
  "part-08a-season-css-map-vectors.html",
  "part-08b-season-circuit-path.ts",
  "part-08c-season-map-dots.ts",
  "part-08d-season-map-lap-halftone-dissolve.html",
  "part-09-timeline-paddock-footer.html",
  "part-09b-timeline-paddock-calendar-footer.js",
  "part-10-hero-wrapper-boot.html",
];

for (const file of requiredParts) {
  read("reference/kimi-grido1/" + file);
}
console.log("PASS: all " + requiredParts.length + " source parts exist");

assert.ok(part03.includes("<!-- SCRIPTS: Part 4 onward go here -->"), "Part 03 script marker must be closed");
assert.ok(html.includes("<!-- SCRIPTS: Part 4 onward go here -->"), "assembled script marker must be closed");
assert.equal(count(part03, "<!--"), count(part03, "-->"), "Part 03 HTML comments must be balanced");
assert.equal(count(html, "<!--"), count(html, "-->"), "assembled HTML comments must be balanced");
console.log("PASS: HTML comment markers are balanced");

assert.ok(part04.includes("rootMargin = el.dataset.margin || rootMargin;"), "Part 04 bindGate margin override missing");
assert.ok(html.includes("rootMargin = el.dataset.margin || rootMargin;"), "assembled bindGate margin override missing");
console.log("PASS: bindGate margin override is present in source and page");

const circuitMatch = part08b.match(/const CIRCUIT_PATH\s*=\s*\[([\s\S]*?)\n\];/);
assert.ok(circuitMatch, "CIRCUIT_PATH array not found");
const points = [...circuitMatch[1].matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)];
assert.equal(points.length, 907, "CIRCUIT_PATH sample count changed; review before updating this assertion");
assert.equal(points[0][1], points.at(-1)[1], "CIRCUIT_PATH must close at its starting X");
assert.equal(points[0][2], points.at(-1)[2], "CIRCUIT_PATH must close at its starting Y");
console.log("PASS: CIRCUIT_PATH has 907 closed samples");

assert.ok(part08c.includes("Rebuilt runtime fallback"), "Part 08C fallback provenance must remain documented");
assert.ok(part08c.includes("TRACK_RIBBON"), "Part 08C must derive its fallback from TRACK_RIBBON");
assert.ok(part08c.includes("count: columns.length"), "Part 08C runtime dot count must be computed from generated points");
console.log("PASS: Part 08C fallback is documented and count is runtime-derived");

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "Duplicate HTML id found");
const idSet = new Set(ids);
const anchors = [...new Set([...html.matchAll(/\bhref=["']#([^"']+)["']/g)].map((match) => match[1]))];
for (const anchor of anchors) {
  assert.ok(idSet.has(anchor), "Missing internal anchor target: #" + anchor);
}
console.log("PASS: " + ids.length + " unique IDs and " + anchors.length + " valid internal anchors");

const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]);
assert.ok(styles.length > 0, "No CSS style blocks found");
for (let i = 0; i < styles.length; i += 1) {
  assertBalanced(styles[i], "{", "}", "CSS block " + (i + 1) + " braces");
  assertBalanced(styles[i], "(", ")", "CSS block " + (i + 1) + " parentheses");
}
console.log("PASS: " + styles.length + " CSS blocks have balanced braces and parentheses");

const moduleMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/i);
assert.ok(moduleMatch, "Inline module script not found");
const tempDir = mkdtempSync(join(tmpdir(), "kimi-grido1-audit-"));
try {
  const modulePath = join(tempDir, "page.mjs");
  writeFileSync(modulePath, moduleMatch[1], "utf8");
  execFileSync(process.execPath, ["--check", modulePath], { stdio: "inherit" });
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
console.log("PASS: assembled JavaScript module syntax");
console.log("NOTE: browser rendering, WebGL, network assets and interaction tests require a browser and are not covered by this static audit.");
