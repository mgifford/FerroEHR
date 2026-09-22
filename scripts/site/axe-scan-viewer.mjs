// SPDX-FileCopyrightText: Vernum Projecten B.V.
// SPDX-License-Identifier: BUSL-1.1
//
// Accessibility report for the running FerroEHR Viewer (the Leptos SSR app).
//
// Logs in with the dev credentials, then runs axe-core (WCAG 2.2 A/AA) against
// the viewer's routes in BOTH light and dark themes, driving the theme through
// the viewer's own toggle and verifying the rendered state before each scan.
// Prints a grouped report and writes axe-viewer-report.json.
//
// Non-blocking by design (always exits 0), matching the static-site report:
// this establishes the baseline and makes regressions visible before it is
// tightened to blocking. The whole point is that the viewer's own audited
// issues (contrast, decorative icons) get a standing check so a fix cannot
// silently regress.
//
// Detector, not a conformance verdict: axe covers ~30-40% of WCAG. A clean run
// means axe found nothing in its rule set, not that the viewer is conformant;
// keyboard/screen-reader lanes are separate.
//
// Usage: node scripts/site/axe-scan-viewer.mjs [base-url] [user] [pass]
//   base-url  viewer origin (default http://127.0.0.1:3000)
//   user/pass viewer login (default ferroehr / ferroehr — the sandbox creds)
//
// Peer deps (installed in CI, never added to this repo's manifest):
//   playwright, @axe-core/playwright

import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const USER = process.argv[3] ?? "ferroehr";
const PASS = process.argv[4] ?? "ferroehr";

// The authenticated routes the audit covered.
const ROUTES = [
  ["dashboard", "/"],
  ["templates", "/templates"],
  ["queries", "/queries"],
  ["ehrs", "/ehrs"],
  ["demographics", "/demographics/person"],
  ["terminology", "/terminology"],
  ["operations", "/operations"],
  ["audit", "/audit"],
  ["system", "/system"],
];

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const impactRank = { critical: 0, serious: 1, moderate: 2, minor: 3 };

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-username", USER);
  await page.fill("#login-password", PASS);
  await Promise.all([
    page.waitForURL(u => !u.pathname.endsWith("/login"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function isDark(page) {
  return page.evaluate(() => {
    const el = document.documentElement;
    return (el.className || "").includes("dark") || el.getAttribute("data-theme") === "dark";
  });
}

async function setTheme(page, wantDark) {
  for (let i = 0; i < 3; i++) {
    if ((await isDark(page)) === wantDark) return true;
    const btn = page.getByRole("button", { name: /toggle dark mode/i });
    if ((await btn.count()) === 0) return false;
    await btn.first().click();
    await page.waitForTimeout(200);
  }
  return (await isDark(page)) === wantDark;
}

const server = { base: BASE };
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

await login(page);
console.log(`logged in at ${page.url()}`);

const findings = [];
for (const [name, path] of ROUTES) {
  const resp = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" }).catch(() => null);
  if (!resp || !resp.ok()) { console.error(`SKIP (not served): ${path}`); continue; }
  await page.waitForTimeout(300);
  for (const wantDark of [false, true]) {
    const theme = wantDark ? "dark" : "light";
    await setTheme(page, wantDark);
    await page.waitForTimeout(150);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    for (const r of results.violations) {
      findings.push({
        route: name, theme, id: r.id, impact: r.impact,
        wcag: (r.tags || []).filter(t => /^wcag\d/.test(t)),
        help: r.help, nodes: r.nodes.length,
        targets: r.nodes.slice(0, 3).map(n => n.target?.join(" ")),
      });
    }
    const nodes = results.violations.reduce((n, r) => n + r.nodes.length, 0);
    console.log(`  ${name}/${theme}: ${results.violations.length} rule(s), ${nodes} node(s)`);
  }
}

await browser.close();

findings.sort((a, b) => (impactRank[a.impact] ?? 4) - (impactRank[b.impact] ?? 4));
const nodesOf = fs => fs.reduce((n, f) => n + f.nodes, 0);
const light = findings.filter(f => f.theme === "light");
const dark = findings.filter(f => f.theme === "dark");

console.log(`\n=== Viewer axe report ===`);
console.log(`Light: ${nodesOf(light)} node(s). Dark: ${nodesOf(dark)} node(s).`);
for (const f of findings) {
  console.log(`  [${f.impact}] ${f.id} (${f.wcag.join(",")}) — ${f.nodes} node(s) on ${f.route}/${f.theme}`);
  for (const t of f.targets) console.log(`      ${t}`);
}

writeFileSync("axe-viewer-report.json", JSON.stringify({
  scanned_at: new Date().toISOString(),
  base: server.base,
  routes: ROUTES.map(r => r[1]),
  light_nodes: nodesOf(light),
  dark_nodes: nodesOf(dark),
  findings,
}, null, 2));

console.log(`\nReport written to axe-viewer-report.json.`);
console.log("Non-blocking report (exit 0). Tighten to blocking once the audited fixes are confirmed clean.");
process.exit(0);
