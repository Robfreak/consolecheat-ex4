# Save-Info-Leser

Reads a PlayStation 4 save’s `PARAM.SFO` in the browser. German is the primary language. The page uses the same cards, type, light and dark theme, and language list as [consolecheat](https://consolecheat.com) and the [Title-ID-Finder](https://github.com/Robfreak/consolecheat-ex1).

No account, no tracking, nothing uploaded. The file is parsed in the tab. There is no upload and no network request for the save. Language and theme are the only things kept locally, under the same keys as the hub (`consolecheat-lang`, `consolecheat-theme`). Fonts are self-hosted, so the page does not call Google or any other third party while it loads.

Expected site: <https://robfreak.github.io/consolecheat-ex4/>

## What it does

- Drag a file onto the page, or pick a file. A renamed file is still tried as a PARAM.SFO.
- Pick or drop a whole `sce_sys` folder. The page looks for `param.sfo` / `PARAM.SFO` and, when it is there, shows `icon0.png`. A copy inside `sce_sys` wins over a copy next to it.
- Shows TITLE (or MAINTITLE when TITLE is absent), TITLE_ID, SUBTITLE, DETAIL, SAVEDATA_DIRECTORY, and ACCOUNT_ID. TITLE_ID links to the Title-ID-Finder: `https://robfreak.github.io/consolecheat-ex1/?q=` plus the id. The link is only followed when it is clicked.
- ACCOUNT_ID is the PSN account id, an 8-byte little-endian uint64 printed as 16 zero-padded hex digits. File bytes `00 11 22 33 44 55 66 77` are `7766 5544 3322 1100`. By default only the last four hex digits are visible. **Anzeigen** / **Show** reveals it, in the summary and in the raw field list. A new file starts masked again.
- A date is shown when one can be read, and the label says where it came from. The first plausible Unix time in this order wins:
  - `PARAMS` at offset `0x68` (last modified), then offset `0x60` (created), the layout on the PS4 Developer wiki.
  - `SAVEDATA_LIST_PARAM`, only when that integer is a Unix time in the PS4 era (2013–2100). A small user param such as `1` is not treated as a date.
  - the file’s `lastModified`, labelled as the file time and not as something from inside the save.
- Every key, including unknown ones, is in a collapsed list with its format (`UTF-8`, `UTF-8 special`, `int32`, or unknown). Text stays text. Known integer fields such as `SAVEDATA_BLOCKS`, `ATTRIBUTE`, and `PARENTAL_LEVEL` are decimal. Any other non-text binary field is hex.
- A file that is not an SFO, is cut off, has offsets that point outside, has more than 512 entries, has a field type other than utf-8 / utf-8 special / uint32, or looks encrypted/random gets its own localized message. The parser checks bounds before every read.

## Format

The reader follows the internal structure on the [PS4 Developer wiki: PARAM.SFO](https://www.psdevwiki.com/ps4/PARAM.SFO):

- Magic `\0PSF` (`00 50 53 46`), then version, key-table offset, data-table offset, and the number of index entries. Little-endian.
- Each index entry is 16 bytes: key offset (`uint16`), format (`uint16`), used length, max length, data offset.
- Formats: `0x0004` utf-8 special (raw bytes, used for save data such as `ACCOUNT_ID` and `PARAMS`), `0x0204` utf-8 (NUL-terminated), `0x0404` uint32.
- `ACCOUNT_ID` is 8 bytes, a little-endian 64-bit PSN account id. The page reads that integer and prints it as 16 zero-padded hex digits. Bytes `00 11 22 33 44 55 66 77` are `7766554433221100`.
- `PARAMS` is 1024 bytes. Offset `0x60` is the creation time and `0x68` is the last modified time, both Unix seconds, little-endian. That table is on the same wiki page.
- `SAVEDATA_LIST_PARAM` is the save’s user integer (see the save-data API used by emulators such as shadPS4). This page reads it as a date only when the value is a plausible Unix time, because a normal user param is a small number and not a clock.

## Samples

Synthetic files only. Nothing here is a real game save. Regenerate them with `npm run samples`. Drag these in:

| File | What it is |
| --- | --- |
| `samples/valid-param.sfo` | Full save: title Synth Rally, `CUSA00001`, account `7766554433221100` (masked as `•••• •••• •••• 1100`), date from `PARAMS` offset `0x68` (2022-04-15 05:20 UTC), `SAVEDATA_BLOCKS` **64**, plus the unknown key `MYSTERY_FLAG` |
| `samples/sce_sys/` | The same PARAM.SFO plus a generated `icon0.png`, for a folder drop |
| `samples/unknown-key.sfo` | `HELLO_FIELD` and an int32 |
| `samples/params-date.sfo` | User param `2` is not a date; the date comes from `PARAMS` offset `0x68` |
| `samples/file-date.sfo` | No date inside the file; the label uses `lastModified` |
| `samples/long-title.sfo` | A 128-character title with no spaces (`CUSA00005`), to check wrapping at 390px |
| `samples/truncated.sfo` | Cut off after the header |
| `samples/bad-magic.sfo` | Plain text |
| `samples/bad-offset.sfo` | Magic is right, offsets point far outside the file |
| `samples/encrypted.sfo` | Fixed random bytes |

## Scripts

```bash
npm test          # parser, masking, folder picking, sample bytes
npm run samples   # rewrite samples/
npm run build     # typecheck, Vite build (base /consolecheat-ex4/), reject woff and third-party hosts
```

Outfit and Source Sans 3 are bundled from `@fontsource` under the SIL Open Font License; see `public/FONT-OFL.txt`. The Vite plugin strips the `.woff` fallback so the build ships `.woff2` only.

## GitHub Pages

`.github/workflows/pages.yml` runs a **check** job (install, test, build) on every pull request and on a push to `main`. The **deploy** job publishes `dist/` to the orphan branch `gh-pages` (`peaceiris/actions-gh-pages`, Jekyll off) only on a push to `main`. `package.json` requires Node `>=22.6`.

Vite `base` is `/consolecheat-ex4/`, which matches a project site at `https://robfreak.github.io/consolecheat-ex4/`.

The Actions token can update `gh-pages` only when Actions has write permission. It often cannot turn Pages on. If the URL is not live, the repo owner does this once:

1. **Settings → Actions → General → Workflow permissions → Read and write permissions.** Save.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch.**
3. **Branch: `gh-pages`, folder: `/ (root)`.** Save.

After that, the site is served from the branch the workflow already fills. The first deploy can take a minute.

## Footer

Impressum and Datenschutz are `#impressum` and `#datenschutz`. The Impressum fields are placeholders. No name, address, or contact is filled in. The privacy page says the save is read only in the tab: no upload, no network request, and the account id stays masked until Anzeigen / Show.
