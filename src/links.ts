const FINDER = "https://robfreak.github.io/consolecheat-ex1/?q=";
const ARCHIVE = "https://robfreak.github.io/consolecheat-ex2/?q=";

const TITLE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/;

export type ToolLink = {
  id: string;
  href: string;
  label: string;
};

/** Other consolecheat tools. This site (Save-Info-Leser) is not in the list. */
export const otherTools: readonly ToolLink[] = [
  { id: "finder", href: "https://robfreak.github.io/consolecheat-ex1/", label: "Title-ID-Finder" },
  { id: "plus", href: "https://robfreak.github.io/consolecheat-ex2/", label: "PS-Plus-Archiv" },
  { id: "controller", href: "https://robfreak.github.io/consolecheat-ex3/", label: "Controller-Tester" },
  { id: "codes", href: "https://robfreak.github.io/consolecheat-ex5/", label: "Fehlercode-Nachschlager" },
  { id: "list", href: "https://robfreak.github.io/consolecheat-ex6/", label: "Spiele-Merkliste" },
  { id: "screen", href: "https://robfreak.github.io/consolecheat-ex6/bildschirm/", label: "Bildschirm-Test" },
];

export function finderHref(id: string): string | null {
  if (!TITLE_ID.test(id)) return null;
  return `${FINDER}${encodeURIComponent(id)}`;
}

/** PS-Plus-Archiv search. TITLE wins; TITLE_ID is the fallback. */
export function archiveHref(title: string | null, titleId: string | null): string | null {
  const query = title?.trim() || titleId?.trim() || "";
  if (!query) return null;
  return `${ARCHIVE}${encodeURIComponent(query)}`;
}
