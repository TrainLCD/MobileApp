# IMU benchmark workflow

This extends the one-segment replay in `README.md` with batch evaluation,
reproducible comparisons and agent instructions. Requires Node.js 24 and, for
archive preparation, Python 3.11 or later. No additional packages are required.

## Smoke test (synthetic only)

From the repository root:

```bash
node --test utils/imu-replay/replay-check.mjs utils/imu-replay/benchmark-check.mjs
(cd utils/imu-replay && python3 -m unittest prepare_check.py)
node --experimental-transform-types utils/imu-replay/benchmark.mjs run \
  utils/imu-replay/manifest.example.json train /tmp/imu-demo.json
```

Output reports are created exclusively (existing files are not overwritten).

## Prepare a real dataset once

Keep the dataset root outside the repository. Copy `manifest.example.json` and
`example/config.json` as format references. Create one config per station leg
with independently verified times, distance, and ETA (or null). A manifest case
has an ID, journey group, split (`train`, `validation`, `test`), kind (`real` or
`synthetic`), directory of the three CSVs, config path and provenance string.
Paths are relative to the manifest. Use one group per physical ride, including
colocated recordings, and group connected recordings conservatively.

For TrainTrack data, consult the [official record](https://zenodo.org/records/22206115)
and [artifact documentation](https://github.com/mlsec-group/magtrack). The
archives are large and recording station names are anonymized. An independent
track-distance reference cannot be obtained simply by matching those anonymous
IDs to StationAPI. Do not fabricate distances or station IDs to re-identify them.
The tool needs a curated case manifest; it cannot automatically discover valid
station-to-station labels or independent distances. Use TrainTrack only where
these prerequisites are satisfied, or collect independently labeled local rides.

For a known TrainTrack recording, add this optional object to a case (the values
are placeholders; replace them with exact archive/member names):

```json
{
  "traintrack": {
    "archive": "traintrack_data_001.zip",
    "innerZip": "replace-with-exact-recording-member.zip",
    "members": {
      "Accelerometer.csv": "replace-with-exact-acceleration-member.csv",
      "Gravity.csv": "replace-with-exact-gravity-member.csv",
      "Gyroscope.csv": "replace-with-exact-gyro-member.csv"
    }
  }
}
```

Omit `innerZip` when sensors are directly inside the outer archive. List archive
members locally with `python3 -m zipfile -l FILE.zip`. The CSV unit and clock
requirements in `README.md` apply. Data without these inputs cannot be scored.
`prepare.py` uses the official SHA-256 manifest, downloads only explicitly named
archives, checks their hashes and extracts only selected sensor files. It allows
at most one missing archive per invocation by default and requires explicit
`--download`. Each archive is approximately 9–10 GB. A failed download is not
silently accepted. Pre-download and place larger selections with the official
instructions in `.traintrack-cache` beside the manifest, or run `prepare.py`
with an explicit larger `--max-archives` budget. Do not commit cached archives.

## One-command acquisition and batch evaluation

```bash
node --experimental-transform-types utils/imu-replay/benchmark.mjs run \
  /path/to/manifest.json train /tmp/imu-before.json --download
```

This prepares the selected archive-backed cases, parses/synchronizes sensors,
runs the estimator for every case in the split and writes a JSON report with
per-case results, input fingerprints and aggregate metrics. Without `--download`
it works offline using previously downloaded files or local CSVs. Cases are not
silently discarded. A nonzero exit code means an input failure or command error.

Modify the estimator only, then repeat without the download flag:

```bash
node --experimental-transform-types utils/imu-replay/benchmark.mjs run \
  /path/to/manifest.json train /tmp/imu-after.json
node utils/imu-replay/benchmark.mjs compare \
  /tmp/imu-before.json /tmp/imu-after.json /tmp/imu-comparison.json
```

Alternatively pass `--estimator=/path/to/imuShadow.ts` to evaluate a separate
baseline snapshot. The estimator source hash is recorded. For the held-out
split, compare the saved original estimator and final candidate using the same
frozen input manifest. No changes to the scoring code between runs are allowed.

The comparison refuses different input fingerprints, splits or benchmark
protocols, and refuses input failures. A miss counts as 11 seconds in the
penalized arrival MAE (fixed matching window ±10 seconds). False detections and
misses also have separate non-regression gates. Distance MAE is compared only
where the valid case coverage is identical. Losing valid distance coverage is
a regression. A comparison with no actual improvement returns exit code 3.
These are initial conservative engineering rules, not clinically or
statistically calibrated thresholds. A passing synthetic comparison is not
real-data evidence.

## Ask an AI agent

Open the repository with Codex or Claude Code and say:

> Read utils/imu-replay/AGENTS.md. Improve the IMU arrival estimator using the
> frozen benchmark manifest. Run the baseline and compare each change on the
> training split; preserve false-arrival and miss safeguards. Select on
> validation, evaluate the held-out test set once, and report the actual metrics
> and remaining limitations. Do not change labels or scoring to get a pass.

Do not claim a real-data result until a real manifest has been curated and run.
This tooling does not automatically improve the algorithm on its own.

## App shadow exports

For a manually observed ride from the [shadow recording panel](../../docs/imu-shadow.md),
use a case like the following in the same version 1 manifest. Place the export
beside the manifest outside the repository. Add one case for each planned leg
(zero-based index), and use the same split and group for all devices on a ride.

```json
{
  "id": "ride-a-leg-0",
  "group": "ride-a",
  "split": "train",
  "kind": "real",
  "shadowFile": "ride-a.json",
  "legIndex": 0,
  "provenance": "Manual departure and arrival taps; recorded StationAPI track distance."
}
```

Run the same batch and comparison commands as for CSVs. Before freezing the
manifest, verify that the recorded distance is known and the train remained
stopped for at least ten seconds after the arrival tap. The replay integrates
the native sample timestamps and scores candidate times on the JS observation
clock used by the taps. Automatic departures cannot supply ground truth.
Exports from the older manual-departure UI can be read if they contain the
required labels and observation window. This offline replay evaluates motion
samples; it does not reproduce native delivery or the app's periodic timers.
