import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../workflows/bump_version_on_canary_pr.yml', import.meta.url),
  'utf8'
);
const gate = workflow
  .split('      - name: Wait for skip-version-bump label\n')[1]
  .split('\n      - uses: actions/checkout')[0];
const script = gate
  .split('        run: |\n')[1]
  .split('\n')
  .map((line) => line.replace(/^ {10}/, ''))
  .join('\n');

/**
 * Execute the workflow's actual shell gate with mocked gh and sleep commands.
 * labelAt controls delayed label visibility; failAt simulates an API failure.
 * Return the gate output and API call log without making requests or waiting.
 */
function runGate({ labelAt = 0, failAt = 0 } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'canary-label-'));
  try {
    writeFileSync(join(root, 'count'), '0');
    writeFileSync(join(root, 'output'), '');
    writeFileSync(
      join(root, 'gh'),
      `#!/bin/bash
set -eu
printf '%s\\n' "$*" >> "$MOCK_ROOT/args"
count=$(cat "$MOCK_ROOT/count")
count=$((count + 1))
printf '%s' "$count" > "$MOCK_ROOT/count"
if [ "$count" -eq "$MOCK_FAIL_AT" ]; then
  echo 'API unavailable' >&2
  exit 1
fi
printf '%s\\n' 'automated' 'skip-version-bump-extra'
if [ "$MOCK_LABEL_AT" -gt 0 ] && [ "$count" -ge "$MOCK_LABEL_AT" ]; then
  echo 'skip-version-bump'
fi
`,
      { mode: 0o755 }
    );
    writeFileSync(join(root, 'sleep'), '#!/bin/bash\nexit 0\n', {
      mode: 0o755,
    });
    const result = spawnSync('bash', ['-c', script], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${root}:${process.env.PATH}`,
        MOCK_ROOT: root,
        MOCK_LABEL_AT: String(labelAt),
        MOCK_FAIL_AT: String(failAt),
        REPOSITORY: 'TrainLCD/MobileApp',
        PR_NUMBER: '123',
        GITHUB_OUTPUT: join(root, 'output'),
      },
    });
    return {
      ...result,
      output: readFileSync(join(root, 'output'), 'utf8'),
      calls: Number(readFileSync(join(root, 'count'), 'utf8')),
      args: readFileSync(join(root, 'args'), 'utf8'),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('an existing skip label stops the bump immediately', () => {
  const result = runGate({ labelAt: 1 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output, 'skip=true\n');
  assert.equal(result.calls, 1);
});

test('a label applied after opened is detected by a later API read', () => {
  const result = runGate({ labelAt: 3 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output, 'skip=true\n');
  assert.equal(result.calls, 3);
  assert.match(
    result.args,
    /repos\/TrainLCD\/MobileApp\/issues\/123\/labels --paginate/
  );
});

test('a skip label on the last check still prevents the bump', () => {
  const result = runGate({ labelAt: 12 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output, 'skip=true\n');
});

test('an unlabeled PR proceeds after the bounded wait', () => {
  const result = runGate();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output, 'skip=false\n');
  assert.equal(result.calls, 12);
});

test('an API failure never authorizes a bump', () => {
  const result = runGate({ failAt: 2 });
  assert.notEqual(result.status, 0);
  assert.equal(result.output, '');
  assert.match(result.stderr, /API unavailable/);
});

test('the PR-only gate protects every bump step and preserves manual dispatch', () => {
  assert.match(gate, /if: github.event_name == 'pull_request'/);
  const jobCondition = workflow.split('    if: |\n')[1].split('    steps:')[0];
  assert.match(jobCondition, /head.repo.full_name == github.repository/);
  assert.match(jobCondition, /github.event_name == 'workflow_dispatch'/);
  assert.doesNotMatch(jobCondition, /pull_request.labels/);
  const bumpSteps = workflow.split('      - uses: actions/checkout')[1];
  const blocks = bumpSteps.split(/\n {6}- (?:uses|name): /);
  assert.equal(blocks.length, 5);
  for (const block of blocks) {
    assert.match(block, /if: steps.canary-label.outputs.skip != 'true'/);
  }
});
