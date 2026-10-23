import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { filesFromList, filesFromTransfer, type LocalFile } from "./files";
import { Mark, MoonIcon, SunIcon } from "./icons";
import { LegalPage } from "./legal";
import { accountDisplay, accountIdFromBytes } from "./mask";
import {
  RTL,
  copy,
  detectLang,
  fill,
  isLang,
  languageOptions,
  type Copy,
  type Lang,
} from "./messages";
import { pickParamAndIcon } from "./pick";
import {
  SFO_MAX_BYTES,
  SfoParseError,
  entryText,
  findEntry,
  parseSfo,
  rawValue,
  readSaveDate,
  type SaveDate,
  type SaveDateSource,
  type SfoEntry,
  type SfoErrorCode,
  type SfoFormat,
} from "./sfo";

type Theme = "light" | "dark";
type Page = "home" | "impressum" | "datenschutz";
type UiError = SfoErrorCode | "no-param" | "generic";

type Loaded = {
  name: string;
  entries: SfoEntry[];
  date: SaveDate | null;
  iconFile: File | null;
};

const FINDER = "https://robfreak.github.io/consolecheat-ex1/?q=";

function readPage(): Page {
  const hash = location.hash.replace(/^#\/?/, "");
  if (hash === "impressum") return "impressum";
  if (hash === "datenschutz") return "datenschutz";
  return "home";
}

function readLang(): Lang {
  try {
    const stored = localStorage.getItem("consolecheat-lang");
    if (isLang(stored)) return stored;
    return detectLang(navigator.languages);
  } catch {
    return "de";
  }
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyLang(next: Lang) {
  document.documentElement.lang = next;
  document.documentElement.dir = RTL.has(next) ? "rtl" : "ltr";
  localStorage.setItem("consolecheat-lang", next);
}

function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  localStorage.setItem("consolecheat-theme", next);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", next === "light" ? "#f4f1eb" : "#07090e");
}

function finderHref(id: string): string | null {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/.test(id)) return null;
  return `${FINDER}${encodeURIComponent(id)}`;
}

