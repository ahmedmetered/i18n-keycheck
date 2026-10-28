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

This file is the discovery entrypoint when the whole repository is cloned
into a skills folder. The canonical skill lives one level down.

**Read [skill/SKILL.md](skill/SKILL.md) and follow it.** The checker itself
is `check-i18n.mjs` at this repository's root.
