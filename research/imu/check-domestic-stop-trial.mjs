// Replay the app's compiled detector against the annotated, continuous rides.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [compiledTrial, dataset] = process.argv.slice(2);
const { ImuStopTrial } = await import(pathToFileURL(resolve(compiledTrial)));
const read = (dir, name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
const rides = [
  ['都営新宿線', 'handoff-2026-11-28/shinjuku'],
  ['東京メトロ南北線', 'marked-namboku-replay'],
  ['都営大江戸線', 'marked-oedo-replay'],
];

function compareWithTaps(transitions, marks, end) {
  assert.ok(marks.length > 0 && marks.length % 2 === 0);
  assert.ok(marks.every((at, i) => i === 0 || marks[i - 1] < at));
  assert.ok(marks.at(-1) <= end);
  const moving = transitions.flatMap(([at, kind], i) =>
    kind === 'start' ? [[at, transitions[i + 1]?.[0] ?? end]] : []
  );
  const movingSeconds = (from, to) =>
    moving.reduce(
      (sum, [start, stop]) =>
        sum + Math.max(0, Math.min(stop, to) - Math.max(start, from)),
      0
    );
  for (let i = 0; i < marks.length; i += 2) {
    const departure = marks[i];
    const arrival = marks[i + 1];
    const next = marks[i + 2];
    const until = next ?? end;
    const earlyStops = transitions.filter(
      ([t, kind]) => kind === 'stop' && departure + 5 < t && t < arrival - 5
    ).length;
    const last = transitions.findLast(([t]) => t < until);
    const timelyHeld =
      next == null
        ? 'unobserved'
        : last?.[1] === 'stop' && Math.abs(last[0] - arrival) <= 5;
    console.log({
      leg: i / 2 + 1,
      runningDuringTravelSeconds: Number(
        movingSeconds(departure, arrival).toFixed(3)
      ),
      runningDuringDwellSeconds: Number(
        movingSeconds(arrival, until).toFixed(3)
      ),
      earlyStops,
      timelyHeld,
    });
  }
}

for (const [line, relative] of rides) {
  const dir = join(dataset, relative);
  const { marks, sets } = read(dir, 'input.json');
  const scores = read(dir, 'probs.json');
  const expected = read(dir, 'continuous.json');
  // full0 through full9 are different sampling offsets of one ride.
  // The separately cropped leg fixtures restart the detector at each station.
  const tracks = Object.keys(expected).filter((k) =>
    /^full\d+$|^ride$/.test(k)
  );
  assert.ok(tracks.length, `No continuous ride for ${line}`);
  for (const key of tracks) {
    const trial = new ImuStopTrial();
    let scoreCount = 0;
    let phase = 'waiting';
    const transitions = [];
    for (const [t, x, y, z, gx, gy, gz, rotationDegPerSecond] of sets[key]
      .samples) {
      const output = trial.step({
        timeMs: t * 1000,
        acceleration: { x, y, z },
        accelerationIncludingGravity: { x: x + gx, y: y + gy, z: z + gz },
        rotationDegPerSecond,
      });
      if (!output) continue;
      assert.equal(output.baseline, output.magnetic);
      assert.equal(output.magneticSd, null);
      if (output.stopProbability != null) {
        const [at, p] = scores[key][scoreCount++];
        assert.equal(t, at, `${line} ${key} score clock`);
        assert.ok(
          Math.abs(output.stopProbability - p) < 1e-10,
          `${line} ${key} score at ${t}`
        );
      }
      if (output.baseline !== phase) {
        transitions.push([t, output.baseline === 'running' ? 'start' : 'stop']);
        phase = output.baseline;
      }
    }
    assert.equal(scoreCount, scores[key].length);
    assert.deepEqual(
      transitions,
      expected[key],
      `${line} ${key} state changes`
    );
    console.log(
      line,
      key,
      scoreCount,
      'scores,',
      transitions.length,
      'state changes'
    );
    if (key === 'full0' || key === 'ride') {
      compareWithTaps(transitions, marks, sets[key].samples.at(-1)[0]);
    }
  }
}
