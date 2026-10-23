import assert from "node:assert/strict";
import test from "node:test";
import { copy, detectLang, languageOptions } from "./messages.ts";

test("german is the default and the account toggle uses Anzeigen / Show", () => {
  assert.equal(detectLang([]), "de");
  assert.equal(detectLang(["en-US", "de"]), "en");
  assert.equal(detectLang(["zh-TW"]), "zh-Hant");
  assert.equal(copy.de.showAccount, "Anzeigen");
  assert.equal(copy.de.hideAccount, "Verbergen");
  assert.equal(copy.en.showAccount, "Show");
  assert.equal(copy.en.hideAccount, "Hide");
  assert.match(copy.de.privacyClaim, /Kein Upload/);
  assert.match(copy.de.privacyClaim, /lokal/i);
  assert.match(copy.en.privacyClaim, /No upload/);
  assert.match(copy.en.localNote, /no network request/i);
  assert.match(copy.de.localNote, /keine Netzwerkanfrage/i);
  assert.equal(copy.de.errTooMany, "Die Datei hat zu viele Einträge (mehr als 512).");
  assert.equal(copy.en.errTooMany, "The file has too many entries (more than 512).");
  assert.equal(copy.de.errBadFormat, "Ein Feld hat einen ungültigen Typ.");
  assert.equal(copy.en.errBadFormat, "A field has an invalid type.");
  assert.equal(copy.de.errTooMany.includes("Offsets"), false);
  assert.equal(copy.en.errBadFormat.includes("offset"), false);
});

test("every language has the same filled-in copy", () => {
  const keys = Object.keys(copy.de) as (keyof typeof copy.de)[];
  for (const { id } of languageOptions) {
    for (const key of keys) {
      const value = copy[id][key];
      assert.equal(typeof value, "string", `${id}.${key}`);
      assert.ok(value.trim().length > 0, `${id}.${key}`);
    }
    assert.equal(copy[id].brand, "consolecheat");
    assert.equal(copy[id].title, "Save-Info-Leser");
  }
});
