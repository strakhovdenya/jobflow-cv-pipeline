const test = require('node:test');
const assert = require('node:assert');
const { summarizeStatuses } = require('./run');

function statusEntry(overrides) {
  return { id: 1, dependsOn: [], ...overrides };
}

test('summary excludes unapproved issue from ready list', () => {
  const statuses = [
    statusEntry({ id: 1, status: 'unapproved', unapprovedReason: 'нет лейбла spec-approved' }),
    statusEntry({ id: 2, status: 'not-started', ready: true }),
  ];
  const summary = summarizeStatuses(statuses, new Set());
  assert.deepStrictEqual(
    summary.ready.map((e) => e.id),
    [2],
  );
});

test('summary reports unapproved issue with its specific reason', () => {
  const statuses = [
    statusEntry({ id: 1, status: 'unapproved', unapprovedReason: 'нет лейбла spec-approved' }),
    statusEntry({ id: 2, status: 'unapproved', unapprovedReason: 'хеш одобрения не совпадает с текущим телом issue' }),
  ];
  const summary = summarizeStatuses(statuses, new Set());
  const unapprovedLine = summary.lines.find((line) => line.includes('Спека не одобрена'));
  assert.ok(unapprovedLine, 'expected a summary line about unapproved specs');
  assert.match(unapprovedLine, /#1 \(нет лейбла spec-approved\)/);
  assert.match(unapprovedLine, /#2 \(хеш одобрения не совпадает с текущим телом issue\)/);
});

test('summary keeps a ready issue selectable when another issue is unapproved', () => {
  const statuses = [
    statusEntry({ id: 1, status: 'unapproved', unapprovedReason: 'нет лейбла spec-approved' }),
    statusEntry({ id: 2, status: 'not-started', ready: true }),
  ];
  const summary = summarizeStatuses(statuses, new Set());
  assert.strictEqual(summary.ready.length, 1);
  assert.strictEqual(summary.ready[0].id, 2);
});

test('summary does not report everything done while an unapproved issue remains', () => {
  const statuses = [statusEntry({ id: 1, status: 'unapproved', unapprovedReason: 'нет лейбла spec-approved' })];
  const summary = summarizeStatuses(statuses, new Set());
  assert.strictEqual(summary.ready.length, 0);
  assert.ok(!summary.lines.some((line) => line.includes('Все Issue из конфига закрыты')));
});
