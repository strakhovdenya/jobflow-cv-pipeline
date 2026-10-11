const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { classify, issueState, hasExistingPr, reviewDiff, git, gh, EXEC_OPTIONS, SPEC_APPROVED_LABEL } = require('./github');
const { hash, marker, APPROVAL_AUTHOR } = require('../../scripts/spec-hash');

const BASE_BODY = '## Acceptance Criteria\n\n- [ ] AC-1 do the thing\n';

function approvalComment(body) {
  return {
    user: { login: APPROVAL_AUTHOR },
    body: `${marker(hash(body))}\nSpec approved by owner.\n`,
  };
}

function issueFixture({ state = 'OPEN', labels = [], body = BASE_BODY, comments = [], title = 'Example issue' } = {}) {
  return { number: 1, title, body, url: 'https://github.com/x/y/issues/1', state, labels, comments };
}

function config(entries) {
  return { branchPrefix: 'task/ISSUE-', issues: entries };
}

test('classify marks issue without spec-approved label as unapproved', () => {
  const info = issueFixture({ labels: [], comments: [approvalComment(BASE_BODY)] });
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'unapproved');
  assert.match(statuses[0].unapprovedReason, new RegExp(SPEC_APPROVED_LABEL));
});

test('classify marks issue without approval comment as unapproved', () => {
  const info = issueFixture({ labels: [{ name: SPEC_APPROVED_LABEL }], comments: [] });
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'unapproved');
  assert.match(statuses[0].unapprovedReason, new RegExp(APPROVAL_AUTHOR.replace(/[[\]]/g, '\\$&')));
});

test('classify marks issue with stale approval hash as unapproved', () => {
  const info = issueFixture({
    labels: [{ name: SPEC_APPROVED_LABEL }],
    body: `${BASE_BODY}extra paragraph added after approval\n`,
    comments: [approvalComment(BASE_BODY)],
  });
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'unapproved');
  assert.match(statuses[0].unapprovedReason, /хеш/);
});

test('classify marks issue with valid approval as not-started', () => {
  const info = issueFixture({ labels: [{ name: SPEC_APPROVED_LABEL }], comments: [approvalComment(BASE_BODY)] });
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'not-started');
  assert.strictEqual(statuses[0].unapprovedReason, undefined);
});

test('classify keeps approval valid after acceptance criteria checkboxes are ticked', () => {
  const tickedBody = BASE_BODY.replace('[ ]', '[x]');
  const info = issueFixture({
    labels: [{ name: SPEC_APPROVED_LABEL }],
    body: tickedBody,
    comments: [approvalComment(BASE_BODY)],
  });
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'not-started');
});

test('classify does not check approval for a closed issue', () => {
  const info = issueFixture({ state: 'CLOSED', labels: [] });
  const statuses = classify(config([{ id: 1 }]), {
    getIssueState: () => info,
    checkExistingPr: () => {
      throw new Error('must not be called for a closed issue');
    },
  });
  assert.strictEqual(statuses[0].status, 'done');
});

test('classify prioritizes blocked status over missing approval', () => {
  const info = issueFixture({ labels: [{ name: 'ralph-needs-prompt-change' }] });
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'blocked');
});

test('classify marks issue with non-bot approval comment as unapproved', () => {
  const info = issueFixture({
    labels: [{ name: SPEC_APPROVED_LABEL }],
    comments: [{ user: { login: 'some-user' }, body: `${marker(hash(BASE_BODY))}\nSpec approved.\n` }],
  });
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'unapproved');
});

// Shapes as gh 2.95 really returns them: `gh issue view --json` has no comments here, and the REST
// comments endpoint (`gh api --jq`) prints one `{user: {login}, body}` object per line.
function fakeGh({ comments, failApi = false, labels = [{ name: SPEC_APPROVED_LABEL }] }) {
  const view = { number: 1, title: 'Example issue', body: BASE_BODY, url: 'https://github.com/x/y/issues/1', state: 'OPEN', labels };
  return (args) => {
    if (args[0] === 'issue') return JSON.stringify(view);
    if (failApi) throw new Error('gh api failed');
    return comments.map((comment) => JSON.stringify(comment)).join('\n');
  };
}

