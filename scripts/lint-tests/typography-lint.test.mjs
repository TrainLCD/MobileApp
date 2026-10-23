import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const biome = join(root, 'node_modules/@biomejs/biome/bin/biome');
const cases = [
  ['named Text', "import { Text } from 'react-native';", false],
  ['aliased Text', "import { Text as RNText } from 'react-native';", false],
  ['namespace import', "import * as RN from 'react-native';", false],
  ['default import', "import RN from 'react-native';", false],
  ['re-export', "export { Text } from 'react-native';", false],
  ['require', "const { Text } = require('react-native');", false],
  ['dynamic import', "const RN = await import('react-native');", false],
  ['other primitives', "import { View, Animated } from 'react-native';", true],
  [
    'text types',
    "import type { TextProps, TextStyle, TextInstance } from 'react-native';",
    true,
  ],
  ['SVG text', "import { Text } from 'react-native-svg';", true],
  ['Typography', "import Typography from './components/Typography';", true],
  [
    'primitive implementation',
    "import { Text } from 'react-native';",
    true,
    'src/components/Typography.tsx',
  ],
  [
    'test harness',
    "import { Text } from 'react-native';",
    true,
    'src/hooks/example.test.tsx',
  ],
  [
    'documented exception',
    "// biome-ignore lint/style/noRestrictedImports: Configure native Text defaults.\nimport { Text } from 'react-native';",
    true,
  ],
];

for (const [name, source, allowed, path = 'src/Example.tsx'] of cases) {
  test(`Typography lint: ${name}`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'typography-lint-'));
    try {
      copyFileSync(join(root, 'biome.json'), join(directory, 'biome.json'));
      const fixture = join(directory, path);
      mkdirSync(dirname(fixture), { recursive: true });
      writeFileSync(fixture, `${source}\n`);
      const result = spawnSync(
        process.execPath,
        [biome, 'lint', path, '--reporter=json'],
        {
          cwd: directory,
          encoding: 'utf8',
        }
      );
      assert.ifError(result.error);
      const report = JSON.parse(result.stdout);
      const diagnostics = report.diagnostics.filter(
        (diagnostic) => diagnostic.category === 'lint/style/noRestrictedImports'
      );
      // Other rules may report unused fixture imports. Inspect the actual configured
      // restriction, including warnings, rather than inferring it from the exit code.
      assert.equal(
        diagnostics.length,
        allowed ? 0 : 1,
        result.stdout + result.stderr
      );
      if (!allowed) {
        assert.equal(result.status, 1);
        assert.equal(diagnostics[0].severity, 'error');
        assert.match(JSON.stringify(diagnostics[0]), /Use Typography/);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
