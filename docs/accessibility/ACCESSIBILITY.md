# FerroEHR Viewer — accessibility findings (system-grouped)

Findings from an axe-core + structural audit of the FerroEHR Viewer at
`http://localhost:3000`, product **4.3.1**, `sandbox` profile, 2026-09-22.
Setup and reproduction: [`README.md`](README.md). Fingerprints:
[`fingerprints.md`](fingerprints.md).

**These findings are grouped by *system / remediation unit*, not by rule ID or
selector.** Each group is one fix, applied once, that clears every occurrence
underneath it. This is deliberate: the barriers here are a small number of
shared design decisions repeated across every page, so the useful unit of work
is the pattern, not the 300-plus individual nodes axe counts.

> A failed automated rule is a candidate, not a proven WCAG failure. Contrast
> ratios below are axe-computed measurements; the SVG and skip-link judgements
> add human review of the rendered DOM. Keyboard, screen-reader, and reflow
> behaviour were not measured this pass.

## The headline: light and dark are not equal

The single most important result. Every colour-contrast failure is in **light
mode**; **dark mode has zero.** Dark mode is currently the more accessible
theme — but the fix is to raise light mode to parity, not to prefer dark.

| Rule (axe 4.13.0) | WCAG | Light nodes | Dark nodes |
| --- | --- | --- | --- |
| `color-contrast` | 1.4.3 AA | **83** (all 9 pages) | **0** |
| `svg-img-alt` | 1.1.1 A | 246 | 246 (same) |
| `scrollable-region-focusable` | 2.1.1 A | 4 | 4 |

## Severity summary

