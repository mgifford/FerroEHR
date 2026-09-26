// SPDX-FileCopyrightText: Vernum Projecten B.V.
// SPDX-License-Identifier: BUSL-1.1
//
// Accessibility corrections for mdBook-generated markup we do not author.
// Both are upstream mdBook issues (rust-lang/mdbook); remove a fix here if a
// future mdBook stops needing it.
//
// 1. Sidebar toggle: mdBook's <label id="mdbook-sidebar-toggle"> gets
//    aria-expanded from its inline theme script. A <label>'s implicit role does
//    not permit aria-expanded, so axe reports WCAG 4.1.2 (aria-allowed-attr).
//    The control keeps its aria-label + aria-controls; only the disallowed
//    attribute is removed.
// 2. Code blocks: a <pre> whose content overflows horizontally is a scrollable
//    region that a keyboard user cannot reach or scroll (WCAG 2.1.1). Give an
//    overflowing <pre> tabindex="0", role="region" and an accessible name so it
//    is focusable and scrollable by keyboard. tabindex is an attribute, so CSS
//    cannot do this.
(function () {
  "use strict";

  var ID = "mdbook-sidebar-toggle";
  function stripToggle() {
    var el = document.getElementById(ID);
    if (el && el.hasAttribute("aria-expanded")) {
      el.removeAttribute("aria-expanded");
    }
  }
  function watchToggle() {
    var el = document.getElementById(ID);
    stripToggle();
    if (!el) {
      return;
    }
    // mdBook re-sets aria-expanded when the sidebar is toggled, so keep it off.
    var obs = new MutationObserver(stripToggle);
    obs.observe(el, { attributes: true, attributeFilter: ["aria-expanded"] });
  }

  function focusableCodeBlocks() {
    var pres = document.querySelectorAll(".content pre");
    for (var i = 0; i < pres.length; i++) {
      var pre = pres[i];
      var overflows = pre.scrollWidth > pre.clientWidth;
      if (overflows) {
        if (!pre.hasAttribute("tabindex")) {
          pre.setAttribute("tabindex", "0");
        }
        if (!pre.hasAttribute("role")) {
          pre.setAttribute("role", "region");
        }
        if (!pre.hasAttribute("aria-label")) {
          pre.setAttribute("aria-label", "Code block, scrollable");
        }
      } else {
        // A reflow may have removed the overflow: undo only what we added.
        if (pre.getAttribute("aria-label") === "Code block, scrollable") {
          pre.removeAttribute("tabindex");
          pre.removeAttribute("role");
          pre.removeAttribute("aria-label");
        }
      }
    }
  }

  function run() {
    watchToggle();
    focusableCodeBlocks();
    // Re-evaluate overflow on resize (a narrower viewport makes more blocks
    // overflow); debounced so it is cheap.
    var t;
    window.addEventListener("resize", function () {
      window.clearTimeout(t);
      t = window.setTimeout(focusableCodeBlocks, 150);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
