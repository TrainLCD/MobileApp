import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkAnimatedText } from '../lint-animated-text.mjs';

const invalid = [
  "import { Animated } from 'react-native'; const Motion = Animated; const x = <Motion.Text />;",
  "import { Animated } from 'react-native'; function f() { const A = Animated; const B = A; return <B.Text />; }",
  "const { Animated } = require('react-native'); const x = <Animated.Text />;",
  "const { Animated: Motion } = require('react-native'); const x = Motion['Text'];",
  "const RN = require('react-native'); const Motion = RN.Animated; const x = <Motion.Text />;",
  "const { default: Motion } = require('react-native-reanimated'); const x = <Motion.Text />;",
  "import { Animated } from 'react-native'; const x = <Animated.Text />;",
  "import { Animated as Motion } from 'react-native'; const x = <Motion.Text>Hi</Motion.Text>;",
  "import Animated from 'react-native-reanimated'; const x = Animated.Text;",
  "import Motion from 'react-native-reanimated'; const x = Motion['Text'];",
  "import { default as Motion } from 'react-native-reanimated'; const x = Motion?.Text;",
  "import * as RN from 'react-native'; const x = RN.Animated.Text;",
  "import * as R from 'react-native-reanimated'; const x = R.default.Text;",
  "import { Animated } from 'react-native'; const { Text: NativeText } = Animated;",
];
for (const source of invalid) {
  test(`rejects ${source}`, () => {
    const diagnostics = checkAnimatedText(source);
    assert.ok(diagnostics.length > 0);
    assert.match(diagnostics[0].message, /Use AnimatedTypography/);
    assert.equal(diagnostics[0].line, 1);
    assert.ok(diagnostics[0].column > 1);
  });
}

const valid = [
  'const A = B; const B = A; const x = A.Text;',
  "function f(require) { const { Animated } = require('react-native'); return Animated.Text; }",
  "const { Animated } = require('another-library'); const x = Animated.Text;",
  "import { Animated } from 'react-native'; const Motion = Animated; function f(Motion) { return Motion.Text; }",
  "import { Animated } from 'react-native'; const x = <Animated.View />;",
  "import Animated from 'react-native-reanimated'; const x = <Animated.View />;",
  "import AnimatedTypography from './AnimatedTypography'; const x = <AnimatedTypography />;",
  "import { Animated } from 'react-native'; const x = Animated.createAnimatedComponent(Typography);",
  "import { Animated } from 'react-native'; function f(Animated) { return Animated.Text; }",
  "import { Animated } from 'another-library'; const x = Animated.Text;",
  "import { Animated } from 'react-native'; // Animated.Text\nconst x = 'Animated.Text';",
];
for (const source of valid) {
  test(`allows ${source}`, () =>
    assert.deepEqual(checkAnimatedText(source), []));
}

test('CLI fails on application code and excludes test harnesses and mocks', () => {
  const directory = mkdtempSync(join(tmpdir(), 'animated-text-lint-'));
  const script = fileURLToPath(
    new URL('../lint-animated-text.mjs', import.meta.url)
  );
  try {
    mkdirSync(join(directory, 'src/__mocks__'), { recursive: true });
    writeFileSync(join(directory, 'src/example.test.tsx'), invalid[0]);
    writeFileSync(join(directory, 'src/__mocks__/example.tsx'), invalid[0]);
    const run = () =>
      spawnSync(process.execPath, [script], {
        cwd: directory,
        encoding: 'utf8',
      });
    assert.equal(run().status, 0);
    writeFileSync(join(directory, 'src/example.tsx'), invalid[0]);
    const result = run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /example\.tsx:1:\d+: Use AnimatedTypography/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
