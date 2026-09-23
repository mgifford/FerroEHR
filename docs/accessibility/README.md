# FerroEHR Viewer — accessibility audit record

This directory holds an accessibility evaluation of the **FerroEHR Viewer**
(`app/ferroehr-viewer`, the Leptos SSR viewer served as its own OCI image), the
environment it was run against, and the reproducible evidence behind every
finding.

> **Scope and status.** This is an external, first-pass evaluation of the
> *rendered* viewer, not a review of the Leptos `.rs` source. Findings are
> located by rendered DOM target and CSS token, not by `file:line`. Automated
> scanning (axe-core) is a **detector, not a conformance verdict** — it covers
> roughly 30–40% of WCAG 2.2 and its output is candidate findings for human
> review. Keyboard operability, screen-reader announcement, and 200% reflow
> were **not** measured in this pass (see *Coverage and limits*).

## Documents

| File | What it is |
| --- | --- |
| [`ACCESSIBILITY.md`](ACCESSIBILITY.md) | The findings, **grouped by system / remediation unit** — the main deliverable |
| [`fingerprints.md`](fingerprints.md) | The authoritative `a11y/pattern/v1` fingerprint registry for each system |
| [`evidence/summary.json`](evidence/summary.json) | Aggregated axe results: rules × pages × themes |
| [`evidence/per-page.json`](evidence/per-page.json) | Per-page, per-theme axe output with sample selectors + measured contrast |
| [`evidence/scan.mjs`](evidence/scan.mjs) | The scanner that produced the evidence (authenticated, dual-theme) |
| [`evidence/fingerprint.mjs`](evidence/fingerprint.mjs) | The RFC 8785 (JCS) + SHA-256 fingerprint generator |

## Environment under test

| Item | Value |
| --- | --- |
| Product | FerroEHR **4.3.1** (`{"status":"UP","server_version":"4.3.1"}`) |
| openEHR REST API | 1.1.0 |
| Deployment profile | `sandbox` (single shared credential, RBAC not enforced — dev defaults) |
| Viewer URL | `http://localhost:3000` |
| API / Swagger URL | `http://localhost:8080/ferroehr/rest/swagger-ui` |
| Credentials used | `ferroehr` / `ferroehr` (sandbox demo login) |
| Stack | `docker compose --profile viewer up` — server + PostgreSQL 18 + viewer, all containers healthy |
| Images | `ghcr.io/rubentalstra/ferroehr{,-postgres,-viewer}:4.3.1` |
| Audit date | 2026-09-22 |

## How the stack was brought up

```sh
# From the FerroEHR checkout (Docker + Compose 2.23.1+ required; no Rust needed):
docker compose --profile viewer up
# Server ready when this returns {"status":"UP",...}:
curl http://localhost:8080/ferroehr/rest/status
# Viewer login: http://localhost:3000/login  (ferroehr / ferroehr)
```

## How the audit was reproduced

The scan authenticates once, then for each route × each theme (`light`, `dark`)
runs axe-core against the rendered page. Theme is driven through the viewer's
own **"Toggle dark mode"** control and the rendered state is verified before
each scan (so the evidence reflects what a user actually gets, not just an
emulated media query).

```sh
# Peer deps are throwaway audit tooling — install them OUTSIDE this repo
# (the repo's dependency set is pinned and enforced; do not add these to it):
cd <a-scratch-dir>
npm install @axe-core/playwright playwright canonicalize@3.0.0
npx playwright install chromium

# Run against a live viewer at http://localhost:3000:
node evidence/scan.mjs           # writes out/summary.json + out/per-page.json
node evidence/fingerprint.mjs    # prints the pattern fingerprints in fingerprints.md
```

Routes scanned (all authenticated): `/`, `/templates`, `/queries`, `/ehrs`,
`/demographics/person`, `/terminology`, `/operations`, `/audit`, `/system`.

## Tooling

| Tool | Version | Role |
| --- | --- | --- |
| axe-core (`@axe-core/playwright`) | 4.13.0 | Contrast + semantics detector |
| Playwright | current | Authenticated browser driver, theme toggling |
| `canonicalize` | 3.0.0 (pinned) | RFC 8785 JCS for fingerprints |
| Tags scanned | `wcag2a wcag2aa wcag21a wcag21aa wcag22aa best-practice` | |

## Coverage and limits

- **Measured:** colour contrast (1.4.3), non-text-content semantics for SVGs
  (1.1.1), scrollable-region keyboard access (2.1.1), page structure
  (landmarks, headings, `lang`).
- **Not measured this pass** (route to `a11y-test` keyboard/journey lane or a
  screen-reader pass): focus-visible indicators (2.4.7 / 2.4.13), keyboard
  operability and traps (2.1.1 / 2.1.2) beyond the one scroll region, 200%
  reflow (1.4.10), status-message announcement (4.1.3), target size (2.5.8).
- **Licence note:** FerroEHR is Business Source License 1.1 — this evaluation
  is for understanding the product's accessibility posture; upstreaming fixes
  is a contribution decision, not a merge you own.

See [`ACCESSIBILITY.md`](ACCESSIBILITY.md) for the grouped findings.
