'use strict';

const COMMENT_MARKER = '<!-- calibration-judge -->';
const DISCLAIMER =
  '> **Калибровочный разбор, не список исправлений.** ' +
  'Judge наблюдает и не участвует в цикле исправления: ' +
  'исправляющему ИИ передаётся только отчёт верификатора.';

// The hidden block carries base64 of the JSON, so no character sequence the
// model writes (`-->` included) can close the HTML comment early (INV-4).
const HIDDEN_PREFIX = '<!-- calibration-judge-analysis:';
const HIDDEN_SUFFIX = ' -->';
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

const UNKNOWN = 'неизвестен';

// Field names of the analysis shape, not taxonomy values: each list holds
// one class of finding, and its own field name is the label shown.
const FINDING_GROUPS = [
  'issue_defects',
  'implementation_defects',
  'verifier_defects',
  'correct_verifier_findings',
];
const COUNTERFACTUAL_FIELDS = [
  'fix_issue_only',
  'fix_implementation_only',
  'fix_verifier_only',
];
const FINDING_COLUMNS = [
  'Группа',
  'finding_id',
  'Пункт',
  'Подтип',
  'Описание',
  'Доказательства',
];

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

// Model text is untrusted (INV-4): HTML is neutralised, Markdown control
// characters are backslash-escaped and newlines collapse, so a value never
// leaves its table cell or list item.
// A zero-width space after `@` keeps a quoted `@user` or `@org/team` from
// notifying anyone when the comment is posted.
const escapeText = (value) =>
  String(value ?? '')
    .replace(/[&<>]/g, (char) => HTML_ENTITIES[char])
    .replace(/[\\`*_[\]|#~]/g, (char) => `\\${char}`)
    .replace(/@/g, '@​')
    .replace(/\r?\n/g, ' ');

// For identifiers and taxonomy values. Not every such field is validated
// (subtype is free on some finding lists), so `<` and `>` are dropped too:
// nothing rendered can open an HTML comment or forge the hidden block.
const code = (value) => {
  const text = String(value ?? '')
    .replace(/[`\r\n<>]/g, '')
    .replace(/@/g, '@​')
    .replace(/\|/g, '\\|');
  return `\`${text}\``;
};

const optionalCode = (value) =>
  value === null || value === undefined ? '—' : code(value);

const tableRow = (cells) => `| ${cells.join(' | ')} |`;

const tableHead = (columns) => [
  tableRow(columns),
  tableRow(columns.map(() => '---')),
];

const formatRoundKey = (roundKey) => {
  if (roundKey === null) return UNKNOWN;
  const parts = [
    roundKey.repository,
    `run ${roundKey.verifier_run_id}`,
    `attempt ${roundKey.verifier_run_attempt}`,
  ];
  return parts.map(escapeText).join(' · ');
};

const formatEvidence = (item) => {
  const where = item.type === 'code' ? `${item.sha}:${item.path}` : item.ref;
  return `${escapeText(where)} — ${escapeText(item.note)}`;
};

const headOf = (sha) => (sha === null ? UNKNOWN : code(sha));

const renderHeader = (assembled) => [
  COMMENT_MARKER,
  DISCLAIMER,
  '',
  '## Calibration Judge',
  '',
  `Круг: ${formatRoundKey(assembled.round_key)}`,
  `Head: ${headOf(assembled.head_sha)}`,
];

const renderError = (error) => [
  '',
  `### Ошибка разбора (стадия: ${escapeText(error.stage)})`,
  '',
  ...error.problems.map((problem) => `- ${escapeText(problem)}`),
];

const renderRootCause = (analysis) => {
  const verdict = analysis.independent_expected_verdict;
  return [
    '',
    '### Первопричина',
    '',
    `- primary_cause: ${code(analysis.primary_cause)}`,
    `- responsibility: ${code(analysis.responsibility)}`,
    `- confidence: ${code(analysis.confidence)}`,
    `- observed_verdict: ${code(analysis.observed_verdict)}`,
    `- independent_expected_verdict: ${code(verdict)}`,
  ];
};

const renderCounterfactual = (counterfactual) => [
  '',
  '### Контрфактуал',
  '',
  ...tableHead(['Изменение', 'Исход']),
  ...COUNTERFACTUAL_FIELDS.map((field) =>
    tableRow([field, code(counterfactual[field])]),
  ),
];

const renderIndependent = (independent) => [
  '',
  '### Независимая оценка (стадия 1)',
  '',
  ...tableHead(['Пункт', 'Статус', 'Обоснование']),
  ...independent.requirements.map((item) =>
    tableRow([code(item.id), code(item.status), escapeText(item.rationale)]),
  ),
];

