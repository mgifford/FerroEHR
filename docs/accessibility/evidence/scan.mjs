// Authenticated dual-theme axe-core scan of the FerroEHR Viewer.
// Detector-only: axe findings are candidate WCAG issues, never a conformance verdict.
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const USER = "ferroehr";
const PASS = "ferroehr";
const OUT = new URL("./out/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

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

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-username", USER);
  await page.fill("#login-password", PASS);
  await Promise.all([
    page.waitForURL(u => !u.pathname.endsWith("/login"), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

// Read the app's current theme by inspecting the documentElement (Tailwind `dark` class or data attr).
async function currentTheme(page) {
  return page.evaluate(() => {
    const el = document.documentElement;
    const cls = el.className || "";
    const attr = el.getAttribute("data-theme") || "";
    const dark = cls.includes("dark") || attr === "dark";
    return { dark, className: cls, dataTheme: attr };
  });
}

// Force a given theme via the in-app toggle button, verifying the rendered result.
async function setTheme(page, wantDark) {
  for (let i = 0; i < 3; i++) {
    const { dark } = await currentTheme(page);
    if (dark === wantDark) return true;
    const btn = page.getByRole("button", { name: /toggle dark mode/i });
    if (await btn.count() === 0) return false;
    await btn.first().click();
    await page.waitForTimeout(200);
  }
  const { dark } = await currentTheme(page);
  return dark === wantDark;
}

const impactRank = { critical: 0, serious: 1, moderate: 2, minor: 3, null: 4 };

async function scan(page, name, theme) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations = results.violations
    .map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      wcag: (v.tags || []).filter(t => /^wcag\d/.test(t)),
      nodes: v.nodes.length,
      samples: v.nodes.slice(0, 3).map(n => ({
        target: n.target?.join(" "),
        failureSummary: (n.failureSummary || "").replace(/\s+/g, " ").slice(0, 300),
      })),
    }))
    .sort((a, b) => (impactRank[a.impact] ?? 5) - (impactRank[b.impact] ?? 5));
  return { name, theme, url: page.url(), violations, axe_version: results.testEngine?.version };
}

const perPage = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

await login(page);
console.log("logged in:", page.url());

for (const [name, path] of ROUTES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  for (const wantDark of [false, true]) {
    const theme = wantDark ? "dark" : "light";
    const ok = await setTheme(page, wantDark);
    if (!ok) { console.log(`  ! could not set ${theme} on ${name}`); }
    await page.waitForTimeout(200);
    const r = await scan(page, name, theme);
    r.themeSet = ok;
    perPage.push(r);
    const contrast = r.violations.find(v => v.id === "color-contrast");
    console.log(`  ${name}/${theme}: ${r.violations.length} rules, contrast nodes=${contrast ? contrast.nodes : 0}`);
  }
}

await browser.close();

// Aggregate.
const byRule = {};
const byRuleTheme = { light: {}, dark: {} };
for (const p of perPage) {
  for (const v of p.violations) {
    byRule[v.id] = byRule[v.id] || { id: v.id, impact: v.impact, wcag: v.wcag, help: v.help, totalNodes: 0, pages: 0 };
    byRule[v.id].totalNodes += v.nodes;
    byRule[v.id].pages += 1;
    byRuleTheme[p.theme][v.id] = (byRuleTheme[p.theme][v.id] || 0) + v.nodes;
  }
}
const summary = {
  base: BASE,
  scanned_at: new Date().toISOString(),
  axe_version: perPage[0]?.axe_version,
  pages_scanned: ROUTES.length,
  themes: ["light", "dark"],
  rules: Object.values(byRule).sort((a, b) => (impactRank[a.impact] ?? 5) - (impactRank[b.impact] ?? 5)),
  nodes_by_rule_theme: byRuleTheme,
};

writeFileSync(`${OUT}per-page.json`, JSON.stringify(perPage, null, 2));
writeFileSync(`${OUT}summary.json`, JSON.stringify(summary, null, 2));
console.log("\nwrote", `${OUT}summary.json`);
