# Phase 1: Lint Rules

Run once at the project root. Catches mechanical issues deterministically.
This repository uses **Biome** as its linter and formatter (`biome.json` at the project root) — use the project's `npm run lint` script (`biome check ./src`). Do not introduce ESLint or a temporary ESLint config.

## Rules

Performance-relevant checks Biome covers:

| Rule                                           | Catches                                             |
| ---------------------------------------------- | --------------------------------------------------- |
| `lint/suspicious/noArrayIndexKey`              | `key={index}` - incorrect reconciliation on reorder |
| `lint/correctness/useExhaustiveDependencies`   | Missing/incorrect hook dependency arrays            |
| `lint/correctness/useHookAtTopLevel`           | Hooks called conditionally or in loops              |
| `lint/suspicious/noEmptyBlockStatements`       | Empty catch blocks - swallowed errors               |

Checks with **no Biome equivalent** — do not bolt ESLint back on for these; they are reviewed by hand in Phase 2 (see [semantic-checklist.md](semantic-checklist.md)):

- Object/array/function literals or JSX elements as JSX props (new ref every render)
- `.bind()` in JSX props, object/array literals as Context `value`
- Components defined inside render (full remount each render)
- Inline `style={{}}`, unused StyleSheet rules, color literals, single-element style arrays

## Procedure

1. Confirm the Biome config (`biome.json`) exists and note which rule groups are enabled.
2. Run `npm run lint` from the project root, or `npx biome check --reporter=json ./src` for machine-readable output.
3. Parse output into: `file:line -> rule -> message`.
