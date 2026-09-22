// Generate authoritative a11y/pattern/v1 fingerprints per RFC 8785 (JCS) + SHA-256.
import canonicalize from "canonicalize";
import { createHash } from "node:crypto";

const SCOPE_ID = "https://github.com/rubentalstra/FerroEHR";

function patternFingerprint({ ruleNs, ruleId, locator, stateKey = null }) {
  const input = {
    profile: "a11y/pattern/v1",
    target: { scope_type: "repository", scope_id: SCOPE_ID },
    rule: { namespace: ruleNs, id: ruleId },
    locator: { type: "css", normalization_profile: "a11y/css-locator/v1", value: locator },
    state_key: stateKey,
  };
  const jcs = canonicalize(input);
  const digest = createHash("sha256").update(Buffer.from(jcs, "utf-8")).digest("hex");
  return { digest, display: "A11Y-PAT-" + digest.slice(0, 12).toUpperCase(), input };
}

// One representative pattern per (rule, locator) inside each system group.
const patterns = {
  // SYS-1: Light-theme colour tokens (WCAG 1.4.3)
  "accent-text-on-white": patternFingerprint({ ruleNs: "axe-core", ruleId: "color-contrast", locator: ".text-accent" }),
  "sandbox-notice-amber": patternFingerprint({ ruleNs: "axe-core", ruleId: "color-contrast", locator: "#deployment-notice" }),
  // SYS-2: Decorative icon component (WCAG 1.1.1)
  "decorative-svg-icons": patternFingerprint({ ruleNs: "axe-core", ruleId: "svg-img-alt", locator: "svg" }),
  // SYS-3: Scrollable region keyboard access (WCAG 2.1.1)
  "scrollable-region": patternFingerprint({ ruleNs: "axe-core", ruleId: "scrollable-region-focusable", locator: ".overflow-x-auto" }),
  // SYS-4: Bypass blocks / skip link (WCAG 2.4.1) — structural, no axe rule
  "missing-skip-link": patternFingerprint({ ruleNs: "manual", ruleId: "bypass-blocks", locator: "body > *:first-child" }),
};

for (const [k, v] of Object.entries(patterns)) {
  console.log(`${k}\t${v.display}\t${v.digest}`);
}
