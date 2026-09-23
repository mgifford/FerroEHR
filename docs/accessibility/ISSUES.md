# Accessibility issues — ready to file

Issue-ready drafts for the findings in [`ACCESSIBILITY.md`](ACCESSIBILITY.md),
in the FerroEHR tracker shape (plain summary opening, then
`## Acceptance criteria`; one **type** label, one **priority** label, the
`viewer` domain label). Ranked most-impactful first.

> **Not yet filed.** The git remote is `rubentalstra/FerroEHR` (upstream, public,
> not owned here). Filing is an outward action — see the maintainer's own
> `CONTRIBUTING.md` and issue workflow before posting. If filing, create each
> with `gh issue create`, apply the labels, then set the noted relationships
> with `scripts/gh/rel.sh`. Each draft carries its `a11y/pattern/v1` fingerprint
> from [`fingerprints.md`](fingerprints.md) in the Tracking section.

Ranking rationale: SYS-1 fails a Level AA criterion on every page and affects a
core task (reading data) — highest. SYS-2/SYS-3 are Level A but bounded (noise,
one region). SYS-4 is additive. A "parent" tracking issue is offered last for
whoever coordinates the set.

---

## 1. Viewer: light-theme accent and notice colours fail WCAG 1.4.3 on every page

**Labels:** `bug` · `P1` · `viewer` · `accessibility`
**Milestone:** (next viewer release)

In light mode, two shared colour tokens render text below the 4.5:1 minimum on
all nine viewer routes; dark mode uses different tokens and passes cleanly (0
contrast nodes). Measured with axe-core 4.13.0 against FerroEHR 4.3.1 (sandbox
profile): the teal accent `#0d9488` on white is **3.74:1** (`.text-accent`,
status spans — the majority of hits, e.g. 38 nodes on `/audit` where it repeats
down a table), and the sandbox notice `#d97706` on `#fef3c7` is **2.86:1**
(`#deployment-notice`). This is a palette-token fix, not per-element work: dark
mode proves the design can pass, so only the light tokens need correcting. Full
evidence and per-page breakdown: `docs/accessibility/ACCESSIBILITY.md` (SYS-1)
and `docs/accessibility/evidence/`.

Low-vision users, and anyone on a bright screen or poor display, cannot reliably
read accent-coloured values and labels in light mode. Workaround (switch to dark
mode) exists but must not be a precondition for readable text.

Standard: WCAG 2.2, 1.4.3 Contrast (Minimum), Level AA — confirmed failure.
Suggested approach: darken the accent for text use to ≈ `#0f766e` (teal-700,
≈ 4.6:1 on white) or reserve `#0d9488` for large text / non-text UI; darken the
notice text (e.g. amber-800 `#92400e`, ≈ 4.7:1 on `#fef3c7`) or deepen its
background.

### Acceptance criteria
- [ ] Accent text meets 4.5:1 (normal) / 3:1 (large) on its light-mode
      backgrounds across all nine routes.
- [ ] The sandbox notice text meets 4.5:1 on its background.
- [ ] `docs/accessibility/evidence/scan.mjs` reports **0** `color-contrast`
      nodes in light mode across all nine routes.
- [ ] Dark mode still reports 0 `color-contrast` nodes (no regression).
- [ ] `/ui-gates` passes; the change is a token/CSS adjustment, not per-element.

### Tracking
Pattern fingerprints: `A11Y-PAT-F16D9A381724` (accent),
`A11Y-PAT-40343F731E91` (notice).

---

## 2. Viewer: decorative icons are exposed to assistive technology (missing aria-hidden)

**Labels:** `bug` · `P2` · `viewer` · `accessibility`
**Milestone:** (next viewer release)

The shared inline-SVG icon component emits icons with no accessible name and no
`aria-hidden`, so axe flags 246 `svg-img-alt` nodes across the app. Most are
benign: a DOM census found 12 of 14 SVGs per page sit inside a control that
already has an accessible name (e.g. `button[aria-label="Toggle dark mode"] >
svg`), so the control is operable and the icon is only redundantly announced —
friction, not a barrier. One component-level change (`aria-hidden="true"` +
`focusable="false"` on decorative output) clears the whole class. Separately,
**one standalone SVG per page is not inside a named control** and needs a
targeted check: if it is the sole content of a control, the control needs an
`aria-label`. Detail: `docs/accessibility/ACCESSIBILITY.md` (SYS-2).

Screen-reader users hear redundant/confusing icon announcements throughout;
the standalone SVG may be a genuinely unnamed graphic.

Standard: WCAG 2.2, 1.1.1 Non-text Content, Level A — confirmed (decorative
class); needs review (the standalone SVG).

### Acceptance criteria
- [ ] Decorative icons carry `aria-hidden="true"`; `svg-img-alt` node count
      drops to near zero across the scanned routes.
- [ ] Any icon that is the sole content of a control conveys the name via the
      control's `aria-label`.
- [ ] The standalone SVG present on each page has been inspected and
      dispositioned (decorative → hidden, or meaningful → named).
- [ ] `/ui-gates` passes.

### Tracking
Pattern fingerprint: `A11Y-PAT-465B7728CC03`.

---

## 3. Viewer: /system horizontal scroll region is not keyboard-accessible

**Labels:** `bug` · `P2` · `viewer` · `accessibility`
**Milestone:** (next viewer release)

