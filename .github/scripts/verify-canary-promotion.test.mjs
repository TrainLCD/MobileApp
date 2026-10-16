import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyCanaryPromotion } from './verify-canary-promotion.mjs';

const sha = 'a'.repeat(40);
const head = 'b'.repeat(40);
const repository = 'TrainLCD/MobileApp';
function fixture() {
  const pr = { number: 7219, merged_at: '2026-10-16T16:36:00Z', merge_commit_sha: sha,
    base: { ref: 'canary', repo: { full_name: repository } },
    head: { ref: 'dev', sha: head, repo: { full_name: repository } } };
  const commit = { parents: [{ sha: 'c'.repeat(40) }, { sha: head }], commit: { tree: { sha: 'same-tree' } } };
  const source = { commit: { tree: { sha: 'same-tree' } } };
  const pages = [[pr]];
  const calls = [];
  const input = { repository, sha, ref: 'refs/heads/canary', request: async path => {
    calls.push(path);
    if (path.includes('/pulls?')) return pages[Number(new URLSearchParams(path.split('?')[1]).get('page')) - 1] ?? [];
    return path.endsWith(`/${sha}`) ? commit : source;
  } };
  return { pr, commit, source, pages, calls, input };
}

test('accepts a dev merge even after dev has advanced; no moving branch lookup', async () => {
  const f = fixture();
  assert.equal(await verifyCanaryPromotion(f.input), 7219);
  assert.ok(f.calls.every(path => !path.endsWith('/dev')));
});
for (const [name, change, message] of [
  ['squash or direct push', f => { f.commit.parents.pop(); }, /merge commit/],
  ['octopus merge', f => { f.commit.parents.push({ sha: head }); }, /merge commit/],
  ['different source branch', f => { f.pr.head.ref = 'fix/shortcut'; }, /one merged PR/],
  ['fork named dev', f => { f.pr.head.repo.full_name = 'someone/MobileApp'; }, /one merged PR/],
  ['wrong destination', f => { f.pr.base.ref = 'master'; }, /one merged PR/],
  ['unmerged PR', f => { f.pr.merged_at = null; }, /one merged PR/],
  ['PR for another commit', f => { f.pr.merge_commit_sha = head; }, /one merged PR/],
  ['wrong second parent', f => { f.commit.parents[1].sha = sha; }, /second parent/],
  ['changes introduced during conflict resolution', f => { f.source.commit.tree.sha = 'different'; }, /file contents differ/],
  ['missing tree metadata', f => { delete f.commit.commit.tree; }, /file contents differ/],
  ['manual publish from another branch', f => { f.input.ref = 'refs/heads/dev'; }, /canary branch/],
  ['no matching PR', f => { f.pages[0] = []; }, /one merged PR/],
]) {
  test(`rejects ${name}`, async () => {
    const f = fixture(); change(f);
    await assert.rejects(verifyCanaryPromotion(f.input), message);
  });
}
test('checks later pages instead of accepting a truncated PR list', async () => {
  const f = fixture();
  f.pages.unshift(Array.from({ length: 100 }, () => ({ merged_at: null })));
  assert.equal(await verifyCanaryPromotion(f.input), 7219);
});
test('API failure blocks publishing', async () => {
  const f = fixture(); f.input.request = async () => { throw new Error('HTTP 403'); };
  await assert.rejects(verifyCanaryPromotion(f.input), /403/);
});
