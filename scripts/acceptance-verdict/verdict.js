'use strict';

const {
  STATUS_PASS,
  STATUS_FAIL,
  STATUS_UNVERIFIABLE,
  labelOf,
  specItemsOf,
  isSpecInvalid,
} = require('./common');
const { parseReport } = require('./inputs');
const { notesByKey } = require('./refs');

const SPEC_NOT_CHECKED = 'spec was not checked';
const SCOPE_NOT_CHECKED = 'scope was not checked';
const APPROVAL_NOT_CHECKED = 'spec approval was not checked';
const TAMPERING_SCAN_NOT_RUN = 'tampering scan was not run';
const PROVENANCE_MISSING = 'provenance missing';
const ALLOWED_MODELS_NOT_CHECKED = 'allowed models were not checked';
const modelNotAllowed = (model) =>
  `VERIFIER_MODEL is not in allowed-models.json: ${model}`;
const SPEC_NOT_APPROVED = 'spec not approved';
const SPEC_CHANGED = 'spec changed after approval';
const LEGACY_NOT_APPROVED = 'Spec approval: not approved (legacy)';

// Where a FAIL reason comes from: the model's
// own judgement, or a check computed by code. second-run.js decides on this
// source, never on the reason text.
const SOURCE_MODEL = 'model';
const SOURCE_DETERMINISTIC = 'deterministic';

const modelReason = (text) => ({ text, source: SOURCE_MODEL });
const deterministicReason = (text) => ({ text, source: SOURCE_DETERMINISTIC });
const textsOf = (reasons) => reasons.map((reason) => reason.text);

const describeLoss = ({ path: file, lost }) =>
  `${file}: ${lost} assertion line(s) removed without a matching added line`;

// Applies only to v2 issues: a legacy issue keeps relying on the model's own
// out_of_scope_files, handled in collectFailures.
const checkScope = (scopeResult, specFormat) => {
  if (specFormat !== 'v2') return [];
  if (scopeResult === undefined || scopeResult === null) {
    return [SCOPE_NOT_CHECKED];
  }
  return scopeResult.out_of_scope.map(
    (file) => `out of scope file (computed): ${file}`,
  );
};

// A changed spec fails for every format; a missing approval fails unless the
// issue is known to be legacy, where it is only noted in the comment.
const checkApproval = (approval, specFormat) => {
  const result = (failures, note = null) => ({ failures, note });
  if (approval === undefined) return result([]);
  if (approval === null) return result([APPROVAL_NOT_CHECKED]);
  if (approval.approved_hash === null) {
    if (specFormat === 'legacy') return result([], LEGACY_NOT_APPROVED);
    return result([SPEC_NOT_APPROVED]);
  }
  if (approval.approved_hash !== approval.current_hash) {
    return result([SPEC_CHANGED]);
  }
  return result([]);
};

const scanReasons = ({
  tamperingFindings,
  assertionLosses,
  testRemovalApproved,
}) => {
  if (tamperingFindings === null) {
    return [deterministicReason(TAMPERING_SCAN_NOT_RUN)];
  }
  const texts = tamperingFindings.map((item) => `test tampering (scan): ${item}`);
  // The owner's approval excuses only assertion losses, never the other
  // scanner findings, the model's test_tampering or UNVERIFIABLE.
  if (!testRemovalApproved) {
    for (const loss of assertionLosses) {
      texts.push(`test tampering (scan): ${describeLoss(loss)}`);
    }
  }
  return texts.map(deterministicReason);
};

const ciReasons = (ciFailures) => {
  if (ciFailures === null) {
    return [deterministicReason('CI results were not checked')];
  }
  return ciFailures.map(deterministicReason);
};

// VERIFIER_MODEL is only checked against provenanceModel when provenance
// itself was read successfully; a missing provenance already fails via
// PROVENANCE_MISSING and this would only duplicate that reason.
const modelAllowedReasons = (allowedModels, provenanceModel) => {
  if (allowedModels === null) {
    return [deterministicReason(ALLOWED_MODELS_NOT_CHECKED)];
  }
  const isNotAllowed =
    provenanceModel !== null && !allowedModels.includes(provenanceModel);
  if (isNotAllowed) return [deterministicReason(modelNotAllowed(provenanceModel))];
  return [];
};

const collectFailures = (
  report,
  {
    manualVerified,
    refsProblems,
    ciFailures,
    specFormat,
    tamperingFindings,
    assertionLosses,
    testRemovalApproved,
    allowedModels,
    provenanceModel,
  },
) => {
  const reasons = [];
  const model = (text) => reasons.push(modelReason(text));
  const deterministic = (text) => reasons.push(deterministicReason(text));
  if (report.criteria.length === 0) model('no criteria were checked');
  for (const criterion of report.criteria) {
    const label = labelOf(criterion);
    // A computed ci/absence entry is decided by code, not by the model.
    const add = criterion.computed ? deterministic : model;
    if (criterion.status === STATUS_FAIL) add(`criterion failed: ${label}`);
    const isBlockingUnverifiable =
      criterion.status === STATUS_UNVERIFIABLE && !manualVerified;
    if (isBlockingUnverifiable) add(`criterion unverifiable: ${label}`);
    const isUnsupportedPass =
      !criterion.computed &&
      criterion.status === STATUS_PASS &&
      criterion.refs.length === 0;
    if (isUnsupportedPass) {
      model(`criterion passed without references: ${label}`);
    }
  }
  for (const invariant of report.invariants) {
    if (invariant.status === STATUS_FAIL) {
      model(`invariant failed: ${invariant.id}`);
    }
    const isUnsupportedPass =
      invariant.status === STATUS_PASS && invariant.refs.length === 0;
    if (isUnsupportedPass) {
      model(`invariant passed without references: ${invariant.id}`);
    }
  }
  for (const item of report.test_tampering) model(`test tampering: ${item}`);
  reasons.push(
    ...scanReasons({ tamperingFindings, assertionLosses, testRemovalApproved }),
  );
  if (specFormat !== 'v2') {
    for (const file of report.out_of_scope_files) {
      model(`out of scope file: ${file}`);
    }
  }
  if (refsProblems === null) {
    model('references were not checked');
  } else {
    for (const item of refsProblems) model(`bad reference: ${item}`);
  }
  reasons.push(...ciReasons(ciFailures));
  reasons.push(...modelAllowedReasons(allowedModels, provenanceModel));
  return reasons;
};