function formatWhen(ms: number, lang: Lang): string {
  const locale = lang === "no" ? "nb" : lang;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

function dateLabel(t: Copy, source: SaveDateSource): string {
  if (source === "savedata-list-param") return t.dateList;
  if (source === "params-modified") return t.dateParamsModified;
  if (source === "params-created") return t.dateParamsCreated;
  return t.dateFile;
}

function formatLabel(t: Copy, format: SfoFormat): string {
  if (format === "utf8") return t.formatUtf8;
  if (format === "utf8-special") return t.formatUtf8Special;
  if (format === "int32") return t.formatInt32;
  return t.formatUnknown;
}

function errorText(t: Copy, code: UiError): string {
  if (code === "not-sfo") return t.errNotSfo;
  if (code === "truncated") return t.errTruncated;
  if (code === "bad-offset") return t.errBadOffset;
  if (code === "too-many") return t.errTooMany;
  if (code === "bad-format") return t.errBadFormat;
  if (code === "encrypted") return t.errEncrypted;
  if (code === "too-big") return t.errTooBig;
  if (code === "no-param") return t.errNoParam;
  return t.errGeneric;
}

class ViewBoundary extends Component<{ children: ReactNode; fallback: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p role="alert" className="panel rounded-xl px-4 py-4 text-bad">
          {this.props.fallback}
        </p>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [lang, setLang] = useState<Lang>(readLang);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [page, setPage] = useState<Page>(readPage);
  const [hot, setHot] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reveal, setReveal] = useState(false);
  const ticket = useRef(0);
  const t = copy[lang];

  useEffect(() => {
    applyLang(lang);
  }, [lang]);

  useEffect(() => {
    const sync = () => setPage(readPage());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const block = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  useEffect(() => {
    const name = page === "impressum" ? "Impressum" : page === "datenschutz" ? "Datenschutz" : t.title;
    document.title = `${name} · consolecheat`;
    if (page !== "home") window.scrollTo(0, 0);
  }, [page, t.title]);

  async function openFiles(files: LocalFile[]) {
    const id = ++ticket.current;
    setError(null);
    const picked = pickParamAndIcon(files);
    if (picked.reason === "empty") return;
    if (picked.reason === "no-param" || !picked.param) {
      setLoaded(null);
      setError("no-param");
      return;
    }
    const file = picked.param.file;
    if (file.size > SFO_MAX_BYTES) {
      setLoaded(null);
      setError("too-big");
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (id !== ticket.current) return;
      const doc = parseSfo(bytes);
      const iconFile = picked.icon?.file;
      setReveal(false);
      setLoaded({
        name: file.name,
        entries: doc.entries,
        date: readSaveDate(doc.entries, Number.isFinite(file.lastModified) ? file.lastModified : null),
        iconFile: iconFile && iconFile.size > 0 && iconFile.size <= 2_000_000 ? iconFile : null,
      });
    } catch (reason) {
      if (id !== ticket.current) return;
      setLoaded(null);
      setError(reason instanceof SfoParseError ? reason.code : "generic");
    }
  }

  async function onDrop(transfer: DataTransfer) {
    try {
      await openFiles(await filesFromTransfer(transfer));
    } catch {
      setLoaded(null);
      setError("generic");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="https://consolecheat.com" className="flex min-w-0 items-center gap-3">
            <Mark />
            <span className="truncate font-display text-lg font-semibold tracking-tight">{t.brand}</span>
          </a>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="lang">
              {t.language}
            </label>
            <select
              id="lang"
              value={lang}
              onChange={(event) => {
                if (isLang(event.target.value)) setLang(event.target.value);
              }}
              className="h-11 w-28 rounded-lg border border-line bg-surface px-2 text-sm text-fg sm:w-36"
            >
              {languageOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={theme === "dark" ? t.themeLight : t.themeDark}
              onClick={() => {
                const next = theme === "dark" ? "light" : "dark";
                setTheme(next);
                applyTheme(next);
              }}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-fg"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {page === "home" ? (
        <ViewBoundary fallback={t.crash}>
          <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <p className="eyebrow text-xs font-medium uppercase text-steel">{t.eyebrow}</p>
            <h1 className="display-title mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{t.lede}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <p className="panel rounded-xl px-4 py-4 text-base font-medium leading-relaxed text-fg">{t.freeClaim}</p>
              <p className="panel rounded-xl px-4 py-4 text-base font-medium leading-relaxed text-fg">{t.privacyClaim}</p>
            </div>
            <p className="mt-4 text-sm text-subtle">{t.unofficial}</p>

            <section className="mt-10" aria-labelledby="drop-heading">
              <div
                className={`panel rounded-xl p-5 sm:p-6 ${hot ? "drop-hot" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setHot(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setHot(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setHot(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setHot(false);
                  void onDrop(event.dataTransfer);
                }}
              >
                <h2 id="drop-heading" className="font-display text-2xl font-semibold tracking-tight">
                  {t.dropTitle}
                </h2>
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">{t.dropHint}</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <label
                    htmlFor="sfo-file"
                    className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg"
                  >
                    {t.pickFile}
                  </label>
                  <label
                    htmlFor="sfo-folder"
                    className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-fg"
                  >
                    {t.pickFolder}
                  </label>
                </div>
                <input
                  id="sfo-file"
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    const list = event.target.files;
                    if (list && list.length) void openFiles(filesFromList(list));
                    event.target.value = "";
                  }}
                />
                <input
                  id="sfo-folder"
                  type="file"
                  multiple
                  className="sr-only"
                  ref={(node) => {
                    if (node) node.webkitdirectory = true;
                  }}
                  onChange={(event) => {
                    const list = event.target.files;
                    if (list && list.length) void openFiles(filesFromList(list));
                    event.target.value = "";
                  }}
                />
                <p className="mt-4 text-sm leading-relaxed text-subtle">{t.localNote}</p>
              </div>

              {error ? (
                <p role="alert" className="panel mt-4 rounded-xl px-4 py-4 text-base leading-relaxed text-bad">
                  {errorText(t, error)}
                </p>
              ) : null}

              {loaded ? (
                <SaveCard
                  loaded={loaded}
                  t={t}
                  lang={lang}
                  reveal={reveal}
                  onToggle={() => setReveal((value) => !value)}
                  onClear={() => {
                    setLoaded(null);
                    setError(null);
                    setReveal(false);
                  }}
                />
              ) : null}
            </section>
          </main>
        </ViewBoundary>
      ) : (
        <LegalPage
          page={page}
          homeHref={import.meta.env.BASE_URL}
          onHome={(event) => {
            event.preventDefault();
            history.pushState(null, "", location.pathname);
            setPage("home");
            window.scrollTo(0, 0);
          }}
        />
      )}

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm leading-relaxed text-subtle sm:px-6">
          <p className="text-fg">{t.brand}</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Impressum und Datenschutz">
            <a href="#impressum" className="text-steel underline-offset-4 hover:underline">
              Impressum
            </a>
            <a href="#datenschutz" className="text-steel underline-offset-4 hover:underline">
              Datenschutz
            </a>
          </nav>
          <p>{t.freeClaim}</p>
          <p>{t.privacyClaim}</p>
          <p>{t.footerNote}</p>
        </div>
      </footer>
    </div>
  );
}

function SaveCard({
  loaded,
  t,
  lang,
  reveal,
  onToggle,
  onClear,
}: {
  loaded: Loaded;
  t: Copy;
  lang: Lang;
  reveal: boolean;
  onToggle: () => void;
  onClear: () => void;
}) {
  const title = entryText(loaded.entries, "TITLE") ?? entryText(loaded.entries, "MAINTITLE");
  const titleId = entryText(loaded.entries, "TITLE_ID");
  const subtitle = entryText(loaded.entries, "SUBTITLE");
  const detail = entryText(loaded.entries, "DETAIL");
  const directory = entryText(loaded.entries, "SAVEDATA_DIRECTORY");
  const account = findEntry(loaded.entries, "ACCOUNT_ID");
  const href = titleId ? finderHref(titleId) : null;

  return (
    <article className="panel mt-4 rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-4">
          {loaded.iconFile ? <SaveIcon file={loaded.iconFile} alt={t.iconAlt} /> : null}
          <div className="min-w-0 flex-1">
            <h2 className="min-w-0 break-anywhere font-display text-2xl font-semibold tracking-tight">{title ?? loaded.name}</h2>
            <p className="mt-1 text-sm text-subtle">{fill(t.readFile, { name: loaded.name })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-11 items-center rounded-lg border border-line bg-surface px-3 text-sm font-medium text-fg"
        >
          {t.clear}
        </button>
      </div>

      {loaded.entries.length === 0 ? <p className="mt-4 text-muted">{t.noFields}</p> : null}

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label={t.fieldTitle} wide wrap>
          {title ?? <Missing text={t.missing} />}
        </Field>
        <Field label={t.fieldTitleId}>
          {titleId && href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={t.openFinder}
              className="font-mono text-base font-semibold text-steel underline-offset-4 hover:underline"
            >
              {titleId}
            </a>
          ) : titleId ? (
            <span className="font-mono font-semibold">{titleId}</span>
          ) : (
            <Missing text={t.missing} />
          )}
        </Field>
        <Field label={t.fieldSubtitle}>{subtitle ?? <Missing text={t.missing} />}</Field>
        <Field label={t.fieldDirectory}>
          {directory ? <span className="font-mono">{directory}</span> : <Missing text={t.missing} />}
        </Field>
        <Field label={t.fieldDetail} wide>
          {detail ? <span className="whitespace-pre-wrap">{detail}</span> : <Missing text={t.missing} />}
        </Field>
        <Field label={t.fieldAccount} wide>
          {account ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span id="account-value" className="font-mono text-base font-semibold tracking-wide">
                  {accountDisplay(accountIdFromBytes(account.bytes), reveal)}
                </span>
                <button
                  type="button"
                  aria-pressed={reveal}
                  aria-controls="account-value"
                  onClick={onToggle}
                  className="inline-flex h-11 items-center rounded-lg border border-line bg-surface px-3 text-sm font-medium text-fg"
                >
                  {reveal ? t.hideAccount : t.showAccount}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-subtle">{t.accountNote}</p>
            </div>
          ) : (
            <Missing text={t.missing} />
          )}
        </Field>
        <Field label={t.fieldDate} wide>
          {loaded.date ? (
            <div>
              <p className="text-base">{formatWhen(loaded.date.ms, lang)}</p>
              <p className="mt-1 text-sm leading-relaxed text-subtle">{dateLabel(t, loaded.date.source)}</p>
            </div>
          ) : (
            <Missing text={t.missing} />
          )}
        </Field>
      </dl>

      <details className="mt-5 rounded-lg bg-raised px-3 py-3">
        <summary className="font-display text-lg font-semibold tracking-tight">{t.rawSummary}</summary>
        <p className="mt-2 text-sm leading-relaxed text-subtle">{t.rawHint}</p>
        <ul className="mt-3 flex flex-col gap-3">
          {loaded.entries.map((entry, index) => {
            const accountRow = entry.key.toUpperCase() === "ACCOUNT_ID";
            return (
              <li key={`${entry.key}:${index}`} className="border-t border-line pt-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm font-semibold">{entry.key}</span>
                  <span className="text-sm text-subtle">
                    {formatLabel(t, entry.format)} · 0x{entry.formatCode.toString(16).padStart(4, "0")}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className={`hex-value font-mono text-sm ${accountRow ? "" : "text-fg"}`} {...(accountRow ? { id: "account-raw" } : {})}>
                    {rawValue(entry, reveal)}
                  </p>
                  {accountRow ? (
                    <button
                      type="button"
                      aria-pressed={reveal}
                      onClick={onToggle}
                      className="inline-flex h-11 items-center rounded-lg border border-line bg-surface px-3 text-sm font-medium text-fg"
                    >
                      {reveal ? t.hideAccount : t.showAccount}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </details>
    </article>
  );
}

function SaveIcon({ file, alt }: { file: File; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  if (!url) return null;
  return <img src={url} alt={alt} className="h-20 w-36 shrink-0 rounded-lg bg-raised object-contain" />;
}

function Field({
  label,
  children,
  wide = false,
  wrap = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-lg bg-raised px-3 py-3 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-sm text-subtle">{label}</dt>
      <dd className={`mt-1 min-w-0 text-base leading-relaxed text-fg ${wrap ? "break-anywhere" : ""}`}>{children}</dd>
    </div>
  );
}

function Missing({ text }: { text: string }) {
  return <span className="text-subtle">{text}</span>;
}
