import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const banned = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "cdnjs.cloudflare.com",
  "googletagmanager.com",
  "google-analytics.com",
];

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(root);

const problems = [];
for (const path of files) {
  const ext = extname(path).toLowerCase();
  if (ext === ".woff") problems.push(`woff fallback shipped: ${path}`);
  if (![".html", ".js", ".css", ".svg", ".json", ".txt"].includes(ext)) continue;
  const text = readFileSync(path, "utf8");
  for (const host of banned) {
    if (text.includes(host)) problems.push(`${host} in ${path}`);
  }
  if (/\.woff(?!2)["')]/i.test(text)) problems.push(`woff url in ${path}`);
}

const woff2 = files.filter((path) => path.endsWith(".woff2"));
if (!woff2.length) problems.push("no woff2 font files in dist");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`dist offline check ok (${woff2.length} woff2)`);
