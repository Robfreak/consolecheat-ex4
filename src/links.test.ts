import assert from "node:assert/strict";
import test from "node:test";
import { archiveHref, finderHref, otherTools } from "./links.ts";

test("the footer lists every other tool and not this site", () => {
  const hrefs = otherTools.map((tool) => tool.href);
  assert.deepEqual(hrefs, [
    "https://robfreak.github.io/consolecheat-ex1/",
    "https://robfreak.github.io/consolecheat-ex2/",
    "https://robfreak.github.io/consolecheat-ex3/",
    "https://robfreak.github.io/consolecheat-ex5/",
    "https://robfreak.github.io/consolecheat-ex6/",
    "https://robfreak.github.io/consolecheat-ex6/bildschirm/",
  ]);
  assert.deepEqual(
    otherTools.map((tool) => tool.label),
    [
      "Title-ID-Finder",
      "PS-Plus-Archiv",
      "Controller-Tester",
      "Fehlercode-Nachschlager",
      "Spiele-Merkliste",
      "Bildschirm-Test",
    ],
  );
  assert.equal(hrefs.some((href) => href.includes("consolecheat-ex4")), false);
});

test("TITLE_ID still deep-links to the Title-ID-Finder", () => {
  assert.equal(finderHref("CUSA00001"), "https://robfreak.github.io/consolecheat-ex1/?q=CUSA00001");
  assert.equal(finderHref("PPSA01234"), "https://robfreak.github.io/consolecheat-ex1/?q=PPSA01234");
  assert.equal(finderHref("ab"), null);
  assert.equal(finderHref("has space"), null);
  assert.equal(finderHref(""), null);
});

test("a loaded save links to the PS-Plus-Archiv with TITLE, then TITLE_ID", () => {
  assert.equal(
    archiveHref("Synth Rally", "CUSA00001"),
    "https://robfreak.github.io/consolecheat-ex2/?q=Synth%20Rally",
  );
  assert.equal(archiveHref(null, "CUSA00001"), "https://robfreak.github.io/consolecheat-ex2/?q=CUSA00001");
  assert.equal(archiveHref("   ", "CUSA00001"), "https://robfreak.github.io/consolecheat-ex2/?q=CUSA00001");
  assert.equal(archiveHref("Ratchet & Clank", null), "https://robfreak.github.io/consolecheat-ex2/?q=Ratchet%20%26%20Clank");
  assert.equal(archiveHref(null, null), null);
  assert.equal(archiveHref("  ", "  "), null);
});
