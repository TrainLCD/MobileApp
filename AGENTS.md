# Repository Guidelines

This handbook defines how automation agents collaborate safely and effectively on the TrainLCD mobile application. Follow these instructions for every bot- or AI-assisted contribution, regardless of scope.

## Operating Principles for Automation Agents

- **Honor instruction priority:** repository owners & maintainers → latest task prompt → this handbook → other documentation. Surface conflicting requirements immediately.
- **Preserve the working tree:** operate on the current snapshot, never discard user changes, and avoid destructive commands (`git reset --hard`, `git clean -fd`, etc.).
- **Favor minimal, auditable diffs:** prefer additive edits, keep formatting deterministic, and annotate non-obvious changes with concise comments.
- **Document reproducibility:** record every manual command you execute and note any local assumptions about environment variables or credentials.
- **Validate assumptions proactively:** confirm tool versions, workflow expectations, and environment needs instead of relying on cached knowledge.
- **Clarify uncertainty:** request guidance or leave TODO notes rather than guessing at intent.

## Standard Workflow

1. **Intake:** read the full issue, PR discussion, or prompt; restate deliverables and constraints before coding.
2. **Reconnaissance:** map relevant files with `rg`, `ls`, or `find`; review interfaces and existing patterns to plan compatible changes.
3. **Plan:** outline discrete steps, keep the plan updated as you progress, and expose blockers early.
4. **Implement:** use `apply_patch` for targeted edits, commit in small logical units, and avoid regenerating large files unless required.
5. **Validate:** run only the necessary commands (`pnpm lint`, `pnpm test`, `pnpm typecheck`, etc.) and capture summarized output.
6. **Document & Handoff:** update READMEs or docs when behavior changes, summarize modifications, list executed commands, and attach artifacts (logs, screenshots) before opening PRs.

## Repository Map

- `src/`: Expo React Native app code.
  - `src/components/`, `src/screens/`: UI components and screen containers.
  - `src/hooks/`, `src/store/`, `src/stacks/`: shared state, navigation, and composition hooks.
  - `src/lib/`, `src/providers/`, `src/config/`: integrations, context providers, configuration utilities.
  - `src/constants/`, `src/utils/`, `src/translation.ts`, `src/lineSymbolImage.ts`: constants, helpers, localization maps, and asset selectors.
  - `@types/`, `src/__mocks__/`, `src/__fixtures__/`, `test/`: global typings, reusable mocks, fixtures, and test helpers.
- `assets/`: static media (images, fonts, icons).
- `docs/`: human-facing documentation including changelog and incident notes.
- `utils/`: developer tooling scripts such as GraphQL codegen config.
- `android/`, `ios/`: native projects managed via Fastlane.
- `functions/`: Firebase Cloud Functions.

## Tooling & Environment Expectations

- Target **Node.js 20.x** and **pnpm 10.x**; use the globally installed pnpm (Corepack is unnecessary).
- Run `pnpm install` when dependencies shift; avoid re-locking packages unless instructed.
- Metro cache issues: run `expo start --clear` only when debugging build failures and document the action.
- For native builds, rely on project scripts (`pnpm android`, `pnpm ios`) rather than invoking Fastlane directly.
- GraphQL codegen requires `GQL_API_URL` in `.env.local`; run `pnpm gql:codegen` after document or schema updates.

## Build, Test & Development Commands

- `pnpm start`: start the Expo Dev Client locally.
- `pnpm android` / `pnpm ios`: build native binaries through Fastlane lanes.
- `pnpm web`: run the web preview.
- `pnpm lint`: execute Biome linting (`biome ci ./src` in CI).
- `pnpm format`: apply Biome formatting fixes.
- `pnpm test`: run Jest in UTC; add `--watch` or `--runInBand` for debugging.
- `pnpm test --updateSnapshot`: refresh Jest snapshots when output diffs are intentional.
- `pnpm typecheck`: enforce TypeScript constraints.
- `pnpm gql:codegen`: regenerate generated GraphQL types.

## Coding Style & Naming Conventions

- `.editorconfig` enforces UTF-8, two-space indentation, single quotes, and ES5 trailing commas.
- Biome is authoritative; avoid `// biome-ignore` unless a rule is truly incompatible and document the rationale inline.
- Components → PascalCase (`StationBanner.tsx`); hooks → `use*` (`useStationFeed.ts`); Zustand stores → `*Store.ts`; GraphQL operations → `FeatureVerbQuery`.
- Co-locate style modules or constants near their consumers; share cross-cutting utilities through `src/utils/`.
- Keep comments purposeful: explain intent or non-obvious constraints, not obvious mechanics.

## Testing Strategy

- Jest global setup lives in `jest.setup.js` and `src/setupTests.ts`.
- Co-locate unit tests as `.test.ts` or `.test.tsx` siblings to the module.
- Reuse helper utilities from `src/utils/test/` to avoid duplicate setup code.
- Mock network and Firebase layers with `jest.mock`, and call `jest.clearAllMocks()` in `afterEach`.
- For integration flows, extend `src/test/e2e.ts` and prefer fixtures from `src/__fixtures__/`.
- When modifying behavior, update or add tests in the same change set; document skipped tests with TODOs and owner rationale.

## Commit & Pull Request Protocol

- Commit messages must be single-sentence statements in Japanese (e.g., `テレメトリー送信機をリファクタリングしてnull状態を回避`); prefix production hot fixes with `Hotfix:`.
- Keep commits logically scoped (implementation, tests, docs) and mention generated artifacts in the description.
- Pull requests must include:
  - Purpose and summary of key changes.
  - Regression risk assessment and mitigation.
  - Commands executed locally (e.g., `pnpm lint && pnpm test && pnpm typecheck`).
  - Linked issues or tickets.
  - Screenshots or recordings for UI/UX deltas with device names (e.g., Pixel 8, iPhone 15 Pro).
- If CI fails, pause reviews until you add root-cause notes plus reproduction steps or open an issue for blocking infrastructure problems.

## Security & Configuration Guardrails

- Store secrets in `.env.local`; treat `.env` as the template, and keep `.env.example` synchronized for onboarding.
- Never commit credentials, access tokens, or production endpoints.
- Reuse existing GitHub Actions secret names (e.g., `FONTS_SSH_KEY`) to avoid drift.
- Protect Expo and Fastlane credentials with 2FA and rotate access when automations change.
- After dependency upgrades (`pnpm up --interactive`) or Expo SDK migrations, run `expo-doctor`, `pnpm lint`, `pnpm test`, and `pnpm typecheck`, then capture results in `docs/changelog.md`.

## Automation Checklists

**Before submitting code changes**

- [ ] Confirm requirements and flag conflicts.
- [ ] Update or add tests relevant to code changes.
- [ ] Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`; record summaries.
- [ ] Update documentation (README, docs/, inline comments) if behaviors shift.
- [ ] Capture screenshots/video for UI changes with device labels.

**For documentation-only tasks**

- [ ] Ensure docs match current directory structure and script names.
- [ ] Update cross-references (README, docs/) to prevent drift.
- [ ] Spell-check or self-review for clarity and typos.

**For workflow, release, or CI updates**

- [ ] Cross-check `.github/workflows/` and Fastlane lanes for consistency.
- [ ] Provide dry-run instructions or environment prerequisites.
- [ ] Document required secrets, environment variables, or service accounts.

## Communication & Incident Reporting

- Surface blockers or ambiguities in the task thread; do not proceed on assumptions.
- When discovering regressions or flaky tests, open an issue with reproduction steps and assign the relevant code owner.
- After incidents or hot fixes, append learnings to `docs/changelog.md` and notify maintainers for follow-up.
