'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { COMMENT_MARKER } = require('./render');
const { buildAnalysisError } = require('./assemble');
const {
  toRoundKey,
  hashAnalysis,
  findOwnComment,
  encodeRounds,
  decodeRounds,
  mergeRecord,
  publish,
} = require('./publish');

const AUTHOR = 'judge-bot[bot]';
const REPOSITORY = 'owner/repo';

const keyOf = (runId, runAttempt) =>
  toRoundKey({ repository: REPOSITORY, runId, runAttempt });

const assembledFor = (runId, runAttempt, problem) =>
  buildAnalysisError(
    {
      round_key: {
        repository: REPOSITORY,
        verifier_run_id: runId,
        verifier_run_attempt: runAttempt,
      },
      head_sha: null,
      inputs: {},
    },
    'model',
    [problem],
  );

const commentOf = (id, login, body) => ({ id, user: { login }, body });

const publishRound = (comments, runId, runAttempt, problem) =>
  publish({
    comments,
    author: AUTHOR,
    roundKey: keyOf(runId, runAttempt),
    assembled: assembledFor(runId, runAttempt, problem),
  });

test('replaces same round and keeps other rounds', () => {
  const first = publishRound([], 100, 1, 'round one');
  const second = publishRound(
    [commentOf(7, AUTHOR, first.body)],
    200,
    1,
    'round two',
  );
  const replaced = publishRound(
    [commentOf(7, AUTHOR, second.body)],
    100,
    1,
    'round one again',
  );

  assert.strictEqual(replaced.commentId, 7);
  assert.strictEqual(replaced.records.length, 2);
  const [roundOne, roundTwo] = replaced.records;
  assert.deepStrictEqual(roundOne.round_key, keyOf(100, 1));
  assert.strictEqual(roundOne.revision, 2);
  assert.deepStrictEqual(roundOne.analysis.error.problems, ['round one again']);
  assert.strictEqual(roundOne.sha256, hashAnalysis(roundOne.analysis));
  assert.notStrictEqual(roundOne.sha256, first.record.sha256);
  assert.deepStrictEqual(roundTwo, second.records[1]);
  assert.ok(replaced.body.includes(roundOne.sha256));
  assert.ok(replaced.body.includes('round one again'));

  const decoded = decodeRounds(replaced.body);
  assert.strictEqual(decoded.ok, true);
  assert.deepStrictEqual(decoded.records, replaced.records);
});

test('rerun does not add a round', () => {
  const first = publishRound([], 300, 2, 'first');
  const rerun = publishRound([commentOf(9, AUTHOR, first.body)], 300, 2, 'rerun');
  const again = publishRound([commentOf(9, AUTHOR, rerun.body)], 300, 2, 'rerun');

  assert.strictEqual(first.records.length, 1);
  assert.strictEqual(rerun.records.length, 1);
  assert.strictEqual(again.records.length, 1);
  assert.strictEqual(first.record.revision, 1);
  assert.strictEqual(rerun.record.revision, 2);
  assert.strictEqual(again.record.revision, 3);
});

test('another attempt of the same run is a separate round', () => {
  const first = publishRound([], 300, 1, 'attempt one');
  const second = publishRound(
    [commentOf(9, AUTHOR, first.body)],
    300,
    2,
    'attempt two',
  );
  assert.strictEqual(second.records.length, 2);
  assert.strictEqual(second.record.revision, 1);
});

test('ignores marker comments from other authors', () => {
  const existing = publishRound([], 400, 1, 'existing');
  const forged = encodeRounds([
    {
      round_key: keyOf(400, 1),
      revision: 41,
      sha256: 'a'.repeat(64),
      analysis: { forged: true },
    },
  ]);
  const comments = [
    commentOf(1, 'someone', `${COMMENT_MARKER}\n${forged}`),
    commentOf(2, 'other-tool[bot]', `${COMMENT_MARKER}\n${forged}`),
    commentOf(3, AUTHOR, existing.body),
  ];

  assert.strictEqual(findOwnComment(comments, AUTHOR).id, 3);
  const result = publishRound(comments, 400, 1, 'next');
  assert.strictEqual(result.commentId, 3);
  assert.strictEqual(result.record.revision, 2);

  const onlyForeign = publishRound(comments.slice(0, 2), 400, 1, 'next');
  assert.strictEqual(onlyForeign.commentId, null);
  assert.strictEqual(onlyForeign.record.revision, 1);
  assert.strictEqual(onlyForeign.historyError, null);
});

test('survives unreadable previous hidden block', () => {
  const broken = [
    `${COMMENT_MARKER}\n<!-- calibration-judge-rounds:not*base64 -->`,
    `${COMMENT_MARKER}\n<!-- calibration-judge-rounds:${Buffer.from('{').toString('base64')} -->`,
    `${COMMENT_MARKER}\n<!-- calibration-judge-rounds:${Buffer.from('{"rounds":[1]}').toString('base64')} -->`,
    `${COMMENT_MARKER}\n<!-- calibration-judge-rounds:abcd`,
    `${COMMENT_MARKER}\nno block at all`,
  ];
  for (const body of broken) {
    const result = publishRound([commentOf(5, AUTHOR, body)], 500, 1, 'new');
    assert.strictEqual(result.commentId, 5);
    assert.notStrictEqual(result.historyError, null);
    assert.strictEqual(result.records.length, 1);
    assert.deepStrictEqual(result.record.analysis.error.problems, ['new']);
    assert.ok(result.body.includes('Прежняя история разборов не прочитана'));
    assert.strictEqual(decodeRounds(result.body).ok, true);
  }
});

test('mergeRecord keeps the input list unchanged', () => {
  const previous = mergeRecord([], keyOf(1, 1), { a: 1 }).records;
  const snapshot = structuredClone(previous);
  mergeRecord(previous, keyOf(1, 1), { a: 2 });
  assert.deepStrictEqual(previous, snapshot);
});

test('round keys compare numbers and strings alike', () => {
  const previous = mergeRecord(
    [],
    { repository: REPOSITORY, verifier_run_id: 10, verifier_run_attempt: 1 },
    { a: 1 },
  ).records;
  const { records, record } = mergeRecord(previous, keyOf('10', '1'), { a: 2 });
  assert.strictEqual(records.length, 1);
  assert.strictEqual(record.revision, 2);
});
