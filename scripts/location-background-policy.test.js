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

// A fix just before the batch boundary used to remain buffered indefinitely when
// no later CoreLocation callback arrived. The timer uses this production policy.
test('a sparse background batch has a finite deadline without another fix', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trainlcd-location-flush-'));
  try {
    const source = path.join(dir, 'flush.c');
    const binary = path.join(dir, 'flush');
    writeFileSync(source, `
#include <assert.h>
#include "EXTrainLCDLocationPolicy.h"
int main(void) {
  const double intervalMs = 10000;
  // Last report at 0s, next fix at 9s, no further fix: deliver at 10s.
  double receivedAt = 9;
  double deadline = receivedAt + EXTrainLCDDeferredFlushDelay(intervalMs, 9);
  assert(deadline == 10);
  // An initial background batch also gets a deadline without a second fix.
  assert(EXTrainLCDDeferredFlushDelay(intervalMs, 0) == 10);
  // A sample spanning the interval can be sent immediately.
  assert(EXTrainLCDDeferredFlushDelay(intervalMs, 34) == 0);
  // Clock reversal must not postpone a buffered sample by the clock jump.
  assert(EXTrainLCDDeferredFlushDelay(intervalMs, -60) == 10);
  assert(EXTrainLCDDeferredFlushDelay(intervalMs, NAN) == 10);
  // Respect other configured intervals and disabled batching.
  assert(EXTrainLCDDeferredFlushDelay(5000, 4) == 1);
  assert(EXTrainLCDDeferredFlushDelay(0, 0) == 0);
  assert(EXTrainLCDDeferredFlushDelay(-1, 0) == 0);
  assert(EXTrainLCDDeferredFlushDelay(INFINITY, 0) == 0);
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
