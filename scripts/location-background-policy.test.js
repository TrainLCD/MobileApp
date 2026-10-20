const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

// Compile and execute the same C policy used by the patched Objective-C consumer.
// CoreLocation itself still needs an iOS build/device check.
test('background tracking removes the distance gate and restores foreground/power-saving settings', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trainlcd-location-policy-'));
  try {
    const source = path.join(dir, 'policy.c');
    const binary = path.join(dir, 'policy');
    writeFileSync(source, `
#include <assert.h>
#include "EXTrainLCDLocationPolicy.h"
int main(void) {
  const double none = -1;
  // Foreground -> background -> foreground, without restarting the manager.
  assert(EXTrainLCDDistanceFilter(0, 0, 10, none) == 10);
  assert(EXTrainLCDDistanceFilter(1, 0, 10, none) == none);
  assert(EXTrainLCDDistanceFilter(0, 0, 10, none) == 10);
  // Enabling/disabling power saving while already in the background.
  assert(EXTrainLCDDistanceFilter(1, 1, 10, none) == 10);
  assert(EXTrainLCDDistanceFilter(1, 0, 10, none) == none);
  assert(EXTrainLCDDistanceFilter(0, 1, 10, none) == 10);
  // Restore the configured value, not a hard-coded default.
  assert(EXTrainLCDDistanceFilter(0, 0, 25, none) == 25);
  assert(EXTrainLCDDistanceFilter(1, 1, 25, none) == 25);
  assert(EXTrainLCDDistanceFilter(0, 0, none, none) == none);
  return 0;
}
`);
    execFileSync('cc', [
      '-std=c99', '-Wall', '-Wextra', '-Werror',
      '-I', path.resolve(__dirname, '../node_modules/expo-location/ios/TaskConsumers'),
      source, '-o', binary,
    ], { stdio: 'pipe' });
    execFileSync(binary, [], { stdio: 'pipe' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
