// SPDX-FileCopyrightText: Vernum Projecten B.V.
// SPDX-License-Identifier: BUSL-1.1
//
// Accessibility corrections for mdBook-generated markup we do not author.
//
// mdBook's sidebar toggle is a <label id="mdbook-sidebar-toggle"> and its
// inline theme script sets aria-expanded on it. A <label>'s implicit role does
// not permit aria-expanded, so axe reports WCAG 4.1.2 (aria-allowed-attr). The
// control stays operable and keeps its aria-label + aria-controls; only the
// disallowed attribute is removed. This is an upstream mdBook issue
// (rust-lang/mdbook); remove this file if a future mdBook stops emitting it.
(function () {
  "use strict";
  var ID = "mdbook-sidebar-toggle";
  function strip() {
    var el = document.getElementById(ID);
    if (el && el.hasAttribute("aria-expanded")) {
      el.removeAttribute("aria-expanded");
    }
  }
  function watch() {
    var el = document.getElementById(ID);
    strip();
    if (!el) {
      return;
    }
    // mdBook re-sets aria-expanded when the sidebar is toggled, so keep it off.
    var obs = new MutationObserver(strip);
    obs.observe(el, { attributes: true, attributeFilter: ["aria-expanded"] });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }
})();
