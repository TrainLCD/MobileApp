import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Archive builds use these native manifests directly, without Expo prebuild.
for (const path of [
  'TrainLCD/Schemes/Dev/Info.plist',
  'TrainLCD/Schemes/Prod/Info.plist',
  'CanaryAppClip/Info.plist',
  'ProdAppClip/Info.plist',
]) {
  test(`${path}: location purpose exists in the base manifest`, () => {
    const plist = readFileSync(
      new URL(`../ios/${path}`, import.meta.url),
      'utf8'
    ).replace(/<!--[\s\S]*?-->/g, '');
    const keys = ['NSLocationWhenInUseUsageDescription'];
    if (path.startsWith('TrainLCD/')) {
      keys.push('NSLocationAlwaysAndWhenInUseUsageDescription');
    }
    for (const key of keys) {
      const value = plist.match(
        new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`)
      );
      assert.ok(
        value?.[1].trim(),
        `${key} must not rely only on InfoPlist.strings`
      );
    }
  });
}
