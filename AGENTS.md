# Repository Guidelines

This handbook defines how automation agents collaborate safely and effectively on the TrainLCD mobile application. Follow these instructions for every bot- or AI-assisted contribution, regardless of scope.

## Operating Principles for Automation Agents

- **Honor instruction priority:** repository owners & maintainers → latest task prompt → this handbook → other documentation. Surface conflicting requirements immediately.
- **Preserve the working copy:** operate on the current snapshot, never discard user changes, and avoid destructive commands (`jj abandon`, a bare `jj restore`, and any `git reset --hard` / `git clean -fd`). `jj op restore` rewinds the whole repository, so it is **forbidden as a normal operation** — it is available for recovery only, and only with the user's explicit approval of that specific rollback. See [Version Control (Jujutsu)](#version-control-jujutsu).
- **Favor minimal, auditable diffs:** prefer additive edits, keep formatting deterministic, and annotate non-obvious changes with concise comments.
- **Document reproducibility:** record every manual command you execute and note any local assumptions about environment variables or credentials.
- **Validate assumptions proactively:** confirm tool versions, workflow expectations, and environment needs instead of relying on cached knowledge.
- **Clarify uncertainty:** request guidance or leave TODO notes rather than guessing at intent.
- **Prioritize quality and performance over speed:** prefer well-structured, performant implementations over quick solutions. Take extra time to consider edge cases, optimize hot paths, and ensure code correctness rather than rushing to deliver.

## Standard Workflow

1. **Intake:** read the full issue, PR discussion, or prompt; restate deliverables and constraints before coding.
2. **Reconnaissance:** map relevant files with `rg`, `ls`, or `find`; review interfaces and existing patterns to plan compatible changes.
3. **Plan:** outline discrete steps, keep the plan updated as you progress, and expose blockers early.
4. **Implement:** use `apply_patch` for targeted edits, commit in small logical units, and avoid regenerating large files unless required.
5. **Validate:** run only the necessary commands (`npm run lint`, `npm test`, `npm run typecheck`, etc.) and capture summarized output.
6. **Document & Handoff:** update READMEs or docs when behavior changes, summarize modifications, list executed commands, and attach artifacts (logs, screenshots) before opening PRs.

### Commit and push gate

- **Do not commit or push unvalidated code on your own initiative.** Before
  every commit or push that contains code changes, run both `npm run lint` and
  the relevant unit tests, and confirm that both commands succeed. Run
  `npm test` when the relevant test scope cannot be narrowed with confidence.
- If either lint or unit tests fail, do not commit or push. Fix the failure and
  rerun the checks, or stop and report the blocker to the repository owner.
- Do not treat CI after a push as a substitute for local validation before the
  commit or push.

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
- `android/`, `ios/`: native projects.

