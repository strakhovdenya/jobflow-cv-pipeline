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
const SPEC_NOT_APPROVED = 'spec not approved';
const SPEC_CHANGED = 'spec changed after approval';
const LEGACY_NOT_APPROVED = 'Spec approval: not approved (legacy)';

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
    provenance,
  },
) => {
  const failures = [];
  if (provenance === null) failures.push(PROVENANCE_MISSING);
  if (report.criteria.length === 0) failures.push('no criteria were checked');
  for (const criterion of report.criteria) {
    const label = labelOf(criterion);
    if (criterion.status === STATUS_FAIL) {
      failures.push(`criterion failed: ${label}`);
    }
    const isBlockingUnverifiable =
      criterion.status === STATUS_UNVERIFIABLE && !manualVerified;
    if (isBlockingUnverifiable) {
      failures.push(`criterion unverifiable: ${label}`);
    }
    const isUnsupportedPass =
      !criterion.computed &&
      criterion.status === STATUS_PASS &&
      criterion.refs.length === 0;
    if (isUnsupportedPass) {
      failures.push(`criterion passed without references: ${label}`);
    }
  }
  for (const invariant of report.invariants) {
    if (invariant.status === STATUS_FAIL) {
      failures.push(`invariant failed: ${invariant.id}`);
    }
    const isUnsupportedPass =
      invariant.status === STATUS_PASS && invariant.refs.length === 0;
    if (isUnsupportedPass) {
      failures.push(`invariant passed without references: ${invariant.id}`);
    }
  }
  for (const item of report.test_tampering) {
    failures.push(`test tampering: ${item}`);
  }
  if (tamperingFindings === null) {
    failures.push(TAMPERING_SCAN_NOT_RUN);
  } else {
    for (const item of tamperingFindings) {
      failures.push(`test tampering (scan): ${item}`);
    }
    // The owner's approval excuses only assertion losses, never the other
    // scanner findings, the model's test_tampering or UNVERIFIABLE.
    if (!testRemovalApproved) {
      for (const loss of assertionLosses) {
        failures.push(`test tampering (scan): ${describeLoss(loss)}`);
      }
    }
  }
  if (specFormat !== 'v2') {
    for (const file of report.out_of_scope_files) {
      failures.push(`out of scope file: ${file}`);
    }
  }
  if (refsProblems === null) {
    failures.push('references were not checked');
  } else {
    for (const item of refsProblems) failures.push(`bad reference: ${item}`);
  }
  if (ciFailures === null) failures.push('CI results were not checked');
  else failures.push(...ciFailures);
  return failures;
};

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
  const fail = (failures) => ({
    passed: false,
    report: null,
    failures,
    specFormat,
    specItems,
    approvalNote,
    assertions,
    provenance,
    refsNotesByKey: new Map(),
  });
  if (spec !== undefined && isSpecInvalid(spec)) {
    return fail(spec.problems.map((problem) => `spec invalid: ${problem}`));
  }
  const preFailures = [
    ...(spec === null ? [SPEC_NOT_CHECKED] : []),
    ...approvalCheck.failures,
    ...checkScope(scope, specFormat),
  ];
  if (raw === null) return fail([...preFailures, 'no report']);
  const { report: parsed, problem } = parseReport(raw);
  if (parsed === null) return fail([...preFailures, problem]);
  const report = mergeComputed(parsed, computedItems);
  const failures = [
    ...preFailures,
    ...collectFailures(report, {
      manualVerified,
      refsProblems,
      ciFailures,
      tamperingFindings,
      assertionLosses,
      testRemovalApproved,
      specFormat,
      provenance,
    }),
  ];
  return {
    passed: failures.length === 0,
    report,
    failures,
    specFormat,
    specItems,
    approvalNote,
    assertions,
    provenance,
    refsNotesByKey: notesByKey(parsed, refsNotes),
  };
};

module.exports = {
  SPEC_NOT_CHECKED,
  SCOPE_NOT_CHECKED,
  APPROVAL_NOT_CHECKED,
  TAMPERING_SCAN_NOT_RUN,
  PROVENANCE_MISSING,
  SPEC_NOT_APPROVED,
  SPEC_CHANGED,
  LEGACY_NOT_APPROVED,
  checkScope,
  checkApproval,
  collectFailures,
  mergeComputed,
  evaluate,
};