On `/system`, a horizontally scrollable region (`.overflow-x-auto`) is not in
the tab order and has no focusable children, so keyboard-only users cannot
scroll it to reach clipped content (2 nodes, both themes; axe
`scrollable-region-focusable`). Detail: `docs/accessibility/ACCESSIBILITY.md`
(SYS-3).

Keyboard-only, switch-device, and some screen-reader users cannot see content
that overflows horizontally on `/system`; there is no keyboard workaround.

Standard: WCAG 2.2, 2.1.1 Keyboard, Level A — confirmed failure.
Suggested approach: add `tabindex="0"` + `role="region"` + an `aria-label` to
the scroll container, or ensure its interior content is keyboard-reachable.

### Acceptance criteria
- [ ] The `/system` scroll region is reachable and scrollable by keyboard.
- [ ] `scrollable-region-focusable` reports 0 nodes on `/system`.
- [ ] Manually retested with the keyboard (not only re-scanned).
- [ ] `/ui-gates` passes.

### Tracking
Pattern fingerprint: `A11Y-PAT-C4BD273E6A4E`.

---

## 4. Viewer: add a "Skip to main content" link (WCAG 2.4.1)

**Labels:** `enhancement` · `P3` · `viewer` · `accessibility`
**Milestone:** (backlog)

The viewer has no skip link, so keyboard and screen-reader users tab through the
full sidebar navigation before reaching content on every page
(`skipLink: false` in the DOM census). The layout already has a `<main>`
landmark to target, so this is additive. Detail:
`docs/accessibility/ACCESSIBILITY.md` (SYS-4).

Keyboard-only users have no way to bypass the repeated nav (screen-reader users
can use landmark navigation; keyboard-only users cannot).

Standard: WCAG 2.2, 2.4.1 Bypass Blocks, Level A — confirmed failure.
Suggested approach: add a visually-hidden-until-focused "Skip to main content"
link as the first focusable element, targeting `<main>` (give `<main>` an `id`
and `tabindex="-1"`).

### Acceptance criteria
- [ ] A "Skip to main content" link is the first focusable element and moves
      focus into `<main>`.
- [ ] Verified by keyboard on at least two routes.
- [ ] `/ui-gates` passes.

### Tracking
Pattern fingerprint: `A11Y-PAT-0AFBDA7389A7`.

---

## 5. Viewer: measure the accessibility lanes this audit did not cover

**Labels:** `enhancement` · `P2` · `viewer` · `accessibility`
**Milestone:** (backlog)

The 2026-09-22 audit measured contrast, SVG semantics, page structure, and one
scroll region (axe-core + DOM inspection). It did **not** measure the
interaction and reflow lanes, which axe cannot decide. This issue tracks running
them so those criteria have real evidence rather than being silently assumed to
pass — the standing "a gap not written down reads as a pass" discipline.
Detail: `docs/accessibility/README.md` (Coverage and limits).

Not-yet-measured criteria: focus-visible indicators (2.4.7 / 2.4.13), keyboard
operability and traps beyond `/system` (2.1.1 / 2.1.2), 200% reflow (1.4.10),
status-message announcement (4.1.3), target size (2.5.8).

Suggested approach: a keyboard/journey pass (real key-press automation) plus a
screen-reader pass over the same nine routes; record evidence beside the
existing `docs/accessibility/evidence/`.

### Acceptance criteria
- [ ] Focus-visible behaviour measured across the nine routes, both themes.
- [ ] Keyboard operability + no-trap verified for the interactive views
      (EHRs create/find, Queries, Templates).
- [ ] 200% reflow checked at 320px-equivalent width.
- [ ] Status-message announcement checked on an async action (e.g. Create EHR).
- [ ] Findings recorded under `docs/accessibility/` with fingerprints.

---

## Optional coordinating parent

If a single tracking issue is wanted (the maintainer's workflow uses native
sub-issue edges, **not** a per-release epic — so use this only to group the
accessibility program, never to shadow a milestone):

**Title:** Viewer accessibility: bring the FerroEHR Viewer to WCAG 2.2 AA
**Labels:** `enhancement` · `P2` · `viewer` · `accessibility`

Body: a plain summary pointing at `docs/accessibility/ACCESSIBILITY.md`, with
issues 1–5 attached as sub-issues via
`scripts/gh/rel.sh parent <child> <parent>`. Its acceptance criteria are the
program outcome ("the viewer has no known WCAG 2.2 AA failures in the audited
scope; remaining lanes measured"), **not** a checkbox roll-call of the children
(the sub-issue progress bar already tracks that).

---

## If you file these

```sh
# From the FerroEHR checkout, per issue:
gh issue create --repo rubentalstra/FerroEHR \
  --title "Viewer: light-theme accent and notice colours fail WCAG 1.4.3 on every page" \
  --label bug --label P1 --label viewer --label accessibility \
  --body-file <(sed -n '/^In light mode/,/A11Y-PAT-40343F731E91/p' docs/accessibility/ISSUES.md)
# then set relationships if using a parent:
# scripts/gh/rel.sh parent <child#> <parent#>
```

Confirm each label exists first (`gh label list --repo rubentalstra/FerroEHR`);
a missing label fails silently at apply time. The `accessibility` label in
particular may need creating (`gh label create`).
