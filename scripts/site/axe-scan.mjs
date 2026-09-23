// SPDX-FileCopyrightText: Vernum Projecten B.V.
// SPDX-License-Identifier: BUSL-1.1
//
// Accessibility report + gate for the assembled static site (_site).
//
// Serves the built tree and runs axe-core (WCAG 2.2 A/AA) against the landing
// page and the book pages under every mdBook theme, printing a grouped report
// and writing axe-report.json.
//
// TWO modes:
//   - default (report): always exits 0. Full visibility, no enforcement.
//   - --strict (gate):  exits 1 if any finding is in GATE_RULES (see below) —
//     rule classes on pages we control that are currently CLEAN, so an
//     occurrence is a regression we caused. Everything outside GATE_RULES stays
//     report-only, so upstream mdBook chrome issues (sidebar-toggle ARIA,
//     target-size on the print/git icons) never fail a build we cannot fix —
//     the anti-pattern docs.yml documents for external link-checking.
//
// The gate is a ratchet: GATE_RULES widens only after a class is clean in a
// deployed build, never the other way.
//
// Detector, not a conformance verdict: axe covers ~30-40% of WCAG. A clean run
// means axe found nothing in its rule set on the scanned pages, not that the
// site is fully conformant.
//
// Usage: node scripts/site/axe-scan.mjs [--strict] <site-dir> [base-path]
//   --strict   fail (exit 1) on any finding in GATE_RULES
//   site-dir   the assembled _site directory
//   base-path  the sub-path the site is served under (default "/FerroEHR",
//              matching the fork's project-pages base); "" for apex-root.
//
// Peer deps (installed in CI, never added to this repo's manifest):
//   playwright, @axe-core/playwright, http-server (or any static server)

import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const positional = args.filter(a => !a.startsWith("--"));
const SITE_DIR = positional[0];
const BASE = positional[1] ?? "/FerroEHR";
if (!SITE_DIR) {
  console.error("usage: node axe-scan.mjs [--strict] <site-dir> [base-path]");
  process.exit(2);
}

// The gate set: rule classes on pages we control that are currently CLEAN, so
// any occurrence is a regression we caused. With --strict, a finding matching
// an entry here fails the build (exit 1); everything else stays a report.
//
// Deliberately NARROW — it names only what is proven clean and ours to fix:
//   - color-contrast: our theme tokens (landing + book custom.css), cleared in
//     #8/#11/#15/#16/#18.
//   - link-in-text-block: our link styling, cleared in #11 (landing) / #16 (book).
// NOT gated (report-only): target-size and aria on mdBook's own chrome
// (upstream), and anything not yet proven clean. Widen this set only after the
// class is clean in a deployed build — the ratchet only tightens.
const GATE_RULES = new Set(["color-contrast", "link-in-text-block"]);

// Pages to scan, as paths under BASE. Representative, not exhaustive: the
// landing page and book pages that exercise prose, tables, and code. Both
// /docs/dev/ and /docs/latest/ are covered — a --dev-only build aliases latest
// to the dev tree, and the deployed site serves both, so a finding on one is a
// finding on the other. The landing page is theme-agnostic (own light/dark via
// prefers-color-scheme); the book pages are re-scanned per mdBook theme below.
const LANDING = ["/"];
const BOOK_PAGES = [
  "/docs/dev/",
  "/docs/dev/installation/index.html",
  "/docs/latest/",
  "/docs/latest/installation/index.html",
];

// mdBook's theme is a class on <html> + a localStorage key, NOT
// prefers-color-scheme — so contrast varies by theme and each must be scanned.
// light: the light theme; coal: the preferred dark; ayu: the darkest (worst
// case for contrast). Set before mdBook's own script runs (addInitScript).
const BOOK_THEMES = ["light", "coal", "ayu"];

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

