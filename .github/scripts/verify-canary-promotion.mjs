import { pathToFileURL } from 'node:url';

// Validate the dev snapshot recorded by the merged PR, not today's moving dev ref.
export async function verifyCanaryPromotion({ repository, sha, ref, request }) {
  if (ref !== 'refs/heads/canary') throw new Error('Publishing requires the canary branch.');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error('Invalid repository or commit.');
  }
  const prefix = `/repos/${repository}`;
  const commit = await request(`${prefix}/commits/${sha}`);
  if (commit.parents?.length !== 2) throw new Error('Canary promotion requires a merge commit; squash, rebase and direct commits are rejected.');

  const candidates = [];
  for (let page = 1; ; page++) {
    if (page > 10) throw new Error('Too many associated PRs to verify safely.');
    const prs = await request(`${prefix}/commits/${sha}/pulls?per_page=100&page=${page}`);
    candidates.push(...prs.filter(pr => pr.merged_at && pr.merge_commit_sha === sha));
    if (prs.length < 100) break;
  }
  const promotions = candidates.filter(pr =>
    pr.base?.ref === 'canary' && pr.head?.ref === 'dev' &&
    pr.base.repo?.full_name === repository && pr.head.repo?.full_name === repository
  );
  if (promotions.length !== 1) throw new Error('Expected one merged PR from this repository’s dev branch to canary.');
  const pr = promotions[0];
  if (commit.parents[1].sha !== pr.head.sha) throw new Error('The merge does not preserve the PR’s dev commit as its second parent.');
  const source = await request(`${prefix}/commits/${pr.head.sha}`);
  if (!commit.commit?.tree?.sha || commit.commit.tree.sha !== source.commit?.tree?.sha) {
    throw new Error('Canary file contents differ from the promoted dev snapshot. Resolve changes in dev before promotion.');
  }
  return pr.number;
}

async function main() {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GH_TOKEN is required.');
  const request = async path => {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub verification failed: HTTP ${response.status} (${path}).`);
    return response.json();
  };
  const number = await verifyCanaryPromotion({ repository: process.env.GITHUB_REPOSITORY, sha: process.env.GITHUB_SHA, ref: process.env.GITHUB_REF, request });
  console.log(`Verified dev → canary merge PR #${number}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
