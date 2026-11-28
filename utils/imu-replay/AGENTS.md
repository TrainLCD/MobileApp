# IMU replay: agent workflow

Read the repository-level AGENTS.md first. This directory is developer tooling;
never wire it into the shipping app or change production location behavior here.

## Objective and data contract

Improve the estimator's ability to identify actual station stops without adding
false arrivals or ignoring failures. Use `src/lib/imuShadow.ts` as the estimator.
A real case must have an independently established station-to-station distance,
true arrival and departure labels, synchronized sensor data and provenance.
The estimator must never receive the ground-truth event times as features.

Keep all segments from the same journey or shared physical train ride in the
same split, including different devices on the same ride. Curate and freeze the
manifest before experimentation. Keep the test split unused until the final
candidate has been selected. Do not use the synthetic example to claim field
accuracy. Do not infer anonymous station identities or invent labels, distances
or ETA from the very signal being evaluated. Set ETA to null if no independent
estimate exists. Do not upload raw recordings or local manifests to GitHub.

## Procedure

1. Run the tool checks documented in `BENCHMARK.md`. Run the baseline on `train`
   and `validation` and save the reports outside the repository. Record the
   source revision and input fingerprints.
2. Inspect per-case failures, invalid reasons, early/late candidate errors and
   the difference between ETA and fused estimates. Change only the relevant
   estimator or tests. Keep the scoring protocol and ground truth unchanged.
3. Re-run the same training cases and compare to the baseline. Iterate using
   the training split only; use validation to select a candidate. Never tune
   on held-out test errors.
4. Run the frozen test split against the original estimator and final candidate
   once. Use `compare` on the resulting reports. Require no regression in
   missed or false arrivals, invalid estimates, distance coverage and penalized
   arrival error. Report distance MAE on comparable cases. If either report has
   any input failure, fix the dataset pipeline separately; never drop failures.
5. Run the repository-required lint, unit tests and typecheck before committing.
   Report exact per-split case counts, failures, metrics, source hashes and
   limitations. If the final comparison fails, do not claim improvement or
   promote the change. Do not merge or release automatically.

The benchmark is not proof of iOS/Android background operation, battery usage,
or real-world generalization. These still require device and route testing.