test('issueState reads approval comments through the REST comments endpoint', () => {
  const calls = [];
  const run = fakeGh({ comments: [{ user: { login: APPROVAL_AUTHOR }, body: `${marker(hash(BASE_BODY))}\nSpec approved.\n` }] });
  const info = issueState(7, (args) => {
    calls.push(args);
    return run(args);
  });
  assert.deepStrictEqual(calls[1].slice(0, 3), ['api', '--paginate', 'repos/{owner}/{repo}/issues/7/comments']);
  assert.ok(!calls[0].join(',').includes('comments'));
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'not-started');
});

test('issueState does not accept an approval marker from a login without the bot suffix', () => {
  const info = issueState(1, fakeGh({ comments: [{ user: { login: 'github-actions' }, body: `${marker(hash(BASE_BODY))}\nSpec approved.\n` }] }));
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'unapproved');
});

test('issueState returns null when the comments request fails', () => {
  assert.strictEqual(issueState(1, fakeGh({ comments: [], failApi: true })), null);
});

test('issueState skips the comments request for an issue without the approval label', () => {
  const calls = [];
  const run = fakeGh({ comments: [], failApi: true, labels: [] });
  const info = issueState(1, (args) => {
    calls.push(args);
    return run(args);
  });
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(info.comments, []);
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'unapproved');
});

test('looks up the PR by exact head branch', () => {
  const calls = [];
  const found = hasExistingPr('task/ISSUE-1-example-issue', (args) => {
    calls.push(args);
    return JSON.stringify([{ number: 5, state: 'OPEN' }]);
  });
  assert.strictEqual(found, true);
  assert.deepStrictEqual(calls[0].slice(0, 5), ['pr', 'list', '--head', 'task/ISSUE-1-example-issue', '--state']);
  assert.ok(calls[0].includes('all'));
  assert.ok(!calls[0].includes('--search'));
});

test('hasExistingPr reports no PR for an empty list', () => {
  assert.strictEqual(hasExistingPr('task/ISSUE-1-x', () => '[]'), false);
});

test('propagates gh errors from hasExistingPr', () => {
  assert.throws(
    () =>
      hasExistingPr('task/ISSUE-1-x', () => {
        throw new Error('gh pr list failed');
      }),
    /gh pr list failed/,
  );
});

test('classify marks issue unknown when PR lookup fails', () => {
  const info = issueFixture({ labels: [{ name: SPEC_APPROVED_LABEL }], comments: [approvalComment(BASE_BODY)] });
  const statuses = classify(config([{ id: 1 }]), {
    getIssueState: () => info,
    checkExistingPr: () => {
      throw new Error('gh unavailable');
    },
  });
  assert.strictEqual(statuses[0].status, 'unknown');
  assert.notStrictEqual(statuses[0].ready, true);
});

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ralph-github-'));
  const run = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  run('init', '-q');
  run('config', 'user.email', 'test@example.invalid');
  run('config', 'user.name', 'Test');
  run('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, '.gitignore'), 'ignored.txt\n');
  fs.writeFileSync(path.join(dir, 'tracked.txt'), 'one\n');
  run('add', '-A');
  run('commit', '-q', '-m', 'init');
  return dir;
}

test('review diff includes untracked files', () => {
  const dir = makeRepo();
  try {
    fs.writeFileSync(path.join(dir, 'tracked.txt'), 'two\n');
    fs.writeFileSync(path.join(dir, 'brand-new.txt'), 'fresh content\n');
    const diff = reviewDiff(dir);
    assert.match(diff, /tracked\.txt/);
    assert.match(diff, /brand-new\.txt/);
    assert.match(diff, /fresh content/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('review diff excludes ignored files', () => {
  const dir = makeRepo();
  try {
    fs.writeFileSync(path.join(dir, 'ignored.txt'), 'secret\n');
    fs.writeFileSync(path.join(dir, 'brand-new.txt'), 'fresh\n');
    const diff = reviewDiff(dir);
    assert.ok(!diff.includes('ignored.txt'));
    assert.ok(!diff.includes('secret'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('git and gh helpers return output larger than 1 MiB', () => {
  const dir = makeRepo();
  try {
    const size = 2 * 1024 * 1024;
    fs.writeFileSync(path.join(dir, 'big.txt'), 'x'.repeat(size));
    execFileSync('git', ['add', 'big.txt'], { cwd: dir });
    execFileSync('git', ['commit', '-q', '-m', 'big'], { cwd: dir });
    assert.strictEqual(git(['show', 'HEAD:big.txt'], { cwd: dir }).length, size);
    assert.ok(EXEC_OPTIONS.maxBuffer > size);
    assert.strictEqual(typeof gh, 'function');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
