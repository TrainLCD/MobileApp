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
  assert(EXTrainLCDDistanceFilter(0, 1, 0, 10, none) == 10);
  assert(EXTrainLCDDistanceFilter(1, 1, 0, 10, none) == none);
  assert(EXTrainLCDDistanceFilter(0, 1, 0, 10, none) == 10);
  // Enabling/disabling power saving while already in the background.
  assert(EXTrainLCDDistanceFilter(1, 1, 1, 10, none) == 10);
  assert(EXTrainLCDDistanceFilter(1, 1, 0, 10, none) == none);
  assert(EXTrainLCDDistanceFilter(0, 1, 1, 10, none) == 10);
  // Restore the configured value, not a hard-coded default.
  assert(EXTrainLCDDistanceFilter(0, 1, 0, 25, none) == 25);
  assert(EXTrainLCDDistanceFilter(1, 1, 1, 25, none) == 25);
  assert(EXTrainLCDDistanceFilter(0, 1, 0, none, none) == none);
  // OFF keeps the configured filter through foreground/background and power saving.
  for (int background = 0; background <= 1; background++) {
    for (int powerSaving = 0; powerSaving <= 1; powerSaving++) {
      assert(EXTrainLCDDistanceFilter(background, 0, powerSaving, 10, none) == 10);
      assert(EXTrainLCDDistanceFilter(background, 0, powerSaving, 25, none) == 25);
    }
  }
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

test('background recovery waits for fresh fixes and backs off after a bounded attempt', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trainlcd-location-heartbeat-'));
  try {
    const source = path.join(dir, 'heartbeat.c');
    const binary = path.join(dir, 'heartbeat');
    writeFileSync(source, `
#include <assert.h>
#include "EXTrainLCDLocationPolicy.h"
int main(void) {
  const double interval = 10;
  const double timeout = 30;
  assert(EXTrainLCDHeartbeatEnabled(1, 0, 0, 10, interval, timeout));
  assert(!EXTrainLCDHeartbeatEnabled(0, 0, 0, 10, interval, timeout));
  assert(!EXTrainLCDHeartbeatEnabled(1, 1, 0, 10, interval, timeout));
  assert(!EXTrainLCDHeartbeatEnabled(1, 0, 1, 10, interval, timeout));
  assert(!EXTrainLCDHeartbeatEnabled(1, 0, 0, -1, interval, timeout));
  assert(!EXTrainLCDHeartbeatEnabled(1, 0, 0, 0, interval, timeout));
  assert(!EXTrainLCDHeartbeatEnabled(1, 0, 0, 10, 0, timeout));
  assert(!EXTrainLCDHeartbeatEnabled(1, 0, 0, 10, NAN, timeout));
  assert(!EXTrainLCDHeartbeatEnabled(1, 0, 0, 10, interval, INFINITY));
  assert(!EXTrainLCDHeartbeatEnabled(1, 0, 0, 10, interval, -1));

  // Background entry at uptime 5 after a fix at uptime 0: only 5s remain.
  assert(EXTrainLCDHeartbeatDelay(5, 0, 0, interval) == 5);
  assert(EXTrainLCDHeartbeatDelay(10, 0, 0, interval) == 0);
  // A new main-manager fix cancels the need for recovery.
  assert(EXTrainLCDHeartbeatDelay(10, 9, 0, interval) == 9);
  // A 9s-old sample delivered now has only 1s left, not another full interval.
  assert(EXTrainLCDHeartbeatDelay(20, 11, 0, interval) == 1);
  // No sample during the attempt: after 30s, wait another 10s before retrying.
  double attemptStarted = 10;
  double attemptEnded = attemptStarted + timeout;
  double retryAfter = attemptEnded + interval;
  assert(EXTrainLCDHeartbeatDelay(attemptEnded, 0, retryAfter, interval) == 10);
  assert(EXTrainLCDHeartbeatDelay(49, 0, retryAfter, interval) == 1);
  assert(EXTrainLCDHeartbeatDelay(50, 0, retryAfter, interval) == 0);
  // Suspension can delay timers; resume does not add another full wait.
  assert(EXTrainLCDHeartbeatDelay(500, 0, retryAfter, interval) == 0);

  // Cached, duplicate, out-of-order and future/invalid samples cannot end recovery.
  assert(!EXTrainLCDHeartbeatSampleIsFresh(100, 99, 110, interval));
  assert(!EXTrainLCDHeartbeatSampleIsFresh(109, 109, 110, interval));
  assert(!EXTrainLCDHeartbeatSampleIsFresh(108, 109, 110, interval));
  assert(!EXTrainLCDHeartbeatSampleIsFresh(111, 109, 110, interval));
  assert(!EXTrainLCDHeartbeatSampleIsFresh(NAN, 109, 110, interval));
  assert(!EXTrainLCDHeartbeatSampleIsFresh(INFINITY, 109, 110, interval));
  assert(EXTrainLCDHeartbeatSampleIsFresh(110, 109, 110, interval));
  // Wall-clock rollback must not block all subsequent real fixes.
  assert(EXTrainLCDHeartbeatSampleIsFresh(50, 110, 50, interval));
  return 0;
}
`);
    execFileSync('cc', [
      '-std=c99', '-Wall', '-Wextra', '-Werror',
      '-I', path.resolve(__dirname, '../node_modules/expo-location/ios/TaskConsumers'),
      source, '-lm', '-o', binary,
    ], { stdio: 'pipe' });
    execFileSync(binary, [], { stdio: 'pipe' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
