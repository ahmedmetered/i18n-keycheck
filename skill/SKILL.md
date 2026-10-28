---
name: i18n-keycheck
description: >-
  Fail a build when code references translation keys that are missing from a
  dictionary-file i18n setup: scans source for literal keys and dynamic
  template-key prefixes, checks every key exists in every locale file, and
  exits 1 so CI gates on it. Zero dependencies, one file. Use when the user
  asks to check, wire up, or debug a hand-rolled dictionary i18n setup, or
  wants a missing-translation CI gate.
---

# i18n-keycheck

A single-file Node script (`check-i18n.mjs`) with zero npm dependencies.
Read [METHOD.md](METHOD.md) for the hard-won patterns it encodes
(optional-translator for library code, byte-identical EN fallback rule,
render-time translation of DB-seeded labels) and [README.md](README.md) for
the full reference.

## Usage

```
node check-i18n.mjs                          # defaults: src, src/messages, en,it
node check-i18n.mjs app src/locales en,de    # custom src dir, messages dir, locales
```

Checks both literal keys (`t("nav.pricing")`) and dynamic template prefixes
(`t(\`settings.wf.\${id}\`)` must have at least one matching key per locale).
Exit code 1 on any missing key, so a CI job gates on it directly.

## Wiring into CI

Add one step to the pipeline after install:

```yaml
- run: node path/to/check-i18n.mjs
```

If the script is copied into the consuming repo (recommended), keep it at the
repo root or a `scripts/` folder and call it with the project's own paths.
