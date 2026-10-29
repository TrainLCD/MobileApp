import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const project = readFileSync(
  new URL('../ios/TrainLCD.xcodeproj/project.pbxproj', import.meta.url),
  'utf8'
);

const dsymPath = '${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${EXECUTABLE_NAME}';

function inputPaths(script) {
  // Keep quoted strings intact so comment markers inside paths remain values.
  const tokens = (script.match(/"(?:\\.|[^"\\])*"|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_][A-Za-z_0-9]*|[^\s]/g) ?? [])
    .filter((token) => !token.startsWith('//') && !token.startsWith('/*'));
  const key = tokens.indexOf('inputPaths');
  assert.ok(key >= 0, 'Missing inputPaths');
  assert.equal(tokens[key + 1], '=');
  assert.equal(tokens[key + 2], '(');
  const end = tokens.indexOf(')', key + 3);
  assert.ok(end >= 0, 'Unterminated inputPaths');
  return tokens.slice(key + 3, end)
    .filter((token) => token.startsWith('"'))
    .map((token) => JSON.parse(token));
}

for (const [name, script, expected] of [
  ['active input', `inputPaths = ("${dsymPath}",);`, true],
  ['line comment', `inputPaths = (\n// "${dsymPath}",\n);`, false],
  ['block comment', `inputPaths = (/* "${dsymPath}", */);`, false],
  ['output only', `inputPaths = (); outputPaths = ("${dsymPath}",);`, false],
  ['script text only', `inputPaths = (); shellScript = ${JSON.stringify(`inputPaths = ("${dsymPath}",);`)};`, false],
]) {
  test(`dSYM input dependency: ${name}`, () => {
    assert.equal(inputPaths(script).includes(dsymPath), expected);
  });
}

for (const target of ['CanaryTrainLCD', 'ProdTrainLCD']) {
  test(`${target}: embedding finishes before the dSYM-dependent Sentry phase`, () => {
    const targetBlock = project.match(
      new RegExp(`/\\* ${target} \\*/ = \\{\\s+isa = PBXNativeTarget;[\\s\\S]*?buildPhases = \\(([\\s\\S]*?)\\);`)
    );
    assert.ok(targetBlock, `Missing native target ${target}`);
    const phases = [...targetBlock[1].matchAll(/([A-F0-9]+) \/\* (.*?) \*\//g)];
    const upload = phases.findIndex((phase) => phase[2] === 'Upload Debug Symbols to Sentry');
    assert.ok(upload >= 0, 'Keep the Sentry debug-symbol upload');
    for (const name of ['Embed App Clips', 'Embed Watch Content', 'Embed Foundation Extensions', 'Embed VOICEVOX Frameworks', '[CP] Embed Pods Frameworks', '[CP] Copy Pods Resources']) {
      const index = phases.findIndex((phase) => phase[2] === name);
      assert.ok(index >= 0 && index < upload, `${name} must precede Sentry to avoid an archive dependency cycle`);
    }
    const script = project.match(
      new RegExp(`${phases[upload][1]} /\\* Upload Debug Symbols to Sentry \\*/ = \\{([\\s\\S]*?)\\n\\t\\t\\};`)
    );
    assert.ok(script, 'Missing Sentry script definition');
    assert.ok(inputPaths(script[1]).includes(dsymPath), 'Keep the explicit dependency on the generated dSYM in inputPaths');
  });
}
