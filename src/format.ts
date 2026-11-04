import type { Lang } from "./messages.ts";

export function formatWhen(ms: number, lang: Lang): string {
  const locale = lang === "no" ? "nb" : lang;
  const date = new Date(ms);
  try {
    const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
    const zone = new Intl.DateTimeFormat(locale, { timeZoneName: "short" })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;
    return zone ? `${when} ${zone}` : when;
  } catch {
    return date.toISOString();
  }
}
