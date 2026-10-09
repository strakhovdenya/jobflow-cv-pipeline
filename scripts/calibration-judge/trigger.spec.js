'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  EVENT_ROUND,
  EVENT_LABELED,
  decideTrigger,
  extractIssueNumber,
} = require('./trigger');

const LABEL = 'mark-for-analysis';
const OWNERS = ['maintainer'];
const HEAD = 'a'.repeat(40);
const OLD_HEAD = 'b'.repeat(40);

const labeledBy = (login, label = LABEL) => ({
  event: 'labeled',
  label: { name: label },
  actor: { login },
});

const unlabeledBy = (login, label = LABEL) => ({
  event: 'unlabeled',
  label: { name: label },
  actor: { login },
});

const ownerLabel = [labeledBy('maintainer')];

const input = (overrides = {}) => ({
  event: EVENT_ROUND,
  verdict: 'FAIL',
  label: LABEL,
  owners: OWNERS,
  pullTimeline: [],
  issueTimeline: [],
  eventLabel: null,
  roundHead: HEAD,
  currentHead: HEAD,
  ...overrides,
});

test('runs on FAIL when owner labeled the issue', () => {
  const result = decideTrigger(input({ issueTimeline: ownerLabel }));
  assert.strictEqual(result.run, true);
  assert.match(result.reason, /issue/);
});

test('runs on NEEDS_HUMAN when owner labeled the pull request', () => {
  const result = decideTrigger(
    input({ verdict: 'NEEDS_HUMAN', pullTimeline: ownerLabel }),
  );
  assert.strictEqual(result.run, true);
  assert.match(result.reason, /pull request/);
});

test('skips PASS even with owner label', () => {
  const result = decideTrigger(
    input({
      verdict: 'PASS',
      issueTimeline: ownerLabel,
      pullTimeline: ownerLabel,
    }),
  );
  assert.strictEqual(result.run, false);
});

test('skips FAIL without label', () => {
  const result = decideTrigger(input());
  assert.strictEqual(result.run, false);
  assert.match(result.reason, /no label/);
});

test('skips NEEDS_HUMAN without label', () => {
  const result = decideTrigger(input({ verdict: 'NEEDS_HUMAN' }));
  assert.strictEqual(result.run, false);
});

test('ignores label set by non-owner or bot', () => {
  const byStranger = decideTrigger(
    input({ issueTimeline: [labeledBy('stranger')] }),
  );
  const byBot = decideTrigger(
    input({ pullTimeline: [labeledBy('github-actions[bot]')] }),
  );
  const byBotOwner = decideTrigger(
    input({
      owners: ['maintainer[bot]'],
      pullTimeline: [labeledBy('maintainer[bot]')],
    }),
  );
  assert.strictEqual(byStranger.run, false);
  assert.strictEqual(byBot.run, false);
  assert.strictEqual(byBotOwner.run, false);
});

test('skips when label was removed', () => {
  const result = decideTrigger(
    input({
      pullTimeline: [labeledBy('maintainer'), unlabeledBy('maintainer')],
    }),
  );
  assert.strictEqual(result.run, false);
});

test('skips when verdict is missing or unknown', () => {
  for (const verdict of [undefined, null, '', 'pass', 'ERROR', 'UNKNOWN']) {
    const result = decideTrigger(
      input({ verdict, pullTimeline: ownerLabel, issueTimeline: ownerLabel }),
    );
    assert.strictEqual(result.run, false, String(verdict));
  }
});

test('extracts issue number from task branch', () => {
  assert.strictEqual(extractIssueNumber('task/ISSUE-123-name', 'task/ISSUE-'), 123);
  assert.strictEqual(extractIssueNumber('task/ISSUE-7-x', 'task/ISSUE-'), 7);
});

test('branch without issue number leaves only pull request label', () => {
  for (const branch of [
    'feature/other',
    'task/ISSUE-abc-name',
    'task/ISSUE-0-name',
    'task/ISSUE-12abc',
    'task/ISSUE-7',
    'task/ISSUE-',
    '',
    null,
    undefined,
  ]) {
    assert.strictEqual(extractIssueNumber(branch, 'task/ISSUE-'), null);
  }
  assert.strictEqual(extractIssueNumber('task/ISSUE-5-x', ''), null);
  const result = decideTrigger(
    input({ issueTimeline: null, pullTimeline: ownerLabel }),
  );
  assert.strictEqual(result.run, true);
});

test('runs on label added after the round finished', () => {
  const result = decideTrigger(
    input({
      event: EVENT_LABELED,
      eventLabel: LABEL,
      pullTimeline: ownerLabel,
    }),
  );
  assert.strictEqual(result.run, true);
});

test('skips labeled event while verifier round is unfinished', () => {
  const older = decideTrigger(
    input({
      event: EVENT_LABELED,
      eventLabel: LABEL,
      roundHead: OLD_HEAD,
      pullTimeline: ownerLabel,
    }),
  );
  const missing = decideTrigger(
    input({
      event: EVENT_LABELED,
      eventLabel: LABEL,
      roundHead: null,
      pullTimeline: ownerLabel,
    }),
  );
  assert.strictEqual(older.run, false);
  assert.strictEqual(missing.run, false);
});

test('runs next round when label already present', () => {
  const result = decideTrigger(
    input({
      event: EVENT_ROUND,
      roundHead: HEAD,
      currentHead: OLD_HEAD,
      issueTimeline: ownerLabel,
    }),
  );
  assert.strictEqual(result.run, true);
});

test('ignores label events for other labels', () => {
  const result = decideTrigger(
    input({
      event: EVENT_LABELED,
      eventLabel: 'bug',
      pullTimeline: ownerLabel,
    }),
  );
  assert.strictEqual(result.run, false);
});

test('runs once when both issue and pull request are labeled', () => {
  const result = decideTrigger(
    input({ issueTimeline: ownerLabel, pullTimeline: ownerLabel }),
  );
  assert.strictEqual(result.run, true);
  assert.strictEqual(typeof result.reason, 'string');
});

test('uses label name given by caller', () => {
  const timeline = [labeledBy('maintainer', 'another-name')];
  const other = decideTrigger(input({ pullTimeline: timeline }));
  const named = decideTrigger(
    input({ pullTimeline: timeline, label: 'another-name' }),
  );
  const unnamed = decideTrigger(
    input({ pullTimeline: timeline, label: undefined }),
  );
  assert.strictEqual(other.run, false);
  assert.strictEqual(named.run, true);
  assert.strictEqual(unnamed.run, false);
});

test('skips an unknown trigger event', () => {
  const result = decideTrigger(
    input({ event: 'push', pullTimeline: ownerLabel }),
  );
  assert.strictEqual(result.run, false);
});
