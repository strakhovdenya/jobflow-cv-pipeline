const test = require('node:test');
const assert = require('node:assert');
const { classify, SPEC_APPROVED_LABEL } = require('./github');
const { hash, marker, APPROVAL_AUTHOR } = require('../../scripts/spec-hash');

const BASE_BODY = '## Acceptance Criteria\n\n- [ ] AC-1 do the thing\n';

function approvalComment(body) {
  return {
    author: { login: APPROVAL_AUTHOR },
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
    comments: [{ author: { login: 'some-user' }, body: `${marker(hash(BASE_BODY))}\nSpec approved.\n` }],
  });
  const statuses = classify(config([{ id: 1 }]), { getIssueState: () => info, checkExistingPr: () => false });
  assert.strictEqual(statuses[0].status, 'unapproved');
});
