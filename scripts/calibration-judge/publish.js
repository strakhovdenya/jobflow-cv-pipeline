'use strict';

const crypto = require('node:crypto');
const { COMMENT_MARKER, escapeText, render } = require('./render');

// One PR comment carries every round's analysis: the visible part is the
// current round, the hidden rounds block keeps one record per round key. The
// block is base64 JSON, like the analysis block in render.js, so nothing the
// model writes can close the HTML comment early.
const ROUNDS_PREFIX = '<!-- calibration-judge-rounds:';
const ROUNDS_SUFFIX = ' -->';
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isKeyPart = (value) =>
  (typeof value === 'string' && value !== '') || typeof value === 'number';

const toRoundKey = ({ repository, runId, runAttempt }) => ({
  repository: String(repository),
  verifier_run_id: String(runId),
  verifier_run_attempt: String(runAttempt),
});

const isRoundKey = (value) =>
  isObject(value) &&
  isKeyPart(value.repository) &&
  isKeyPart(value.verifier_run_id) &&
  isKeyPart(value.verifier_run_attempt);

const isSameRound = (left, right) =>
  String(left.repository) === String(right.repository) &&
  String(left.verifier_run_id) === String(right.verifier_run_id) &&
  String(left.verifier_run_attempt) === String(right.verifier_run_attempt);

const isRecord = (value) =>
  isObject(value) &&
  isRoundKey(value.round_key) &&
  Number.isInteger(value.revision) &&
  value.revision >= 1 &&
  typeof value.sha256 === 'string' &&
  SHA256_HEX.test(value.sha256) &&
  isObject(value.analysis);

const hashAnalysis = (analysis) =>
  crypto.createHash('sha256').update(JSON.stringify(analysis)).digest('hex');

// Only the comment written by the expected author counts: a marker copied
// into a comment by a person or another bot is never read or edited. The
// author login is passed in by the caller, never hardcoded here.
const findOwnComment = (comments, author) => {
  if (!Array.isArray(comments)) return null;
  const isOwn = (comment) =>
    isObject(comment) &&
    isObject(comment.user) &&
    comment.user.login === author &&
    typeof comment.body === 'string' &&
    comment.body.includes(COMMENT_MARKER);
  return comments.find(isOwn) ?? null;
};

const encodeRounds = (records) => {
  const json = JSON.stringify({ rounds: records });
  const encoded = Buffer.from(json, 'utf8').toString('base64');
  return `${ROUNDS_PREFIX}${encoded}${ROUNDS_SUFFIX}`;
};

// Never throws: a missing, truncated, non-base64, non-JSON or wrongly shaped
// block is reported as a reason instead of a partial history.
const decodeRounds = (body) => {
  const failure = (reason) => ({ ok: false, records: [], error: reason });
  if (typeof body !== 'string') return failure('comment is not a string');
  const start = body.lastIndexOf(ROUNDS_PREFIX);
  if (start === -1) return failure('rounds block not found');
  const bodyStart = start + ROUNDS_PREFIX.length;
  const end = body.indexOf(ROUNDS_SUFFIX, bodyStart);
  if (end === -1) return failure('rounds block is not closed');
  const encoded = body.slice(bodyStart, end);
  const isBase64 =
    encoded !== '' && encoded.length % 4 === 0 && BASE64.test(encoded);
  if (!isBase64) return failure('rounds block is not valid base64');
  let data = null;
  try {
    data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    return failure('rounds block is not valid JSON');
  }
  const records = isObject(data) ? data.rounds : null;
  if (!Array.isArray(records) || !records.every(isRecord)) {
    return failure('rounds block has an invalid shape');
  }
  return { ok: true, records, error: null };
};

// The record of this round key is replaced by a new revision; records of
// other rounds are kept as they are and in their order.
const mergeRecord = (previous, roundKey, analysis) => {
  const index = previous.findIndex((item) =>
    isSameRound(item.round_key, roundKey),
  );
  const revision = index === -1 ? 1 : previous[index].revision + 1;
  const record = {
    round_key: roundKey,
    revision,
    sha256: hashAnalysis(analysis),
    analysis,
  };
  const records = [...previous];
  if (index === -1) records.push(record);
  else records[index] = record;
  return { records, record };
};

const renderFooter = (record, roundCount, historyError) => {
  const lines = [
    '',
    `Ревизия разбора этого круга: ${record.revision} · ` +
      `sha256 \`${record.sha256}\``,
    `Кругов в истории разборов: ${roundCount}`,
  ];
  if (historyError !== null) {
    lines.push(
      '',
      '> **Прежняя история разборов не прочитана** ' +
        `(${escapeText(historyError)}); сохранён только этот круг.`,
    );
  }
  return lines;
};

// Builds the comment body for this round. Returns the id of the comment to
// update (null when a new comment must be created) and the merged records.
const publish = ({ comments, author, roundKey, assembled }) => {
  const own = findOwnComment(comments, author);
  const decoded = own === null ? null : decodeRounds(own.body);
  const previous = decoded === null ? [] : decoded.records;
  const historyError =
    decoded === null || decoded.ok ? null : decoded.error;
  const { records, record } = mergeRecord(previous, roundKey, assembled);
  const lines = [
    render(assembled).trimEnd(),
    ...renderFooter(record, records.length, historyError),
    '',
    encodeRounds(records),
  ];
  return {
    commentId: own === null ? null : own.id,
    body: `${lines.join('\n')}\n`,
    records,
    record,
    historyError,
  };
};

module.exports = {
  toRoundKey,
  hashAnalysis,
  findOwnComment,
  encodeRounds,
  decodeRounds,
  mergeRecord,
  publish,
};
