// SPDX-FileCopyrightText: Vernum Projecten B.V.
// SPDX-License-Identifier: BUSL-1.1

//! The viewer's thaw widget theme.
//!
//! The design system's teal accent as the Fluent brand ramp, so thaw widgets
//! (buttons, radios, tabs, links) and the Tailwind token layer
//! (`style/tailwind.css`) draw from the same palette instead of thaw's stock
//! blue.

use std::collections::HashMap;

/// The teal brand ramp, Fluent variant keys 10 (darkest) → 160 (lightest).
///
/// The token layer's `--accent` (`style/tailwind.css`) is variant 60
/// (`#0f766e`): variant 80 (`#0d9488`) as accent text on white is 3.74:1 and
/// fails WCAG 2.2 1.4.3 AA, so the CSS accent was moved to 60 (5.47:1). The
/// thaw widget accent still resolves from this ramp's primary slot — verify
/// widget text/affordance contrast on a build and align the primary slot if it
/// still resolves to 80.
const BRAND: [(i32, &str); 16] = [
    (10, "#031b19"),
    (20, "#042f2e"),
    (30, "#0a3f3c"),
    (40, "#134e4a"),
    (50, "#115e59"),
    (60, "#0f766e"),
    (70, "#0e857b"),
    (80, "#0d9488"),
    (90, "#14b8a6"),
    (100, "#2dd4bf"),
    (110, "#48ddc8"),
    (120, "#5eead4"),
    (130, "#7cf0dc"),
    (140, "#99f6e4"),
    (150, "#b3f9ea"),
    (160, "#ccfbf1"),
];

fn ramp() -> HashMap<i32, &'static str> {
    BRAND.into_iter().collect()
}

/// The light widget theme (teal brand).
#[must_use]
pub fn viewer_light() -> thaw::Theme {
    thaw::Theme::custom_light(&ramp())
}

/// The dark widget theme (teal brand).
#[must_use]
pub fn viewer_dark() -> thaw::Theme {
    thaw::Theme::custom_dark(&ramp())
}
