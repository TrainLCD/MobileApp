import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const project = readFileSync(
  new URL('../ios/TrainLCD.xcodeproj/project.pbxproj', import.meta.url),
  'utf8'
);

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
    assert.ok(script[1].includes('${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${EXECUTABLE_NAME}'), 'Keep the explicit dependency on the generated dSYM');
  });
}
