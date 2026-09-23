# Accessibility fingerprint registry

Stable identifiers for the FerroEHR Viewer findings in
[`ACCESSIBILITY.md`](ACCESSIBILITY.md), following the
[`a11y/pattern/v1`](https://mgifford.github.io/ACCESSIBILITY.md/examples/fingerprints/README.html)
profile.

## How these were computed (not hand-typed)

Per the profile, a digest is **never** hand-typed. Each is:

```
lowercase-hex( SHA-256( UTF-8( JCS-canonicalize( fingerprint-input ) ) ) )
```

- Hash: SHA-256 (FIPS 180-4)
- Canonicalization: RFC 8785 JSON Canonicalization Scheme (JCS), via the pinned
  `canonicalize` npm package (3.0.0)
- Output: all 64 lowercase hex characters
- Display ID: `A11Y-PAT-<first 12 hex chars, uppercase>` — an alias, **not
  authoritative**; confirm the full digest before treating two display IDs as
  equal.

Generator: [`evidence/fingerprint.mjs`](evidence/fingerprint.mjs). Re-run with
`node evidence/fingerprint.mjs`.

Scope for every pattern below:
`{ scope_type: "repository", scope_id: "https://github.com/rubentalstra/FerroEHR" }`.
`state_key` is `null` for all (none of these findings is state-specific — the
theme axis is captured in the finding text, not the pattern key, so the light
and dark occurrences share one pattern; that is what makes SYS-1's "light only"
result meaningful against a single fingerprint).

## Pattern fingerprints

### SYS-1 — Light-theme colour tokens (WCAG 1.4.3)

**Accent text on white** — `A11Y-PAT-F16D9A381724`
```
f16d9a381724d97f29f240747f6cfb39de86eb1c24c6c51689467a5b189250ed
```
```json
{
  "profile": "a11y/pattern/v1",
  "target": { "scope_type": "repository", "scope_id": "https://github.com/rubentalstra/FerroEHR" },
  "rule": { "namespace": "axe-core", "id": "color-contrast" },
  "locator": { "type": "css", "normalization_profile": "a11y/css-locator/v1", "value": ".text-accent" },
  "state_key": null
}
```

**Sandbox notice (amber on cream)** — `A11Y-PAT-40343F731E91`
```
40343f731e91511ab4ea8bb09527f13cb2946b43fd7d6ec4acf7210b47a74601
```
```json
{
  "profile": "a11y/pattern/v1",
  "target": { "scope_type": "repository", "scope_id": "https://github.com/rubentalstra/FerroEHR" },
  "rule": { "namespace": "axe-core", "id": "color-contrast" },
  "locator": { "type": "css", "normalization_profile": "a11y/css-locator/v1", "value": "#deployment-notice" },
  "state_key": null
}
```

### SYS-2 — Decorative-icon component (WCAG 1.1.1)

`A11Y-PAT-465B7728CC03`
```
465b7728cc03c3bf41e56a55667626eea58658ea3c2f1ae645f3fa746d1d069a
```
```json
{
  "profile": "a11y/pattern/v1",
  "target": { "scope_type": "repository", "scope_id": "https://github.com/rubentalstra/FerroEHR" },
  "rule": { "namespace": "axe-core", "id": "svg-img-alt" },
  "locator": { "type": "css", "normalization_profile": "a11y/css-locator/v1", "value": "svg" },
  "state_key": null
}
```

### SYS-3 — Scrollable data regions (WCAG 2.1.1)

`A11Y-PAT-C4BD273E6A4E`
```
c4bd273e6a4ec11d0756382e136c148ba077e627dc9e7ac315627fea44e43398
```
```json
{
  "profile": "a11y/pattern/v1",
  "target": { "scope_type": "repository", "scope_id": "https://github.com/rubentalstra/FerroEHR" },
  "rule": { "namespace": "axe-core", "id": "scrollable-region-focusable" },
  "locator": { "type": "css", "normalization_profile": "a11y/css-locator/v1", "value": ".overflow-x-auto" },
  "state_key": null
}
```

### SYS-4 — Bypass blocks / skip link (WCAG 2.4.1)

`A11Y-PAT-0AFBDA7389A7` — `namespace: "manual"` (no axe rule; structural,
human-verified).
```
0afbda7389a75b16155770d6c1cf42aeced5825b2fdf93da77f6f4503c12a7b0
```
```json
{
  "profile": "a11y/pattern/v1",
  "target": { "scope_type": "repository", "scope_id": "https://github.com/rubentalstra/FerroEHR" },
  "rule": { "namespace": "manual", "id": "bypass-blocks" },
  "locator": { "type": "css", "normalization_profile": "a11y/css-locator/v1", "value": "body > *:first-child" },
  "state_key": null
}
```

## Registry table

| System | Display ID | Rule (ns/id) | WCAG | Digest (first 12) |
| --- | --- | --- | --- | --- |
| SYS-1 accent | `A11Y-PAT-F16D9A381724` | axe-core/color-contrast | 1.4.3 | `f16d9a381724` |
| SYS-1 notice | `A11Y-PAT-40343F731E91` | axe-core/color-contrast | 1.4.3 | `40343f731e91` |
| SYS-2 icons | `A11Y-PAT-465B7728CC03` | axe-core/svg-img-alt | 1.1.1 | `465b7728cc03` |
| SYS-3 scroll | `A11Y-PAT-C4BD273E6A4E` | axe-core/scrollable-region-focusable | 2.1.1 | `c4bd273e6a4e` |
| SYS-4 skip | `A11Y-PAT-0AFBDA7389A7` | manual/bypass-blocks | 2.4.1 | `0afbda7389a7` |

## Regenerating / verifying

```sh
cd <scratch-dir-with-canonicalize@3.0.0>
node evidence/fingerprint.mjs   # re-emits every digest above
```

A digest that differs on re-run means an input field changed (rule id, locator,
scope, or `state_key`) — the fingerprint is doing its job: a changed input is a
different finding.
