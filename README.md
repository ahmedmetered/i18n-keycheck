# i18n-keycheck

**A missing-translation-key checker for hand-rolled dictionary i18n. One file, zero dependencies, CI-ready.**

If your app keeps translations in flat dictionaries (`en.ts` / `it.ts` / `<ns>.<locale>.ts`, each exporting `Record<string, string>`) and calls `t("some.key")`, then your silent failure mode is the key that exists in *neither* dictionary — it renders as the raw string `some.key` in production, in every locale, and no test catches it because each individual string looks fine.

This is the checker for that. It also understands template keys (`t(`viewHelp.${view}`)`) and fails when a template prefix has no entries at all.

```console
$ node check-i18n.mjs
All keys present in both dictionaries. (2113 literal + 40 template prefixes checked, 2991 unique keys)

$ node check-i18n.mjs
MISSING it: nav.pricing  (used in src/components/Nav.tsx)
MISSING it: any key starting with "settings.wf."  (template-keyed t(`...`) has no entries)
2 missing key(s) across en/it; dictionaries hold 118 unique keys.
(exit 1)
```

## Install

```bash
curl -O https://raw.githubusercontent.com/ahmedmetered/i18n-keycheck/main/check-i18n.mjs
node check-i18n.mjs                       # defaults: src, src/messages, en,it
node check-i18n-keycheck.mjs app src/locales en,de    # custom src dir, messages dir, locales
```

No npm package needed — it is one ~130-line file using only `node:fs` and `node:path`.

## CI gate (GitHub Actions)

```yaml
      - run: node check-i18n.mjs   # add as a step in any existing job; exits 1 on missing keys
```

Run it in CI after every PR and the class of bug stops existing: a developer adds `t("new.key")`, the key lands in `en` but not `it` (the classic miss), the build goes red with the exact file and key named.

## What it checks

1. Every `t("literal.key")` in your source (`src/` by default, `.tsx/.ts/.jsx/.js/.mjs`, skipping `node_modules`, `.next`, `dist`, build folders and the messages directory itself) exists in **every** locale's merged dictionary.
2. Every template key `t(`prefix.${v}`)` has at least one key starting with `prefix` in every locale.
3. Dictionary parsing understands the common layout: `<locale>.ts` core files plus `<namespace>.<locale>.ts` files, all merged per locale. Anything that puts `"some.key":` lines in `.ts` files works.

## Conventions it assumes (and METHOD.md expands on)

- Flat string keys with dotted namespaces (`"nav.pricing"`), one dictionary per locale.
- English is the source of truth; other locales may lag and fall back at runtime — but the *checker* requires full parity, which is the right default for shipped UIs. (Want to allow gaps temporarily? Add the key with the English text as a placeholder and mark it with a TODO; gaps you can see are gaps you can finish.)
- The translator function is named `t`. Using a different name? Change the two regexes at the top of the file.

See [METHOD.md](METHOD.md) for the companion patterns that made this checker necessary on a real bilingual app: the optional-translator pattern for library code, translating strings that live in the database, and the byte-identical fallback rule.

## License

MIT.
