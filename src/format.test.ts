import assert from "node:assert/strict";
import test from "node:test";
import { formatWhen } from "./format.ts";

test("formatWhen uses the separate date and zone formatters", () => {
  const ms = Date.UTC(2022, 3, 15, 5, 20);
  for (const lang of ["de", "en", "no"] as const) {
    const locale = lang === "no" ? "nb" : lang;
    const date = new Date(ms);
    const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
    const zone = new Intl.DateTimeFormat(locale, { timeZoneName: "short" })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;
    const formatted = formatWhen(ms, lang);
    assert.equal(formatted, zone ? `${when} ${zone}` : when);
    assert.equal(formatted.includes("T05:20:00.000Z"), false);
  }
});
