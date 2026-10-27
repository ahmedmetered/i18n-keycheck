# METHOD.md — patterns for hand-rolled bilingual apps

The checker fixes one failure mode. These are the companion patterns from shipping a
fully bilingual production app (Next.js App Router, EN/IT, ~3,000 keys) with the same
flat-dictionary setup. Each one was learned the hard way; each has a rule you can copy.

## 1. The optional-translator pattern for library code

Problem: pure library modules (`lib/alerts.ts`) build English sentences in code, and the
unit tests assert those exact strings. Translating the module breaks the tests; leaving
it English leaks the source language into the UI.

Pattern: the function takes an optional translator as the last parameter. No translator
passed (tests, defaults) returns the English literals. A translator passed (pages,
actions) returns keyed, interpolated text.

```ts
export type Tr = (key: string, vars?: Record<string, string | number>) => string;

export async function alerts(db: Db, role: Role, tr?: Tr): Promise<Alert[]> {
  // msg = English literal when no translator (tests), dictionary key otherwise
  const msg = (en: string, key: string, vars = {}) => (tr ? tr(key, vars) : en);
  add({ title: msg("Leads waiting past the red time", "cmd.alert.pastRed") });
}
```

Plurals: use two keys (`.one` / `.many`) chosen with `n === 1`, never string-concatenate
an "s" — it dies on Italian and every Slavic language immediately.

## 2. The byte-identical fallback rule

If a dictionary value replaces a string the tests (or e2e, or axe accessibility checks)
assert on, the English dictionary value must be **byte-identical** to the original
literal. "1 notification sent" instead of "notified 1" changed the line wrapping of a
run log and tripped an accessibility contrast heuristic nobody associated with i18n.
Rewording an English fallback is a behavior change; treat it like one.

## 3. Translating strings that live in the database

Seed and user data ("Instagram", "Price", workflow names, categories) are English strings
in rows. Never migrate the DB to translate it — customers rename rows, and comparisons
in code (`category !== "Client work"`) depend on the stored value.

Pattern: exact-match render-time maps with graceful fallback. Known English seeds map to
dictionary keys; anything else (the customer's own text) renders exactly as stored:

```ts
const REASONS = { Price: "reason.price", Timing: "reason.timing" } as const;

export function seedLabel(t: (k: string) => string, map: Record<string, string>, label: string): string {
  const key = map[label];
  if (!key) return label;          // user-renamed or custom: show as stored
  const s = t(key);
  return s === key ? label : s;    // key missing from dictionary: show as stored
}
```

The checker can't see these lookups (they're dynamic), so keep the maps beside the
dictionary files and review them together.

## 4. Locale plumbing without URL segments

Internal tools don't want `/en/...` in every URL. A cookie set by a server action, read
in the root layout, is enough: `getLocale()` for server components, a `LocaleProvider`
context set once by the layout plus a `useT()` hook for client components. No prop
threading. One merged dictionary per locale (`{ ...core, ...namespaces }`), built once
in a module both server and client import.

## 5. Things the checker cannot catch (grep for these in review)

- Dynamic keys the template-prefix heuristic misses: `t(KIND_LABEL[x] ?? x)` — keep the
  map's values as dictionary keys and translate at the map, not after it.
- Dictionary values containing HTML entities (`&apos;`) — they render literally; use real
  characters, including real apostrophes for Italian (`dell'offerta`).
- Locale-dependent formatters: `fmtDays(d, unit)` beats baking "days" into the formatter;
  chart components should take a `format` function rather than a currency suffix glued to
  a number (`7,500€` vs `€7,500` in the same view — the classic inconsistency).
- `"use client"` must stay line 1 of client files; an import inserted above it breaks the
  build, and it is always the i18n import that ends up there first.