| System | Severity | WCAG | Pattern fingerprint |
| --- | --- | --- | --- |
| [SYS-1 Light-theme colour tokens](#sys-1--light-theme-colour-tokens) | Major | 1.4.3 AA | `A11Y-PAT-F16D9A381724`, `A11Y-PAT-40343F731E91` |
| [SYS-2 Decorative-icon component](#sys-2--decorative-icon-component) | Minor | 1.1.1 A | `A11Y-PAT-465B7728CC03` |
| [SYS-3 Scrollable data regions](#sys-3--scrollable-data-regions) | Minor | 2.1.1 A | `A11Y-PAT-C4BD273E6A4E` |
| [SYS-4 Bypass blocks (skip link)](#sys-4--bypass-blocks-skip-link) | Enhancement | 2.4.1 A | `A11Y-PAT-0AFBDA7389A7` |

Severity is task-level impact (Blocker / Major / Moderate / Minor / Needs
review) per the bug-reporting guide, calibrated to realistic user impact.

---

## SYS-1 — Light-theme colour tokens

### Summary
In light mode, two shared colour tokens produce text below the 4.5:1 minimum on
**every page**. Dark mode uses different tokens and passes. This is one
palette-level fix, not 83 element fixes.

### Location and state
- Page or route: all nine scanned routes (`/`, `/templates`, `/queries`,
  `/ehrs`, `/demographics/person`, `/terminology`, `/operations`, `/audit`,
  `/system`)
- Build or commit: FerroEHR 4.3.1, `sandbox` profile
- Component: the Leptos viewer's light-theme colour tokens (accent + notice)
- Preconditions and UI state: logged in, **light** theme active

### Steps or conditions
1. Log in to the viewer (`ferroehr` / `ferroehr`).
2. Ensure light theme (sun/moon toggle, top-right).
3. Run an axe `color-contrast` scan, or inspect the accent text and the sandbox
   notice with a contrast checker.

### Expected result
All text meets WCAG 1.4.3: 4.5:1 for normal text, 3:1 for large text.

### Actual result
Two recurring failures, measured by axe:

| Token | Foreground | Background | Ratio | Needs |
| --- | --- | --- | --- | --- |
| Accent text (`.text-accent`, status spans) | `#0d9488` | `#ffffff` | **3.74:1** | 4.5:1 |
| Sandbox notice (`#deployment-notice`) | `#d97706` | `#fef3c7` | **2.86:1** | 4.5:1 |

The accent token accounts for the majority of nodes; the notice adds 2–3 per
page. On `/audit` the accent token repeats across a table, giving 38 nodes on
that page alone — same token, many rows.

### People affected and impact
- People affected: low-vision users; anyone in bright ambient light or on a
  low-quality display.
- Affected task: reading status values, counts, and the accent-coloured labels
  the dashboards lean on.
- Consequence: values rendered in accent are hard or impossible to read in
  light mode.
- Workaround and its cost: switch to dark mode — real, but it should not be a
  precondition for readable text.
- Evidence basis: Automated result (axe-core 4.13.0), computed through rendered
  CSS.
- Confidence: Confirmed for the scanned scope.

### Evidence
`evidence/per-page.json` → any `theme: "light"` record, rule `color-contrast`.
Representative from `dashboard/light`:
`.text-base > .text-accent` — "contrast of 3.74 (foreground #0d9488, background
#ffffff …) Expected 4.5:1"; `#deployment-notice` — "contrast of 2.86 (foreground
#d97706, background #fef3c7 …)".

### Relevant environment
- Test date: 2026-09-22; Chromium via Playwright; viewport 1280×900; light
  theme.

### Standards and tests
- Standard: WCAG 2.2 · Success Criterion: 1.4.3 Contrast (Minimum) · Level: AA
- Relationship: Confirmed failure
- Tool: axe-core 4.13.0, tags `wcag2aa`; Method: automated computed-contrast

### Scope and source
- Occurrences and sample checked: 83 nodes across 9 pages, both tokens present
  on every page.
- Suspected/confirmed root cause: two light-theme colour tokens (teal accent,
  amber notice) chosen for hue, not measured for contrast on their backgrounds.
  Dark theme proves the design *can* pass — only the light tokens are wrong.

### Suggested fix
- Darken the accent for text use to ≈ `#0f766e` (teal-700 ≈ 4.6:1 on white), or
  reserve `#0d9488` for large text / non-text UI only.
- Darken the notice text (e.g. amber-800 `#92400e` ≈ 4.7:1 on `#fef3c7`) or
  deepen the notice background.
- One token change per issue propagates to all pages. `ui-gates` +
  a re-run of `evidence/scan.mjs` confirms the fix.

### Acceptance criteria
- [ ] Accent text meets 4.5:1 (normal) / 3:1 (large) on its light backgrounds.
- [ ] The sandbox notice text meets 4.5:1 on its background.
- [ ] `evidence/scan.mjs` reports **0** `color-contrast` nodes in light mode
      across all nine routes.
- [ ] Dark mode still reports 0 (no regression).
- [ ] The impact statement does not exceed the evidence (contrast only).

---

## SYS-2 — Decorative-icon component

### Summary
The shared inline-SVG icon component emits icons with no accessible name and no
`aria-hidden`, so axe flags 246 `svg-img-alt` nodes across the app. Live DOM
inspection shows **12 of 14 SVGs per page sit inside a control that already has
an accessible name** (e.g. `button[aria-label="Toggle dark mode"] > svg`), so
the controls are operable — the icons are only redundantly exposed to the
accessibility tree. One component-level fix clears almost all of it.

### Location and state
- Page or route: all nine routes, both themes.
- Component: the viewer's inline icon component (nav icons, toggle, stat-tile
  icons, buttons).
- Preconditions and UI state: any authenticated page.

### Steps or conditions
1. Any logged-in page.
2. Run an axe `svg-img-alt` scan, or inspect an icon inside a nav link / button.

### Expected result
Decorative icons are hidden from assistive technology (`aria-hidden="true"`);
an icon that is the *sole* content of a control conveys the control's name via
the parent's `aria-label`.

### Actual result
- 246 `svg-img-alt` nodes (serious, per axe) across the scan.
- DOM census (per page): 14 SVGs — 12 decorative inside named controls (not
  hidden), 1 already `aria-hidden`, **1 standalone SVG not inside a named
  control**.

### People affected and impact
- People affected: screen-reader users.
- Affected task: navigating and operating the app.
- Consequence: for the 12-per-page decorative icons, redundant or noisy
  announcements — friction, not a barrier (the parent control is named). For the
  1-per-page standalone SVG, a **possible genuinely unnamed graphic** worth a
  targeted check.
- Workaround and its cost: none needed for the named controls; user tolerates
  the noise.
- Evidence basis: Automated result + manual DOM review.
- Confidence: Confirmed (decorative-in-named-control class); the standalone SVG
  is *Needs review*.

### Evidence
`evidence/per-page.json` → rule `svg-img-alt`; live DOM census in
`README.md` reproduction. Representative:
`button[aria-label="Toggle dark mode"] > svg[width="16"]` — "no title, no
aria-label…" (the button is named; the child SVG is not).

### Standards and tests
- Standard: WCAG 2.2 · Success Criterion: 1.1.1 Non-text Content · Level: A
- Relationship: Confirmed (decorative icons need hiding); Needs review (the one
  standalone SVG per page)
- Tool: axe-core 4.13.0 `svg-img-alt`; Method: automated + manual DOM census

### Scope and source
- Occurrences and sample checked: 246 nodes; census on the EHRs page found
  12 decorative-in-named-control, 1 hidden, 1 standalone.
- Suspected/confirmed root cause: the icon component does not stamp
  `aria-hidden="true"` on decorative output. A single component change fixes the
  246-node class.

### Suggested fix
- Add `aria-hidden="true"` (and `focusable="false"`) to the icon component's
  decorative output.
- Audit the one standalone SVG per page: if it is the sole content of a control,
  give the **control** an `aria-label`; if it is truly decorative, it is covered
  by the component fix.
- `leptos-lookup` (icon/view patterns) + `ui-gates` for the change.

### Acceptance criteria
- [ ] Decorative icons carry `aria-hidden="true"`; `svg-img-alt` node count
      drops to near zero.
- [ ] Any icon that is the sole content of a control is named via the control's
      `aria-label`.
- [ ] The standalone SVG per page has been inspected and dispositioned.
- [ ] Impact statement stays within evidence (announcement noise, not access
      loss, for the named-control class).

---

## SYS-3 — Scrollable data regions

### Summary
On `/system`, a horizontally scrollable region (`.overflow-x-auto`) is not
keyboard-focusable, so keyboard-only users cannot scroll it. Present in both
themes.

### Location and state
- Page or route: `/system` (2 nodes); pattern applies anywhere `.overflow-x-auto`
  wraps overflowing content.
- Component: a scroll container in the System view.

### Steps or conditions
1. Log in, go to `/system`.
2. Tab through the page and try to reach/scroll the horizontally scrolling
   region by keyboard.

### Expected result
A scrollable region is reachable and operable by keyboard (WCAG 2.1.1) — either
focusable itself (`tabindex="0"` + accessible name) or containing focusable
content that brings it into view.

### Actual result
The region scrolls with a pointer but is not in the tab order and has no
focusable children to scroll it — keyboard users cannot see the clipped content.

### People affected and impact
- People affected: keyboard-only users; switch-device and some screen-reader
  users.
- Affected task: reading content that overflows horizontally on `/system`.
- Consequence: clipped content is unreachable without a pointer.
- Workaround: none by keyboard.
- Evidence basis: Automated result (axe `scrollable-region-focusable`).
- Confidence: Confirmed for the scanned scope.

### Evidence
`evidence/per-page.json` → `system/light` and `system/dark`, rule
`scrollable-region-focusable`, target `.overflow-x-auto`.

### Standards and tests
- Standard: WCAG 2.2 · Success Criterion: 2.1.1 Keyboard · Level: A
- Relationship: Confirmed failure
- Tool: axe-core 4.13.0 `scrollable-region-focusable`

### Scope and source
- Occurrences: 2 nodes on `/system`, both themes.
- Suspected/confirmed root cause: `.overflow-x-auto` applied without
  `tabindex="0"` + a name, and without focusable interior content.

### Suggested fix
- Add `tabindex="0"` and an accessible name (`role="region"` +
  `aria-label`) to the scroll container; or ensure its content is
  keyboard-reachable.

### Acceptance criteria
- [ ] The `/system` scroll region is reachable and scrollable by keyboard.
- [ ] `scrollable-region-focusable` reports 0 nodes on `/system`.
- [ ] Manually retested with the keyboard, not only re-scanned.

---

## SYS-4 — Bypass blocks (skip link)

### Summary
No "skip to main content" link. On every page, keyboard and screen-reader users
tab through the full sidebar navigation before reaching page content. Structural
gap, not an axe violation.

### Location and state
- Page or route: all routes (global layout).
- Component: the app shell / global header.

### Steps or conditions
1. Log in, load any page.
2. Press Tab from the top of the document.

### Expected result
An early, focusable "Skip to main content" link lets users bypass the repeated
nav and jump to `<main>` (WCAG 2.4.1).

### Actual result
No skip link exists (`skipLink: false` in the DOM census); the first Tab stops
are the nav links, repeated on every page.

### People affected and impact
- People affected: keyboard-only and screen-reader users.
- Affected task: reaching page content efficiently.
- Consequence: repeated tabbing through the sidebar on every navigation —
  friction that compounds across a session.
- Workaround: landmark navigation (a screen-reader user can jump to `<main>`) —
  but keyboard-only users have none.
- Evidence basis: Manual DOM review.
- Confidence: Confirmed (absence verified).

### Evidence
DOM census (README reproduction): `skipLink: false`; landmarks present
(`main`, `nav`, `aside`, `footer`), so a skip target already exists.

### Standards and tests
- Standard: WCAG 2.2 · Success Criterion: 2.4.1 Bypass Blocks · Level: A
- Relationship: Confirmed failure
- Method: Manual review of rendered DOM

### Scope and source
- Occurrences: global (every page).
- Root cause: the app shell has no bypass mechanism; `<main>` exists as a
  target, so this is additive.

### Suggested fix
- Add a visually-hidden-until-focused "Skip to main content" link as the first
  focusable element, targeting the existing `<main>` (give `<main>` an `id` and
  `tabindex="-1"`).

### Acceptance criteria
- [ ] A "Skip to main content" link is the first focusable element and moves
      focus into `<main>`.
- [ ] Verified by keyboard on at least two routes.

---

## What's good (verified, not assumed)

Recorded so the picture is honest — the foundation is sound:

- `lang="en"` on `<html>`.
- Landmarks present: `main`, `nav`, `aside`, `footer`.
- Logical heading hierarchy (H1 → H2, no skips) on sampled pages.
- Native controls (`<button>`, `<a>`, real inputs) — no `div`-with-`role`
  substitutes.
- The theme toggle has an accessible name (`aria-label="Toggle dark mode"`).
- Dark theme is a purpose-built palette (not a filter-invert) and passes
  contrast where light fails.

## Not measured this pass

Route to the keyboard/journey and screen-reader lanes before treating these as
pass: focus-visible indicators (2.4.7 / 2.4.13), keyboard operability and traps
(2.1.1 / 2.1.2) beyond SYS-3, 200% reflow (1.4.10), status-message announcement
(4.1.3), target size (2.5.8). See [`README.md`](README.md) → *Coverage and
limits*.
