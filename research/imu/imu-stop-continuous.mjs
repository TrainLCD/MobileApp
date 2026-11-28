// Apply the previously used departure detector and stop confirmation continuously.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [estimator, inputFile, scoresFile, outputFile] = process.argv.slice(2);
const { ImuShadowEstimator } = await import(pathToFileURL(resolve(estimator)));
const input = JSON.parse(readFileSync(inputFile));
const scores = JSON.parse(readFileSync(scoresFile));
const fresh = () => new ImuShadowEstimator({ distanceM: 1500, etaSeconds: null, fromId: 0, toId: 1, missingPairs: [] });
const output = {};
for (const [key, predictions] of Object.entries(scores)) {
  let engine = fresh(), running = false, since = null, previous = -Infinity, i = 0;
  const events = [];
  let runningSince = Infinity;
  for (const [t,x,y,z,gx,gy,gz,rotationDegPerSecond] of input.sets[key].samples) {
    if (!running) {
      const state = engine.step({timeMs: t*1000, acceleration: {x,y,z},
        accelerationIncludingGravity: {x:x+gx,y:y+gy,z:z+gz}, rotationDegPerSecond});
      if (state.phase === 'invalid') engine = fresh();
      if (state.phase === 'accelerating') {
        running = true;
        runningSince = t;
        events.push([t, 'start']);
      }
    }
    if (predictions[i]?.[0] !== t) continue;
    const [, original, referenceStart, revised] = predictions[i++];
    // A reference window must be wholly within the currently inferred ride.
    const probability = running && referenceStart != null && runningSince <= referenceStart
      ? revised : original;
    if (t-previous > .8 || probability < .65) since = null;
    if (running && probability >= .65) {
      since ??= t;
      if (t-since >= 1) { running = false; engine = fresh(); since = null; events.push([t,'stop']); }
    }
    previous = t;
  }
  if (i !== predictions.length) throw Error('Prediction and sensor clocks differ');
  output[key] = events;
}
writeFileSync(outputFile, JSON.stringify(output));