> The Cloudflare Workers backend (TTS, session issuance, feedback triage via Workers AI, review notifiers) has been moved out of this repository into [TrainLCD/functions](https://github.com/TrainLCD/functions); the GraphQL BFF lives separately in [TrainLCD/BFF](https://github.com/TrainLCD/BFF). The former `functions/` directory no longer lives here.

## Tooling & Environment Expectations

- Target **Node.js 24.x** and **npm 11.x**, matching `.nvmrc`. All GitHub Actions workflows pin the same major; keep them in sync when bumping, otherwise a `package-lock.json` generated locally can fail `npm ci` on a runner carrying an older npm.
- Run `npm install` when dependencies shift; avoid re-locking packages unless instructed.
- Metro cache issues: run `expo start --clear` only when debugging build failures and document the action.
- For native builds, rely on project scripts (`npm run android`, `npm run ios`).
- GraphQL codegen requires `GQL_API_URL` in `.env.local`; run `npm run gql:codegen` after document or schema updates.

## Build, Test & Development Commands

- `npm run start`: start the Expo Dev Client locally.
- `npm run android` / `npm run ios`: build native binaries.
- `npm run web`: run the web preview.
- `npm run lint`: execute Biome linting (`biome ci ./src` in CI).
- `npm run format`: apply Biome formatting fixes.
- `npm test`: run Jest in UTC; add `--watch` or `--runInBand` for debugging.
- `npm test -- --updateSnapshot`: refresh Jest snapshots when output diffs are intentional.
- `npm run typecheck`: enforce TypeScript constraints.
- `npm run gql:codegen`: regenerate generated GraphQL types.

## Coding Style & Naming Conventions

- `.editorconfig` enforces UTF-8, two-space indentation, single quotes, and ES5 trailing commas.
- Biome is authoritative; avoid `// biome-ignore` unless a rule is truly incompatible and document the rationale inline.
- Components → PascalCase (`StationBanner.tsx`); hooks → `use*` (`useStationFeed.ts`); Jotai atoms → `store/atoms/*.ts`; GraphQL operations → `FeatureVerbQuery`.
- Jotai state is held in field-level primitive atoms (named exports such as `arrivedAtom`, `headerStateAtom`). Always subscribe to those for reads; the default-exported `stationState` / `navigationState` / `lineState` are write-compatible facades and subscribing to them re-renders on every field change. See `docs/state-management.md`.
- Void side-effect hooks that subscribe to high-frequency atoms (`locationAtom` updates every second while riding) must not be called in a screen component's body. Host them in a renderless effects component instead (`MainScreenEffects` in `src/screens/Main.tsx`, `PermittedLayoutEffects` in `src/components/Permitted.tsx`; one hook per `Fx*` component so per-hook render cost stays measurable). Gate platform- or setting-specific hooks by conditionally mounting their host (`FxTTS`, `FxUpdateLiveActivities`). For objects with high-frequency fields such as `pictureInPictureAtom.activityState`, subscribe the narrow derived atoms (`pictureInPictureEnabledAtom` / `pictureInPictureActiveAtom`) instead of the whole atom. Details in `docs/state-management.md`.
- Co-locate style modules or constants near their consumers; share cross-cutting utilities through `src/utils/`.
- Keep comments purposeful: explain intent or non-obvious constraints, not obvious mechanics.

### React Native side effects under StrictMode

- React StrictMode intentionally re-runs effect setup/cleanup in development. Treat mount-time effects as repeatable, and never rely on an empty dependency array to mean "runs exactly once" for visible side effects.
- Do not call the unkeyed `showDialog` from `useEffect` or from async functions launched by `useEffect`. StrictMode can evaluate the same persisted condition twice before the first dialog is dismissed.
- For automatic dialogs, use `showDialogWhilePresenting` from `src/utils/dialogPresentation.ts`. The keyed presentation layer prevents duplicate dialogs only while the same logical dialog is active or queued, and releases the key after its closing animation completes.
- User-initiated dialogs from event handlers such as `onPress` may call `showDialog` directly when they are not triggered by mount-time or subscription effects.
- If an effect writes shared app state during cleanup, confirm that the cleanup represents a real lifecycle event such as a navigation `beforeRemove`, not only StrictMode's development-only unmount check.

### Markdown documentation (docs/, README, .claude/skills/\*\*/SKILL.md)

`markdownlint-cli2` 準拠。CodeRabbit も同ルールで指摘するため、執筆時点で以下を守る:

- **MD040 (fenced code language)**: フェンスコードブロックには必ず言語指定を付ける。用途別の既定: 平文の図示・実行計画サマリは `text`、シェル例は `bash`、差分は `diff`、埋め込みテンプレ本文は `markdown`、構造化データは `json` / `yaml`。
- **MD038 (no spaces in code spans)**: インラインコード（バッククォート）の内側先頭・末尾に空白を入れない。`` `**v<release_version>**` `` は OK、`` `**v<release_version>** ` `` は NG。
- **MD031 / MD032 (blanks around fences / lists)**: フェンスコードブロック・リストブロックの前後に空行を 1 行入れる。
- **MD029 (ordered list numbering)**: 順序リストの番号付けは単一ファイル内で統一する（全て `1.` で書くか、`1.` `2.` `3.` と逐次番号を振るか）。
- **MD033 (inline HTML)**: Markdown で表現できる構造は HTML タグに落とさない。例外として `<details><summary>…</summary>` と表セル内の `<br>` は許可。

## Testing Strategy

- Jest global setup lives in `jest.setup.js` and `src/setupTests.ts`.
- Co-locate unit tests as `.test.ts` or `.test.tsx` siblings to the module.
- Reuse helper utilities from `src/utils/test/` to avoid duplicate setup code.
- Mock network and backend API layers with `jest.mock`, and call `jest.clearAllMocks()` in `afterEach`.
- For integration flows, extend `src/test/e2e.ts` and prefer fixtures from `src/__fixtures__/`.
- When modifying behavior, update or add tests in the same change set; document skipped tests with TODOs and owner rationale.

## Version Control (Jujutsu)

This repository is managed with **Jujutsu (`jj`)** in a colocated layout: `.jj/` and `.git/` sit side by side, so GitHub, `gh`, and CI keep seeing an ordinary Git repository. **Agents drive version control through `jj`, not `git`.**

- **Never run Git commands that move `HEAD`, the index, or the working copy** — `git switch`, `git checkout`, `git commit`, `git merge`, `git rebase`, `git reset`, `git stash`, `git branch`. In a colocated repo they leave jj's working copy and Git's `HEAD` out of step, and the damage usually surfaces later as a conflict nobody can explain.
- **The only sanctioned Git commands are annotated-tag creation and push** (`git tag -a` / `git push origin <tag>`): `jj tag set` can create lightweight tags only, while the release workflow on GitHub Actions creates annotated ones, and letting the tag type depend on which path ran is a release-metadata hazard. `.claude/skills/publish-release/SKILL.md` records the reasoning.
- **Server-side writes through the GitHub API are a narrow, named exception — not a general escape hatch.** `.claude/skills/create-pr/SKILL.md` uploads PR screenshots to the orphan branch `assets/pr-screenshots` using the Contents and Git Data APIs. This is permitted because it touches no local state — no working copy, no index, no `HEAD`, no `.jj` — so it cannot desync the colocated repo, which is the hazard the rules above exist to prevent. The exception holds only while **all** of these are true: the target branch carries assets and no application code; it is never merged into `dev` or `master`; published paths are content-addressed, immutable, and never overwritten; and the user approves the write beforehand. Any write to a branch that carries application code still goes through jj.
- **Steps under `.github/workflows/` stay on Git.** Runners have `git`, not `jj`; do not convert workflow steps to `jj`.
- **jj snapshots the entire working copy on every command**, including files Git would have left untracked. There is no staging area to act as a filter, so run `jj status` and actually read the list before `jj commit`. Use `jj commit <path>...` when only part of the diff belongs in the commit; the rest stays in the new `@`.
- **Bookmarks are not branches.** A `jj bookmark` does not advance when you create a new commit. After committing, point it at the commit explicitly (`jj bookmark set <name> -r @-`) before pushing, or the push sends stale history.
- **`jj git push` has no `--force`.** It applies a `git push --force-with-lease`-equivalent safety check. If a push is rejected, run `jj git fetch` and re-examine the state instead of reaching for guard-removing flags such as `--ignore-immutable`.
- Recovery is `jj undo` (undoes the last operation) and, for anything further back, `jj op log` to inspect followed by `jj op restore`. **`jj op restore` rewinds the entire repository state, so never run it on your own initiative** — show the user the `jj op log` entry you intend to restore to and get explicit approval for that rollback first. Reversibility is not a licence to run destructive commands in the first place.
- The repo config defines `trunk()` as `dev@origin`, so `jj log` and revsets can use `trunk()` wherever `dev@origin` is meant.

Command mapping — the skills under `.claude/skills/` follow this table:

| Git | jj |
| ---- | ---- |
| `git status` | `jj status` |
| `git add ...` + `git commit -m "..."` | `jj commit -m "..."`（staging なし。パス限定は `jj commit <path>... -m "..."`） |
| `git switch -c <branch>` | `jj new <base>` → 作業 → `jj commit -m "..."` → `jj bookmark create <name> -r @-` |
| `git switch <branch>` | `jj new <bookmark>`（その上で作業）/ `jj edit <rev>`（そのコミットを編集） |
| `git fetch origin --tags` | `jj git fetch`（bookmark と tag の両方を取り込む） |
| `git pull --ff-only origin dev` | `jj git fetch`（追跡中のローカル bookmark はこれで追従する） |
| `git push -u origin <branch>` | `jj git push --bookmark <name>`（新規 bookmark も自動で追跡される） |
| `git push origin --delete <branch>` | `jj bookmark delete <name>` → `jj git push --bookmark <name>` |
| `origin/dev` などのリモート参照 | `dev@origin` |
| `git log --oneline A..B` | `jj log -r 'A..B' --no-graph -T 'commit_id.short() ++ " " ++ description.first_line() ++ "\n"'` |
| `git log --pretty='- %s' A..B` | `jj log -r 'A..B' --no-graph -T '"- " ++ description.first_line() ++ "\n"'` |
| `git diff --name-only A..B` | `jj diff --name-only --from A --to B` |
| `git show <rev>:<path>` | `jj file show -r <rev> <path>` |
| `git rev-parse <rev>` | `jj log -r <rev> --no-graph -T 'commit_id'` |
| `git rev-parse --show-toplevel` | `jj workspace root` |
| `git merge --no-ff <rev>` | `jj new <target> <rev> -m "..."`（マージコミットは即座に作られ、未解決の衝突はコミット内に記録される） |
| `git checkout --ours <paths>` | `jj restore --from <rev> <paths>` |
| `git merge-base --is-ancestor A B` | `jj log -r 'A & ::B'` の出力が空でないこと |
| `git stash` | 不要（`@` をそのまま残し `jj new <base>` で別作業へ移る） |

## Commit & Pull Request Protocol

- Follow git-flow naming for every working bookmark: create `feature/*`, `fix/*`, and `release/*` bookmarks from `dev@origin`, and reserve `hotfix/*` from `master@origin` for urgent production fixes. Do not create tool-specific prefixes such as `agent/*`. A bookmark is created with `jj bookmark create <name> -r @-` once the commit exists — see [Version Control (Jujutsu)](#version-control-jujutsu).
- Commit messages must be single-sentence statements in Japanese (e.g., `テレメトリー送信機をリファクタリングしてnull状態を回避`); prefix production hot fixes with `Hotfix:`.
- Keep commits logically scoped (implementation, tests, docs) and mention generated artifacts in the description.
- Pull requests must follow `.github/pull_request_template.md`; do not add or remove sections from the template without maintainer approval.
- Open pull requests as ready for review by default; use Draft only when the user explicitly requests it.
- Pull requests must be assigned to `@TinyKitten`.
- Canary promotion PRs from `dev` to `canary` contain changes that have already passed review before reaching `dev`. Do not request or wait for an additional human or CodeRabbit review on the Canary PR itself. Once required CI succeeds and the PR is mergeable, the Canary PR may be merged without review approval.
- Pull requests must include:
  - Purpose and summary of key changes.
  - Regression risk assessment and mitigation.
  - Commands executed locally (e.g., `npm run lint && npm test && npm run typecheck`).
  - Linked issues or tickets.
  - Visual evidence for UI/UX deltas, each labeled with where the image came from. Any method is acceptable — a device or simulator capture (label it with the device name, e.g., Pixel 8, iPhone 15 Pro), a React Native Web rendering (`npm run web`), or a mockup / generated image. An image that is not a rendering of the implementation must say so in its label, so a reviewer never mistakes an illustration for observed behavior. If no image is attached, state the reason in that section instead of leaving it blank.
- If CI fails, pause reviews until you add root-cause notes plus reproduction steps or open an issue for blocking infrastructure problems.
- **Keep PR metadata in sync with the bookmark state.** Whenever you push new commits to an open PR, refresh both the PR title and the body:
  - **Title**: re-evaluate whether the current title still describes the full scope of the bookmark. If new commits introduce a subject that the title does not cover, propose an updated title and, once approved by the user, apply it via `gh pr edit --title`.
  - **Body**: update the `変更の種類` checkboxes, the `変更内容` summary, and the test-result section so they reflect the updated diff. Preserve human-authored prose sections (`概要`, narrative added under `変更内容`, `関連Issue`, `スクリーンショット`) unless the changes invalidate them.

## Security & Configuration Guardrails

- Store secrets in `.env.local`; treat `.env.example` as the template for onboarding (copy it to `.env.local` and fill in values).
- Never commit credentials, access tokens, or production endpoints.
- Protect Expo credentials with 2FA and rotate access when automations change.
- After dependency upgrades (`npm update`) or Expo SDK migrations, run `expo-doctor`, `npm run lint`, `npm test`, and `npm run typecheck`, then capture results in `docs/changelog.md`.

## Automation Checklists

**Before submitting code changes**

- [ ] Confirm requirements and flag conflicts.
- [ ] Update or add tests relevant to code changes.
- [ ] Run `npm run lint`, `npm test`, and `npm run typecheck`; record summaries.
- [ ] Update documentation (README, docs/, inline comments) if behaviors shift.
- [ ] Attach visual evidence for UI changes, each labeled with its source (device name, React Native Web, or an explicit "not a rendering of the implementation" note for mockups); when no image is attached, state why instead of leaving the section blank.

**For documentation-only tasks**

- [ ] Ensure docs match current directory structure and script names.
- [ ] Update cross-references (README, docs/) to prevent drift.
- [ ] Spell-check or self-review for clarity and typos.

**For workflow, release, or CI updates**

- [ ] Cross-check `.github/workflows/` for consistency.
- [ ] Provide dry-run instructions or environment prerequisites.
- [ ] Document required secrets, environment variables, or service accounts.

## Communication & Incident Reporting

- Surface blockers or ambiguities in the task thread; do not proceed on assumptions.
- When discovering regressions or flaky tests, open an issue with reproduction steps and assign the relevant code owner.
- After incidents or hot fixes, append learnings to `docs/changelog.md` and notify maintainers for follow-up.
