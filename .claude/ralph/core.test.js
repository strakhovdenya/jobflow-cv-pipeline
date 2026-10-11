const test = require('node:test');
const assert = require('node:assert');
const { runIssue, publishChanges } = require('./core');

const CHOSEN = {
  id: 1,
  title: 'Example',
  dependsOn: [],
  body: '## Acceptance Criteria\n\n- [ ] AC-1 first\n- [ ] AC-2 second\n\n## Other\n',
};
const VERDICT = { type: 'fix', summary: 'did the thing' };
const FULL_SELF_REPORT = [
  '=== ACCEPTANCE CRITERIA SELF-REPORT ===',
  '1. COVERED: done one',
  '2. COVERED: done two',
  '=== END ACCEPTANCE CRITERIA SELF-REPORT ===',
].join('\n');
const PR_URL = 'https://example.invalid/pr/9';

// --- publishChanges: commit -> push -> PR -> issue side effects ---

const publishOps = (calls, overrides = {}) => ({
  commitChanges: () => {
    calls.push('commit');
    return 'fix: ISSUE-1 did the thing';
  },
  enablePush: () => calls.push('enablePush'),
  pushBranch: () => calls.push('push'),
  createPr: () => {
    calls.push('createPr');
    return PR_URL;
  },
  checkOffAcceptanceCriteria: () => calls.push('checkOff'),
  postTestEvidenceComment: (...args) => calls.push({ evidence: args }),
  removeRunDirIfExists: () => calls.push('cleanup'),
  ...overrides,
});

const publish = (ops) =>
  publishChanges({ runDir: 'dir', chosen: CHOSEN, verdict: VERDICT, branchName: 'task/ISSUE-1-example', baseRef: 'origin/main', finalOutput: FULL_SELF_REPORT }, ops);

test('checks off criteria and posts evidence after createPr', () => {
  const calls = [];
  const result = publish(publishOps(calls));
  assert.deepStrictEqual(result, { status: 'done', pr: PR_URL });
  const names = calls.map((call) => (typeof call === 'string' ? call : 'evidence'));
  assert.deepStrictEqual(names, ['commit', 'enablePush', 'push', 'createPr', 'checkOff', 'evidence', 'cleanup']);
  const evidence = calls.find((call) => typeof call !== 'string').evidence;
  assert.strictEqual(evidence[evidence.length - 1], PR_URL);
});

test('skips side effects when createPr fails', () => {
  const calls = [];
  const result = publish(
    publishOps(calls, {
      createPr: () => {
        throw new Error('gh pr create failed');
      },
    }),
  );
  assert.strictEqual(result.status, 'pr_failed');
  assert.ok(!calls.includes('checkOff'));
  assert.ok(!calls.some((call) => typeof call !== 'string'));
  assert.ok(!calls.includes('cleanup'));
});

test('skips side effects when push fails', () => {
  const calls = [];
  const result = publish(
    publishOps(calls, {
      pushBranch: () => {
        throw new Error('rejected');
      },
    }),
  );
  assert.strictEqual(result.status, 'push_failed');
  assert.ok(!calls.includes('createPr'));
  assert.ok(!calls.includes('checkOff'));
});

test('keeps the done result when the evidence comment fails', () => {
  const calls = [];
  const result = publish(
    publishOps(calls, {
      postTestEvidenceComment: () => {
        throw new Error('gh comment failed');
      },
    }),
  );
  assert.deepStrictEqual(result, { status: 'done', pr: PR_URL });
});

// --- runIssue: prepare steps ---

const SANDBOX_ENV = { runsRoot: 'runs-root', rootKey: 'key', agentModel: 'model', sandboxConfig: { image: 'image', allowedHosts: [] } };
const CONFIG = { branchPrefix: 'task/ISSUE-' };

const runOps = (calls, overrides = {}) => ({
  remoteBranchExists: () => {
    calls.push('remoteBranchExists');
    return false;
  },
  prepareClone: () => calls.push('prepareClone'),
  startProxy: () => {
    calls.push('startProxy');
    return { network: 'net', proxyUrl: 'http://proxy', stop: () => calls.push('stopProxy') };
  },
  createSandboxGateRunner: () => () => ({ ok: true }),
  installDependencies: () => calls.push('installDependencies'),
  writeAgentPermissions: () => calls.push('writeAgentPermissions'),
  runIssueInClone: async () => {
    calls.push('runIssueInClone');
    return { status: 'done', pr: PR_URL };
  },
  ...overrides,
});

test('writes agent permissions after installing dependencies', async () => {
  const calls = [];
  await runIssue(CONFIG, new Map(), CHOSEN, SANDBOX_ENV, runOps(calls));
  assert.ok(calls.indexOf('installDependencies') !== -1);
  assert.ok(calls.indexOf('writeAgentPermissions') > calls.indexOf('installDependencies'));
  assert.ok(calls.indexOf('runIssueInClone') > calls.indexOf('writeAgentPermissions'));
});

test('stops with branch_exists when the remote branch exists', async () => {
  const calls = [];
  const result = await runIssue(CONFIG, new Map(), CHOSEN, SANDBOX_ENV, runOps(calls, { remoteBranchExists: () => true }));
  assert.strictEqual(result.status, 'branch_exists');
  assert.match(result.reason, /task\/ISSUE-1-example/);
  assert.deepStrictEqual(calls, []);
});

test('continues when the remote branch is absent', async () => {
  const calls = [];
  const result = await runIssue(CONFIG, new Map(), CHOSEN, SANDBOX_ENV, runOps(calls));
  assert.deepStrictEqual(result, { status: 'done', pr: PR_URL });
  assert.ok(calls.includes('prepareClone'));
  assert.ok(calls.includes('stopProxy'));
});

test('reports prepare_failed when the remote branch lookup fails', async () => {
  const calls = [];
  const result = await runIssue(
    CONFIG,
    new Map(),
    CHOSEN,
    SANDBOX_ENV,
    runOps(calls, {
      remoteBranchExists: () => {
        throw new Error('network down');
      },
    }),
  );
  assert.strictEqual(result.status, 'prepare_failed');
  assert.ok(!calls.includes('prepareClone'));
});
