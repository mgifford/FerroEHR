# Upstream: mdBook sidebar toggle `aria-expanded` (WCAG 4.1.2)

**An open issue already covers this: [rust-lang/mdBook#2345](https://github.com/rust-lang/mdbook/issues/2345)**
— "`[aria-*]` attributes do not match their roles" (same `<label id="sidebar-toggle" … aria-expanded>`
markup, same `aria-allowed-attr` rule, still open, 0 comments, no version recorded).

**Do not file a new issue.** Add the comment below to #2345 instead — it adds
what that issue is missing (a current-version repro, the exact role mechanism,
and a concrete fix). It is an outward post to a third-party repo, so post it
under your own account when you choose.

The in-repo workaround is `website/book/theme/a11y-fixes.js` (PR #14).

---

## Comment to add to rust-lang/mdBook#2345

Still reproduces on **mdBook 0.5.4**.

The mechanism: the toggle is a `<label>`, and its implicit role permits no
`aria-*` state attributes. `aria-expanded` is only valid on a specific set of
roles (`button`, `link`, `combobox`, `application`, and the composite/menu
roles) — a `<label>` is none of them — so the theme's script setting
`aria-expanded` on `#mdbook-sidebar-toggle` is invalid wherever it lands.
Some checkers report it as `aria-allowed-attr`, others additionally as
`aria-prohibited-attr`; both point at the same cause. Impact is *critical* in
axe-core.

Suggested fix: make the toggle a `<button type="button">` (which allows
`aria-expanded`) that drives the sidebar, rather than a `<label>` + hidden
checkbox. If the no-JS checkbox mechanism is worth keeping, keep the `<label>`
for that but do not put `aria-expanded` on it — the expanded state belongs on
an element whose role supports it, or can be dropped in favour of
`aria-controls` plus the checkbox state.

Evidence: found on a published mdBook site with Accessibility Insights for Web
2.49.0 (axe-core 4.11.3, Edge 153) and independently by an axe-core 4.13.0
Playwright scan, consistently at *critical*, on every page.

---

## Notes for us (not part of the upstream comment)

- Workaround: `website/book/theme/a11y-fixes.js` removes the attribute
  client-side with a `MutationObserver` (PR #14). Remove it once a fixed mdBook
  ships and we bump the pin in `.github/actions/docs-toolchain` (currently
  0.5.4).
- Our axe gate (`scripts/site/axe-scan.mjs`) already flagged this as an
  `upstream(mdbook)` finding — it was visible in the report but triaged as
  not-authored until the external scan prompted the workaround. "Upstream" is
  not the same as "unfixable from our side."
- Related upstream issue noted in #2345: rust-lang/mdBook#1915.
