# Upstream accessibility defects (and our local workarounds)

The docs site is built from **mdBook** and its default theme. Several
accessibility fixes in this repo are **workarounds** — CSS overrides in
`website/book/theme/custom.css` and a runtime overlay in
`website/book/theme/a11y-fixes.js` — that compensate for defects in
mdBook-generated markup we do not author.

**Workarounds are short-term. The real fix is upstream.** An overlay that
patches the DOM at runtime is an accessibility anti-pattern when it becomes the
permanent answer: it hides the defect from the generator, has to be maintained
against every mdBook upgrade, and only helps our site rather than every mdBook
site. This file is the standing register so the debt stays visible: each entry
names the upstream defect, where it belongs, the upstream issue, what we do
locally in the meantime, and **the condition under which the workaround is
removed**.

Rule: **no new overlay/override without an entry here.** When you add a local
workaround for upstream markup, add its row, file or link the upstream issue,
and state the removal condition. When upstream ships the fix and we bump the
pin (`.github/actions/docs-toolchain`, currently mdBook 0.5.4), remove the
workaround and close the row.

## Register

### U1 — Sidebar toggle `<label>` carries `aria-expanded` (WCAG 4.1.2)

- **Upstream:** mdBook default theme — the sidebar toggle is a
  `<label id="mdbook-sidebar-toggle">` and its inline theme script sets
  `aria-expanded` on it. A `<label>`'s implicit role does not permit
  `aria-expanded` (`aria-allowed-attr` / `aria-prohibited-attr`).
- **Belongs in:** rust-lang/mdBook (the theme template + `book.js`).
- **Upstream issue:** [rust-lang/mdBook#2345](https://github.com/rust-lang/mdbook/issues/2345)
  (open; our comment draft is in `upstream-mdbook-aria-report.md`).
- **Local workaround:** `a11y-fixes.js` removes the attribute and keeps it off
  via a `MutationObserver`.
- **Removal condition:** mdBook stops emitting `aria-expanded` on the label (or
  makes the toggle a `<button>`). On the next pin bump past that fix, delete
  the toggle branch of `a11y-fixes.js`.
- **Class:** overlay (runtime DOM mutation).

### U2 — Overflowing code blocks are not keyboard-scrollable (WCAG 2.1.1)

- **Upstream:** mdBook renders code as `<pre><code>` with no `tabindex`, so a
  `<pre>` whose content overflows horizontally is a scrollable region a
  keyboard-only user cannot reach or scroll (`scrollable-region-focusable`).
- **Belongs in:** rust-lang/mdBook (emit `tabindex="0"` + a name on
  overflowing code blocks, as its own renderer or theme).
- **Upstream issue:** *(to file — see the tracking issue this register links.)*
- **Local workaround:** `a11y-fixes.js` adds `tabindex="0"` + `role="region"` +
  an `aria-label` to overflowing `<pre>` elements, undone on reflow.
- **Removal condition:** mdBook makes overflowing code blocks focusable. On the
  next pin bump past that fix, delete the code-block branch of `a11y-fixes.js`.
- **Class:** overlay (runtime DOM mutation).

### U3 — Default theme colours miss WCAG 1.4.3 / 2.5.8 (CSS overrides)

These are compensated by CSS overrides in `custom.css`, not the JS overlay — a
lighter-touch class, but still working around upstream theme defaults:

- **`.menu-title`** default `#43484d` is 1.98:1 on the ayu top bar (1.4.3).
- **`.hljs-string` / `.hljs-comment`** highlight-theme colours miss 4.5:1 on
  the light / dark code backgrounds (1.4.3).
- **Top-bar icon links + sidebar chapter links** render under the 24px target
  minimum (2.5.8).
- **Sidebar active link** `#b7410e` fails on the dark sidebars of the coal /
  navy / ayu / **rust** themes (1.4.3) — the rust case (light content, dark
  chrome) is the one earlier dark-only fixes missed.
- **Belongs in:** rust-lang/mdBook default + highlight themes.
- **Upstream issue:** *(candidate to file upstream; lower priority than U1/U2
  since a theme override is the sanctioned mdBook customisation path, not an
  overlay.)*
- **Local workaround:** scoped overrides in `custom.css`.
- **Removal condition:** mdBook's default themes meet WCAG 2.2 AA, or we adopt
  a conformant theme. Until then these overrides are legitimate theming, not a
  hack — but they are recorded here so the upstream gap is not forgotten.
- **Class:** CSS override (theme customisation — the mildest class).

## How this connects to the gate

The axe report (`scripts/site/axe-scan.mjs`) scans every mdBook theme
(`light`, `rust`, `coal`, `ayu`) so a theme-specific defect cannot hide. Its
`--strict` gate fails only on rule classes we have cleared on pages we control
(`color-contrast`, `link-in-text-block`); upstream-chrome classes
(`aria-allowed-attr`, `target-size`, `scrollable-region-focusable`) stay
report-only, because failing a build on a defect we cannot fix in our source is
the wrong pressure. Those report-only classes are exactly the ones this
register tracks for upstream.
