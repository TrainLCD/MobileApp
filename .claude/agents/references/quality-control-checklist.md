## Quality control checklist

The `quality_control` field in the output JSON must follow this structure. Report the linter/formatter actually configured in the project via `tool` — in this repository that is **Biome** for both (`npm run lint` / `npm run format`, config `biome.json`):

```json
{
  "linting": { "tool": "biome", "config": "biome.json", "run_command": "npm run lint", "fix_command": "npx biome check --write ./src" },
  "formatting": { "tool": "biome", "config": "biome.json", "run_command": "npm run format" },
  "type_checking": { "typescript": true, "strict_mode": true, "run_command": "npm run typecheck" },
  "unit_tests": { "jest": true, "jest_config": "path", "run_command": "npm test", "watch_command": "npm test -- --watch", "coverage_command": "npm test -- --coverage" },
  "e2e_tests": { "detox": false, "maestro": false, "xctest": false, "flutter_integration_test": false },
  "feedback_loop_tools": { "metro_hot_reload": true, "flutter_hot_reload": false, "react_devtools": true, "flipper": false, "storybook": false, "notes": "string" }
}
```

The values above are examples — fill in what the inspected project actually uses (`tool` may be `"eslint"`, `"swiftlint"`, `"none"`, etc. on other projects).

Look for these beyond the obvious lint/test configs, regardless of project type:

**Immediate feedback tools (agent can trigger during a task):**

- `tsc --noEmit` — instant type error feedback after edits (TypeScript projects)
- `biome check --write` / `eslint --fix` / `swiftlint` / `ktlint` — auto-fixable lint errors
- `jest --testPathPattern <file>` — single test file (JS/TS projects)
- `dart analyze` — static analysis (Flutter projects)
- `flutter test <file>` — single test file (Flutter projects)
- `yarn test --watch` / `flutter test --watch` — reactive test runner
- Metro hot reload (via `debugger-reload-metro` Argent tool, RN only)
- Flutter hot reload / hot restart

**Slower validation tools (agent runs at end of a task):**

- Full test suite run (`jest`, `flutter test`, `xcodebuild test`, `gradle test`)
- E2E: Detox, Maestro, XCUITest, Espresso, Flutter integration tests
- `eas build --local` / `flutter build` / `xcodebuild` for native validation

**Indicators to check (all project types):**

- `scripts/` directory at project root — often contains custom validation scripts
- `Makefile` / `Fastfile` targets — look for `lint`, `test`, `typecheck`, `check`, `validate`
- `package.json` scripts named `check`, `verify`, `ci`, `precommit`, `prepush`
- `.husky/` directory — which hooks run and what they execute
- `lint-staged` config — what runs on commit
- CI config files — the CI steps are ground truth for what "passing" means
- `Podfile` / `Package.swift` — iOS dependency management
- `build.gradle` / `build.gradle.kts` / `settings.gradle` / `settings.gradle.kts` — Android build config and flavor definitions (Groovy or Kotlin DSL)
- `pubspec.yaml` / `analysis_options.yaml` — Flutter project config and lint rules