const findingRow = (group, finding) =>
  tableRow([
    group,
    escapeText(finding.finding_id),
    optionalCode(finding.criterion_id),
    optionalCode(finding.subtype),
    escapeText(finding.description),
    finding.evidence.map(formatEvidence).join('<br>'),
  ]);

const renderFindings = (analysis) => {
  const rows = FINDING_GROUPS.flatMap((group) =>
    analysis[group].map((finding) => findingRow(group, finding)),
  );
  const header = ['', '### Дефекты и находки', ''];
  if (rows.length === 0) return [...header, 'Нет находок.'];
  return [...header, ...tableHead(FINDING_COLUMNS), ...rows];
};

const renderRecommendations = (analysis) => {
  const targets = analysis.verifier_defects.map((finding) => {
    const target = code(finding.recommended_change_target);
    return `- ${escapeText(finding.finding_id)}: ${target}`;
  });
  const lessons = analysis.systemic_lessons.map(
    (lesson) => `- ${escapeText(lesson)}`,
  );
  const golden = analysis.golden_case_recommendation;
  const body = [];
  if (targets.length > 0) {
    body.push('Что менять в верификаторе:', ...targets, '');
  }
  if (lessons.length > 0) body.push('Системные уроки:', ...lessons, '');
  if (golden !== null) body.push(`Golden-кейс: ${escapeText(golden)}`, '');
  if (body.length === 0) body.push('Нет рекомендаций.');
  return ['', '### Рекомендации', '', ...body];
};

// An input is listed when it was not read at all or was read from a live
// fallback instead of the historical copy (TR-1); a fully historical,
// complete package shows no such section (TR-2).
const renderMissingInputs = (inputs) => {
  const missing = Object.entries(inputs).filter(
    ([, input]) => input.status !== 'present' || input.historical === false,
  );
  if (missing.length === 0) return [];
  const describe = (input) =>
    input.status === 'present' ? 'не исторический' : escapeText(input.status);
  return [
    '',
    '### Отсутствующие или не исторические входы',
    '',
    ...missing.map(([key, input]) => `- ${code(key)}: ${describe(input)}`),
  ];
};

const encodeHiddenBlock = (assembled) => {
  const json = JSON.stringify(assembled);
  const encoded = Buffer.from(json, 'utf8').toString('base64');
  return `${HIDDEN_PREFIX}${encoded}${HIDDEN_SUFFIX}`;
};

const renderBody = (assembled) => {
  if (assembled.error !== null) return renderError(assembled.error);
  const { analysis, independent } = assembled;
  return [
    ...renderRootCause(analysis),
    ...renderCounterfactual(analysis.counterfactual),
    ...renderIndependent(independent),
    ...renderFindings(analysis),
    ...renderRecommendations(analysis),
  ];
};

// Renders an assembled analysis (assemble.js) as the PR comment body. Every
// taxonomy value shown is read from the analysis itself, never from a list
// in this module (INV-6).
const render = (assembled) => {
  const lines = [
    ...renderHeader(assembled),
    ...renderBody(assembled),
    ...renderMissingInputs(assembled.inputs),
    '',
    encodeHiddenBlock(assembled),
  ];
  return `${lines.join('\n')}\n`;
};

// Never throws (AC-13): a missing, truncated, non-base64 or non-JSON block
// is reported as an error instead of a partially restored analysis. The
// real block is always the last line render() writes, so the last prefix is
// the one read.
const decodeHiddenBlock = (comment) => {
  const failure = (reason) => ({ ok: false, analysis: null, error: reason });
  if (typeof comment !== 'string') return failure('comment is not a string');
  const start = comment.lastIndexOf(HIDDEN_PREFIX);
  if (start === -1) return failure('hidden block not found');
  const bodyStart = start + HIDDEN_PREFIX.length;
  const end = comment.indexOf(HIDDEN_SUFFIX, bodyStart);
  if (end === -1) return failure('hidden block is not closed');
  const encoded = comment.slice(bodyStart, end);
  const isBase64 =
    encoded !== '' && encoded.length % 4 === 0 && BASE64.test(encoded);
  if (!isBase64) return failure('hidden block is not valid base64');
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    return { ok: true, analysis: JSON.parse(json), error: null };
  } catch {
    return failure('hidden block is not valid JSON');
  }
};

module.exports = {
  COMMENT_MARKER,
  DISCLAIMER,
  escapeText,
  render,
  decodeHiddenBlock,
};
