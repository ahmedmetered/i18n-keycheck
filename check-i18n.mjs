#!/usr/bin/env node
// check-i18n.mjs — verify that every t("key") used in your source exists in BOTH
// dictionaries, and that template-key prefixes (t(`prefix.${var}`)) have at least
// one matching key. Built for flat-dictionary i18n (en.ts / it.ts / <ns>.en.ts /
// <ns>.it.ts exporting Record<string,string>), the setup most small apps roll by
// hand instead of adopting next-intl/i18next.
//
// Usage:
//   node check-i18n.mjs                          # src, src/messages, locales en,it
//   node check-i18n.mjs app src/locales en,de    # custom src dir, messages dir, locales
//
// Exit code 1 when anything is missing, so it works as a CI gate.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const [srcDirArg = "src", messagesArg = join("src", "messages"), localesArg = "en,it"] = process.argv.slice(2);
const LOCALES = localesArg.split(",").map((l) => l.trim()).filter(Boolean);
if (LOCALES.length < 1) {
  console.error("Need at least one locale, e.g. `en,it`");
  process.exit(2);
}
const root = process.cwd();

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", ".turbo", "coverage"]);

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

// Gather every t("...") literal and t(`prefix.${...}`) template in the source,
// excluding the dictionary files themselves.
const files = walk(join(root, srcDirArg)).filter((f) => !f.startsWith(join(root, messagesArg)));
const used = new Map(); // key -> first file using it
let templatePrefixes = new Set();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bt\(\s*["']([^"'\n]+)["']/g)) {
    if (!m[1].includes("${") && !used.has(m[1])) used.set(m[1], f);
  }
  for (const m of src.matchAll(/\bt\(\s*`([^`]+)`/g)) {
    const prefix = m[1].split("${")[0];
    if (prefix) templatePrefixes.add(prefix);
  }
}

// Parse each dictionary file: <locale>.ts is the core file for that locale,
// <ns>.<locale>.ts adds a namespace. Any "key": line counts.
const dictFiles = readdirSync(join(root, messagesArg)).filter((f) => {
  const base = f.replace(/\.ts$/, "");
  return LOCALES.some((l) => base === l || base.endsWith(`.${l}`));
});
if (dictFiles.length === 0) {
  console.error(`No dictionary files found in ${messagesArg} for locales ${LOCALES.join(",")}`);
  process.exit(2);
}
const dicts = Object.fromEntries(LOCALES.map((l) => [l, {}]));
for (const f of dictFiles) {
  const base = f.replace(/\.ts$/, "");
  const locale = LOCALES.find((l) => base === l || base.endsWith(`.${l}`));
  const src = readFileSync(join(root, messagesArg, f), "utf8");
  for (const m of src.matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)) dicts[locale][m[1]] = true;
}

let bad = 0;
for (const locale of LOCALES) {
  for (const [key, f] of [...used].sort()) {
    if (!(key in dicts[locale])) {
      console.log(`MISSING ${locale}: ${key}  (used in ${f.slice(root.length + 1)})`);
      bad++;
    }
  }
  for (const prefix of [...templatePrefixes].sort()) {
    if (!Object.keys(dicts[locale]).some((k) => k.startsWith(prefix))) {
      console.log(`MISSING ${locale}: any key starting with "${prefix}"  (template-keyed t(\`...\`) has no entries)`);
      bad++;
    }
  }
}
const total = new Set(LOCALES.flatMap((l) => Object.keys(dicts[l]))).size;
if (bad) {
  console.log(`\n${bad} missing key(s) across ${LOCALES.join("/")}; dictionaries hold ${total} unique keys.`);
  process.exit(1);
}
console.log(`All keys present in both dictionaries. (${used.size} literal + ${templatePrefixes.size} template prefixes checked, ${total} unique keys)`);
