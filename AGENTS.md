# Repository Guidelines

How automation agents work on the TrainLCD mobile app. Instruction priority: repository owners & maintainers → latest task prompt → this handbook → other documentation. Raise conflicts when you see them.

## Operating Principles

- **Never discard user work.** See [Version Control (Git)](#version-control-git).
- **Stay inside what was approved.** An approval covers the change that was described, not the wording, naming, structure, or history around it. Propose adjacent cleanups separately.
- **Find out why existing code is there before changing it.** For any constant, threshold, guard, or branch you change, read its comment, `git blame` it, and read the introducing commit and PR. State which past decision your change narrows, widens, or reverses. Values introduced together in one fix (a filter and its escape hatch, a cap and its fallback) move together. Derive a new value from the widest case the code path can observe, and check what feeds the condition: `stationState.station` is the last *arrived* station, so a subway branch keeps running through a through-service on another operator's line.
- **Check that what a branch points at really exists.** Before changing a platform branch, feature gate, or guidance copy, confirm its target exists on each platform. When one side of a platform pair is removed, re-validate the side you keep. Copy that names a device setting, screen, or menu path is a factual claim about that platform.
- **A failing existing test is evidence against your change.** Fix the change, not the test. Relax or rewrite the test only when the user has agreed to drop that guarantee. When both are worth keeping, narrow the change and add a regression test that pins the value you chose.
- **Split shared state when you split what it describes.** When you add a second reference, cache, counter, or flag beside an existing one, decide for each piece of existing state which side owns it. Read your diff twice: once for whether it does what you intended, once for what it breaks.
- **Fix the defects you find in your own proposal before proposing it.** If the fix needs a trade-off only the user can decide, present the options with a recommendation.
- **Ask instead of guessing intent.** If a review comment can be read two ways and you are about to change code or text because of it, ask which reading is meant first.
- **Prefer correctness and performance over speed.** Consider edge cases and hot paths.

## Workflow

- Validate with `npm run lint`, `npm test`, and `npm run typecheck` as needed, and summarize the results.
- When behavior changes, update tests and docs (README, docs/, inline comments) in the same change set.

### Commit and push gate

- Before every commit or push that contains code changes, run `npm run lint` and the relevant unit tests, and confirm both succeed. Run `npm test` when you cannot narrow the scope with confidence.
- If either fails, do not commit or push. Fix it and rerun, or report the blocker.
- CI after a push is not a substitute for local validation.

### Publishing gate

docs/・README・PR のタイトルと本文・レビュー返信・issue（他リポジトリのものを含む）は、投稿した時点で取り消せない公開物になる。リポジトリは公開されていて、書いた内容は作者の設計判断として読まれる。

- 書いてよいのは、リポジトリのコードと設定、実際に取得した一次情報（原文・仕様書）、メンテナの回答のいずれかに辿れる内容だけ。記憶から書いた製品仕様・ストアの審査要件・条文の要旨は、原文を当たるまで書かない。引用・日付・条文は要約でなく原文から取る。
- 自分たちのアプリ・基盤・ポリシーについて「未確認」「〜かもしれない」と書かない。ソースで確定できることは読んで確定させ、できないことは書かずにタスクスレッドで聞く。答えを待っている間は、その答えに依存する記述を公開しない。
- コードから言えること（「ルータに定義が無い」）と運用の結果（「リクエストが届いていない」）を混同しない。確かめた方だけを書く。
- サーバの設置場所やネットワーク構成は、公開済みのプライバシーポリシーと同じ粒度に留める。
- レビューボットの指摘は、コードや原文で裏を取ってから従う。違う対応を採るなら理由を返信に書く。
- 公開済みの文に誤りを見つけたら、どの記述が・なぜ問題で・どう直すかをタスクスレッドで報告する。訂正の push・編集・投稿は、メンテナの指示を得てから行う。

### 日本語の文体

日本語で書く公開物が対象。英語の構文をそのまま移した文にしない。敬体（です・ます）で統一する。

- 一文一義で切る。読点が3つを超えたら分割を検討する。
- 無生物を主語にしない。「この変更が効く前提は確定していない」ではなく、何が起きるかを人や物事の動きで書く。
- 「効く」「回す」「刺さる」「見る」のような多義的な動詞を避け、何が起きるのかを書く。
- 「〜の可否の判断」のようにサ変名詞を重ねず、動詞で書く。
- 「つまり」「ただし」「なお」を段落ごとに置かない。括弧の中で3つ以上列挙しない。

```text
Before: つまり要求精度は失敗理由になりません（粗い値でも返る）。地下で fix 自体が
        取れない間は "timely manner" に該当せずエラーになり、補完測位は毎回失敗して
        10秒後にまた同じことを繰り返します。

After:  精度が足りないことは失敗の理由になりません。粗い値でも返してくれます。
        問題は fix そのものが取れないときで、地下ではこれに当たってエラーになります。
        補完測位は10秒おきに同じことを繰り返すだけです。
```

## Repository Map

- `src/`: Expo React Native app (`components/`, `screens/`, `hooks/`, `store/`, `stacks/`, `lib/`, `providers/`, `config/`, `constants/`, `utils/`, `translation.ts`, `lineSymbolImage.ts`).
- `@types/`, `src/__mocks__/`, `src/__fixtures__/`: typings, mocks, fixtures.
- `assets/`: media. `assets/gpx/` holds developer-only GPX fixtures that app code does not `require()`.
- `docs/`: documentation, changelog, incident notes. `utils/`: developer scripts such as GraphQL codegen config. `android/`, `ios/`: native projects.
- The Cloudflare Workers backend (TTS, session issuance, feedback triage, review notifiers, AI destination agent) lives in [TrainLCD/functions](https://github.com/TrainLCD/functions). The GraphQL API used by `src/lib/gql.ts` (`gql.trainlcd.app` / `gql-stg.trainlcd.app`) is [TrainLCD/StationAPI](https://github.com/TrainLCD/StationAPI); schema and resolver changes go there. [TrainLCD/BFF](https://github.com/TrainLCD/BFF) is archived; do not send anyone there.

## Tooling & Commands

- Node.js 24.x and npm 11.x, matching `.nvmrc`. Keep `.github/workflows/` on the same major, or `npm ci` can fail on a runner with an older npm.
- Run `npm install` when dependencies change; do not re-lock packages unless asked.
- `npm run start` (Expo Dev Client), `npm run android` / `npm run ios` (native builds), `npm run web`.
- `npm run lint` (Biome), `npm run format`, `npm test` (Jest in UTC; `-- --updateSnapshot` for intentional snapshot changes), `npm run typecheck`.
- `npm run gql:codegen` after GraphQL document or schema changes; it needs `GQL_API_URL` in `.env.local`.
- Use `expo start --clear` only when debugging build failures, and say that you did.

## Coding Style

- `.editorconfig`: UTF-8, two spaces, single quotes, ES5 trailing commas. Biome is authoritative; use `// biome-ignore` only with an inline reason.
- Naming: components PascalCase, hooks `use*`, Jotai atoms in `store/atoms/*.ts`, GraphQL operations `FeatureVerbQuery`.
- Comments explain intent or non-obvious constraints, not mechanics. Co-locate styles and constants with their consumers; share cross-cutting helpers via `src/utils/`.
- Jotai state lives in field-level atoms (`arrivedAtom`, `headerStateAtom`, …); subscribe to those. The default-exported `stationState` / `navigationState` / `lineState` are write-compatible facades that re-render on every field change. See `docs/state-management.md`.
- Hooks that subscribe to high-frequency atoms (`locationAtom` updates every second while riding) must not run in a screen body. Host each in its own renderless `Fx*` component (`MainScreenEffects` in `src/screens/Main.tsx`, `PermittedLayoutEffects` in `src/components/Permitted.tsx`), and gate platform- or setting-specific ones by mounting their host conditionally (`FxTTS`, `FxUpdateLiveActivities`). Subscribe to narrow derived atoms such as `pictureInPictureEnabledAtom` / `pictureInPictureActiveAtom` rather than the whole object.
- StrictMode re-runs effects in development, so mount-time effects must be repeatable. Never call the unkeyed `showDialog` from `useEffect` or async work it starts; use `showDialogWhilePresenting` from `src/utils/dialogPresentation.ts`. Event handlers such as `onPress` may call `showDialog` directly. An effect that writes shared state in cleanup must correspond to a real lifecycle event (e.g., navigation `beforeRemove`).

### Markdown (docs/, README, .claude/skills/\*\*/SKILL.md)

`markdownlint-cli2` 準拠（CodeRabbit も同ルールで指摘する）。

- MD040: フェンスには言語を付ける（平文・図は `text`、シェルは `bash`、差分は `diff`、テンプレは `markdown`、データは `json` / `yaml`）。
- MD038: インラインコードの内側の先頭・末尾に空白を入れない。
- MD031 / MD032: フェンスとリストの前後に空行を入れる。
- MD029: 順序リストの番号付けはファイル内で統一する。
- MD033: HTML タグを使わない。`<details><summary>` と表セル内の `<br>` のみ可。

## Testing

- Global setup: `jest.setup.js`, `src/setupTests.ts`. Co-locate tests as `.test.ts(x)`. Reuse helpers in `src/utils/test/` and fixtures in `src/__fixtures__/`; extend `src/test/e2e.ts` for integration flows.
- Mock network and backend layers with `jest.mock` and call `jest.clearAllMocks()` in `afterEach`.
- Document skipped tests with a TODO and the reason.

## Version Control (Git)

- **Preserve uncommitted work.** Never run `git reset --hard`, `git clean -fd`, or a bare `git restore .` / `git checkout -- .` on your own initiative. To set work aside, use a temporary WIP commit rather than `git stash`; the stash stack is shared with every worktree.
- **Stage deliberately.** Read `git status` and `git add <path>...`; do not use `git add -A`.
- **Do not rewrite published history.** `git push --force` is prohibited. If a push is rejected, `git fetch` and re-examine. `--force-with-lease` only on a topic branch you own, with the user's explicit approval of that push.
- **Recovery** uses `git reflog` plus a rescue branch (`git branch <rescue> <sha>`). It reaches committed history only. Show the user the entry you intend to move to and get approval before rewinding anything.
- **Release tags are annotated** (`git tag -a`), matching the release workflow. See `.claude/skills/publish-release/SKILL.md`.
- **Server-side writes through the GitHub API** are allowed only for the PR-screenshot assets in `.claude/skills/create-pr/SKILL.md` (orphan branch `assets/pr-screenshots`), and only while all of these hold: the branch carries assets and no application code; it is never merged into `dev` or `master`; published paths are content-addressed, immutable, and never overwritten; and the user approves the write beforehand. Anything touching application code goes through a local commit and a PR.

## Commit & Pull Request Protocol

- git-flow: `feature/*`, `fix/*`, `release/*` from `origin/dev`; `hotfix/*` from `origin/master`. No tool-specific prefixes such as `agent/*`. Branch with `git switch -c <name> origin/<base>`.
- Commit messages are single Japanese sentences (e.g., `テレメトリー送信機をリファクタリングしてnull状態を回避`); prefix production hot fixes with `Hotfix:`. Keep commits logically scoped.
- PRs follow `.github/pull_request_template.md` without adding or removing sections, open as ready for review (Draft only on request), and are assigned to `@TinyKitten`.
- PR bodies include purpose and key changes, regression risk and mitigation, commands run locally, linked issues, and visual evidence for UI changes. Label each image with its source: a device name (e.g., Pixel 8), React Native Web, or an explicit note that it is a mockup and not a rendering of the implementation. With no image, state why.
- Mockups of existing UI are read as the spec. For anything that varies by line, theme, or train type (numbering shape, palette, train-type badge, pass/stop treatment), trace what decides it and use the value for the depicted case. Numbering shape comes from the API's `lineSymbolShape`; `src/__fixtures__/station.ts` lists the pairs (JR East `JA` / `JB` / `JC` / `JO` / `JS` / `JY` are `SQUARE`; Tokyo Metro and Toei are `ROUND`). If you cannot confirm a value, depict a case without that element.
- Canary promotion PRs (`dev` → `canary`) need no further review; merge once required CI passes and the PR is mergeable.
- If CI fails, pause reviews until you add root-cause notes and reproduction steps, or open an issue for infrastructure problems.
- **Keep PR metadata in sync with the branch state.** After pushing to an open PR, refresh the body (`変更の種類`, `変更内容`, test results) while preserving human-written prose unless the change invalidates it. If the title no longer covers the scope, propose a new one and apply it with `gh pr edit --title` after approval.

## Security & Incidents

- Secrets go in `.env.local` (template: `.env.example`). Never commit credentials, tokens, or production endpoints. Protect Expo credentials with 2FA.
- After dependency upgrades or Expo SDK migrations, run `expo-doctor`, `npm run lint`, `npm test`, `npm run typecheck`, and record the results in `docs/changelog.md`.
- Open an issue with reproduction steps for regressions or flaky tests. After incidents or hot fixes, append learnings to `docs/changelog.md`.