// A tiny static server that serves SITE_DIR at BASE (so absolute /FerroEHR/…
// links in the built HTML resolve exactly as on Pages).
function serve(dir, base) {
  return new Promise(resolve => {
    const server = createServer(async (req, res) => {
      try {
        let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
        if (base && path.startsWith(base)) path = path.slice(base.length);
        if (path.endsWith("/")) path += "index.html";
        const full = normalize(join(dir, path));
        if (!full.startsWith(normalize(dir))) { res.writeHead(403).end(); return; }
        const body = await readFile(full);
        res.writeHead(200, { "content-type": MIME[extname(full)] ?? "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const server = await serve(SITE_DIR, BASE);
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
const report = [];

// Records one page+theme's violations. `theme` is null for the theme-agnostic
// landing page.
async function scan(page, path, theme) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const v = results.violations;
  // The landing page is author-controlled (website/landing/). Book pages are
  // mdBook-generated, BUT some of their colours are ours (custom.css theme
  // tokens), so a book contrast finding may still be authored — the split here
  // is by origin of the markup; triage decides fixability (see the header).
  const scope = path === "/" ? "authored" : "book(mdbook+custom.css)";
  for (const r of v) {
    report.push({
      page: `${BASE}${path}`,
      theme: theme,
      scope,
      id: r.id,
      impact: r.impact,
      help: r.help,
      wcag: (r.tags || []).filter(t => /^wcag\d/.test(t)),
      nodes: r.nodes.length,
      targets: r.nodes.slice(0, 3).map(n => n.target?.join(" ")),
    });
  }
  const nodes = v.reduce((n, r) => n + r.nodes.length, 0);
  console.log(`scanned ${BASE}${path}${theme ? " [" + theme + "]" : ""}: ${v.length} rule(s), ${nodes} node(s)`);
}

// Landing: theme-agnostic, one pass. @axe-core/playwright needs a context.
{
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const p of LANDING) {
    const resp = await page.goto(`${origin}${BASE}${p}`, { waitUntil: "networkidle" }).catch(() => null);
    if (!resp || !resp.ok()) { console.error(`SKIP (not served): ${BASE}${p}`); continue; }
    await scan(page, p, null);
  }
  await context.close();
}

// Book pages: one context per theme, with the mdBook theme forced BEFORE the
// page's own script runs, so the class it applies matches the theme under test.
for (const theme of BOOK_THEMES) {
  const context = await browser.newContext();
  await context.addInitScript(t => {
    try { localStorage.setItem("mdbook-theme", t); } catch {}
  }, theme);
  const page = await context.newPage();
  for (const p of BOOK_PAGES) {
    const resp = await page.goto(`${origin}${BASE}${p}`, { waitUntil: "networkidle" }).catch(() => null);
    if (!resp || !resp.ok()) { console.error(`SKIP (not served): ${BASE}${p} [${theme}]`); continue; }
    // Belt-and-braces: mdBook sets the class from storage on load, but force it
    // too in case timing differs, then let styles settle.
    await page.evaluate(t => {
      const el = document.documentElement;
      el.classList.remove("light", "rust", "coal", "navy", "ayu");
      el.classList.add(t);
    }, theme);
    await page.waitForTimeout(150);
    await scan(page, p, theme);
  }
  await context.close();
}

await browser.close();
server.close();

const landing = report.filter(r => r.scope === "authored");
const book = report.filter(r => r.scope !== "authored");
const nodesOf = rs => rs.reduce((n, r) => n + r.nodes, 0);

function printGroup(title, rows) {
  console.log(`\n${title}: ${nodesOf(rows)} node(s) across ${rows.length} rule occurrence(s)`);
  for (const r of rows) {
    const where = r.theme ? `${r.page} [${r.theme}]` : r.page;
    console.log(`  [${r.impact}] ${r.id} (${r.wcag.join(",")}) — ${r.nodes} node(s) on ${where}`);
    for (const t of r.targets) console.log(`      ${t}`);
  }
}

printGroup("LANDING (website/landing — our content)", landing);
printGroup("BOOK (mdBook markup + our custom.css theme)", book);

// Per-theme book totals — the whole point of the theme sweep.
console.log("\nBook nodes by theme:");
for (const t of BOOK_THEMES) {
  console.log(`  ${t}: ${nodesOf(book.filter(r => r.theme === t))} node(s)`);
}

// Machine-readable artifact for CI upload / trend diffing.
const { writeFileSync } = await import("node:fs");
writeFileSync("axe-report.json", JSON.stringify({
  scanned_at: new Date().toISOString(),
  base: BASE,
  landing_pages: LANDING,
  book_pages: BOOK_PAGES,
  book_themes: BOOK_THEMES,
  landing_nodes: nodesOf(landing),
  book_nodes: nodesOf(book),
  book_nodes_by_theme: Object.fromEntries(BOOK_THEMES.map(t => [t, nodesOf(book.filter(r => r.theme === t))])),
  findings: report,
}, null, 2));

console.log(`\nReport written to axe-report.json.`);
console.log(`Landing: ${nodesOf(landing)} node(s). Book (all themes): ${nodesOf(book)} node(s).`);

// The gate: findings whose rule is in GATE_RULES are regressions in a class we
// have cleared. Reported always; they fail the build only under --strict.
const gated = report.filter(r => GATE_RULES.has(r.id));
if (gated.length > 0) {
  console.log(`\nGATED-RULE findings (${nodesOf(gated)} node(s)) — a regression in a cleared class:`);
  for (const r of gated) {
    const where = r.theme ? `${r.page} [${r.theme}]` : r.page;
    console.log(`  [${r.impact}] ${r.id} — ${r.nodes} node(s) on ${where}`);
    for (const t of r.targets) console.log(`      ${t}`);
  }
}

if (STRICT) {
  if (gated.length > 0) {
    console.error(`\nFAIL (--strict): ${nodesOf(gated)} node(s) in gated rule classes (${[...GATE_RULES].join(", ")}). These are regressions — fix them or, if genuinely upstream and unfixable, narrow GATE_RULES with a recorded reason.`);
    process.exit(1);
  }
  console.log("\nPASS (--strict): no findings in the gated rule classes.");
  process.exit(0);
}
console.log("\nReport mode (exit 0). Pass --strict to fail on the gated rule classes.");
process.exit(0);