// The deterministic inputs that do not depend on the model report; also
// checked when there is no report, so a missing report next to a red check
// is never mistaken for a model-only FAIL.
const inputReasons = (options) => [
  ...options.computedItems
    .filter(({ status }) => status === STATUS_FAIL)
    .map(({ id }) => deterministicReason(`criterion failed: ${id}`)),
  ...scanReasons(options),
  ...ciReasons(options.ciFailures),
  ...modelAllowedReasons(options.allowedModels, options.provenanceModel),
];

// Merges deterministically computed ci/absence entries into the model's own
// criteria: a computed id always wins over whatever the model reported for
// it (AC-8 — a stray model entry for that id is discarded, not compared).
const mergeComputed = (report, computedItems) => {
  if (computedItems.length === 0) return report;
  const computedIds = new Set(computedItems.map((entry) => entry.id));
  const criteria = [
    ...report.criteria.filter((entry) => !computedIds.has(entry.id)),
    ...computedItems,
  ];
  return { ...report, criteria };
};

const evaluate = (
  raw,
  {
    manualVerified = false,
    refsProblems = null,
    refsNotes = [],
    ciFailures = null,
    tamperingFindings = null,
    assertionLosses = [],
    assertionMoved = 0,
    testRemovalApproved = false,
    provenance = null,
    allowedModels = null,
    spec,
    approval,
    scope,
    computedItems = [],
  } = {},
) => {
  const assertions = {
    losses: assertionLosses,
    moved: assertionMoved,
    isApproved: testRemovalApproved,
  };
  const specFormat =
    spec !== undefined && spec !== null ? spec.format : undefined;
  const specItems = specItemsOf(spec);
  const approvalCheck = checkApproval(approval, specFormat);
  const approvalNote = approvalCheck.note;
  // Checked before any report-parsing branch (including the earliest
  // isSpecInvalid return) so a missing/malformed provenance.json is never
  // silently skipped regardless of which path the verdict takes (INV-6).
  const provenanceFailures =
    provenance === null ? [deterministicReason(PROVENANCE_MISSING)] : [];
  const fail = (reasons) => {
    const all = [...provenanceFailures, ...reasons];
    return {
      passed: false,
      report: null,
      failures: textsOf(all),
      reasons: all,
      specFormat,
      specItems,
      approvalNote,
      assertions,
      provenance,
      refsNotesByKey: new Map(),
    };
  };
  if (spec !== undefined && isSpecInvalid(spec)) {
    const invalid = spec.problems.map((problem) => `spec invalid: ${problem}`);
    return fail(invalid.map(deterministicReason));
  }
  const preFailures = [
    ...(spec === null ? [SPEC_NOT_CHECKED] : []),
    ...approvalCheck.failures,
    ...checkScope(scope, specFormat),
  ].map(deterministicReason);
  const provenanceModel = provenance === null ? null : provenance.model;
  const failWithoutReport = (text) =>
    fail([
      ...preFailures,
      modelReason(text),
      ...inputReasons({
        computedItems,
        tamperingFindings,
        assertionLosses,
        testRemovalApproved,
        ciFailures,
        allowedModels,
        provenanceModel,
      }),
    ]);
  if (raw === null) return failWithoutReport('no report');
  const { report: parsed, problem } = parseReport(raw);
  if (parsed === null) return failWithoutReport(problem);
  const report = mergeComputed(parsed, computedItems);
  const reasons = [
    ...provenanceFailures,
    ...preFailures,
    ...collectFailures(report, {
      manualVerified,
      refsProblems,
      ciFailures,
      tamperingFindings,
      assertionLosses,
      testRemovalApproved,
      specFormat,
      allowedModels,
      provenanceModel,
    }),
  ];
  return {
    passed: reasons.length === 0,
    report,
    failures: textsOf(reasons),
    reasons,
    specFormat,
    specItems,
    approvalNote,
    assertions,
    provenance,
    refsNotesByKey: notesByKey(parsed, refsNotes),
  };
};

module.exports = {
  SOURCE_MODEL,
  SOURCE_DETERMINISTIC,
  SPEC_NOT_CHECKED,
  SCOPE_NOT_CHECKED,
  APPROVAL_NOT_CHECKED,
  TAMPERING_SCAN_NOT_RUN,
  PROVENANCE_MISSING,
  ALLOWED_MODELS_NOT_CHECKED,
  SPEC_NOT_APPROVED,
  SPEC_CHANGED,
  LEGACY_NOT_APPROVED,
  checkScope,
  checkApproval,
  collectFailures,
  mergeComputed,
  evaluate,
};
