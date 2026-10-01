'use strict';

const CRITERION_ID_PATTERN = /^(AC|INV|TR|DOD)-\d+$/;
const SHA1_HEX = /^[0-9a-f]{40}$/;

// Not a taxonomy value (INV-1 scopes the trusted-config requirement to
// primary_cause/responsibility/subtypes/recommended_change_target/
// counterfactual/verdict/requirement_status/confidence/check_source): this is
// the shape of one evidence item, the same kind of hardcoded structural enum
// as acceptance-verdict/common.js's REF_KINDS.
const EVIDENCE_TYPES = new Set(['code', 'input', 'log']);

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isNonEmptyString = (value) => typeof value === 'string' && value !== '';

const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isEvidence = (value) => {
  if (!isObject(value)) return false;
  if (!EVIDENCE_TYPES.has(value.type)) return false;
  if (!isNonEmptyString(value.note)) return false;
  if (value.type === 'code') {
    return (
      typeof value.sha === 'string' &&
      SHA1_HEX.test(value.sha) &&
      isNonEmptyString(value.path)
    );
  }
  return isNonEmptyString(value.ref);
};

const checkEnum = (problems, container, field, allowedValues) => {
  if (!Array.isArray(allowedValues) || !allowedValues.includes(container[field])) {
    problems.push(`${field} is outside taxonomy: ${container[field]}`);
  }
};

const validateEvidence = (finding, label, problems) => {
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
    problems.push(`${label}.evidence must be a non-empty array`);
    return;
  }
  finding.evidence.forEach((item, index) => {
    if (!isEvidence(item)) problems.push(`${label}.evidence[${index}] is invalid`);
  });
};

const validateFinding = (
  finding,
  label,
  { subtypeKey, requireChangeTarget, taxonomy, seenFindingIds },
) => {
  const problems = [];
  if (!isObject(finding)) {
    problems.push(`${label} must be an object`);
    return problems;
  }

  if (!isNonEmptyString(finding.finding_id)) {
    problems.push(`${label}.finding_id is required`);
  } else if (seenFindingIds.has(finding.finding_id)) {
    problems.push(`duplicate finding_id: ${finding.finding_id}`);
  } else {
    seenFindingIds.add(finding.finding_id);
  }

  if (!('criterion_id' in finding)) {
    problems.push(`${label}.criterion_id is required`);
  } else if (
    finding.criterion_id !== null &&
    !CRITERION_ID_PATTERN.test(finding.criterion_id)
  ) {
    problems.push(`${label}.criterion_id is malformed: ${finding.criterion_id}`);
  }

  if (
    'check_source' in finding &&
    finding.check_source !== null &&
    !taxonomy.check_source.includes(finding.check_source)
  ) {
    problems.push(`${label}.check_source is outside taxonomy: ${finding.check_source}`);
  }

  if (subtypeKey !== null) {
    checkEnum(problems, finding, 'subtype', taxonomy[subtypeKey]);
  }

  if (requireChangeTarget) {
    checkEnum(
      problems,
      finding,
      'recommended_change_target',
      taxonomy.recommended_change_target,
    );
  }

  validateEvidence(finding, label, problems);
  return problems;
};

const validateFindings = (list, field, options) => {
  const problems = [];
  if (!Array.isArray(list)) {
    problems.push(`${field} must be an array`);
    return problems;
  }
  list.forEach((finding, index) => {
    problems.push(...validateFinding(finding, `${field}[${index}]`, options));
  });
  return problems;
};

const validateCounterfactual = (counterfactual, taxonomy) => {
  const problems = [];
  if (!isObject(counterfactual)) {
    problems.push('counterfactual must be an object');
    return problems;
  }
  for (const field of [
    'fix_issue_only',
    'fix_implementation_only',
    'fix_verifier_only',
  ]) {
    checkEnum(problems, counterfactual, field, taxonomy.counterfactual_outcome);
  }
  return problems;
};

// Validates a complete Stage 2 analysis against the trusted taxonomy
// (INV-1): every enum-like field is checked against taxonomy.json, never
// against a value literal in this module (AC-21). primary_cause and each
// finding's check_source are validated independently (INV-5) — neither is
// derived from the other.
const validateAnalysis = (analysis, taxonomy) => {
  if (!isObject(analysis)) {
    return { valid: false, problems: ['analysis must be an object'] };
  }

  const problems = [];
  checkEnum(problems, analysis, 'observed_verdict', taxonomy.verdict);
  checkEnum(problems, analysis, 'independent_expected_verdict', taxonomy.verdict);
  checkEnum(problems, analysis, 'primary_cause', taxonomy.primary_cause);
  checkEnum(problems, analysis, 'responsibility', taxonomy.responsibility);
  checkEnum(problems, analysis, 'confidence', taxonomy.confidence);

  const seenFindingIds = new Set();
  problems.push(
    ...validateFindings(analysis.issue_defects, 'issue_defects', {
      subtypeKey: 'issue_defect_subtype',
      requireChangeTarget: false,
      taxonomy,
      seenFindingIds,
    }),
    ...validateFindings(analysis.implementation_defects, 'implementation_defects', {
      subtypeKey: null,
      requireChangeTarget: false,
      taxonomy,
      seenFindingIds,
    }),
    ...validateFindings(analysis.verifier_defects, 'verifier_defects', {
      subtypeKey: 'verifier_defect_subtype',
      requireChangeTarget: true,
      taxonomy,
      seenFindingIds,
    }),
    ...validateFindings(
      analysis.correct_verifier_findings,
      'correct_verifier_findings',
      {
        subtypeKey: null,
        requireChangeTarget: false,
        taxonomy,
        seenFindingIds,
      },
    ),
    ...validateCounterfactual(analysis.counterfactual, taxonomy),
  );

  if (!isStringArray(analysis.systemic_lessons)) {
    problems.push('systemic_lessons must be a string array');
  }
  if (
    analysis.golden_case_recommendation !== null &&
    typeof analysis.golden_case_recommendation !== 'string'
  ) {
    problems.push('golden_case_recommendation must be a string or null');
  }

  return { valid: problems.length === 0, problems };
};

const validateRequirement = (item, label, taxonomy) => {
  const problems = [];
  if (!isObject(item)) {
    problems.push(`${label} must be an object`);
    return problems;
  }
  if (typeof item.id !== 'string' || !CRITERION_ID_PATTERN.test(item.id)) {
    problems.push(`${label}.id is malformed: ${item.id}`);
  }
  if (!isNonEmptyString(item.literal_requirement)) {
    problems.push(`${label}.literal_requirement is required`);
  }
  if (!isNonEmptyString(item.evidence_expected)) {
    problems.push(`${label}.evidence_expected is required`);
  }
  if (typeof item.single_interpretation !== 'boolean') {
    problems.push(`${label}.single_interpretation must be boolean`);
  }
  if (typeof item.verify_proves_requirement !== 'boolean') {
    problems.push(`${label}.verify_proves_requirement must be boolean`);
  }
  checkEnum(problems, item, 'status', taxonomy.requirement_status);
  if (!isNonEmptyString(item.rationale)) {
    problems.push(`${label}.rationale is required`);
  }
  return problems;
};

// Validates a Stage 1 ("independent") result: the contract-reconstruction
// pass that runs before any verifier report is read (see PRD Step 1-2).
const validateIndependentResult = (result, taxonomy) => {
  if (!isObject(result) || !Array.isArray(result.requirements)) {
    return { valid: false, problems: ['requirements must be an array'] };
  }
  const problems = [];
  result.requirements.forEach((item, index) => {
    problems.push(...validateRequirement(item, `requirements[${index}]`, taxonomy));
  });
  return { valid: problems.length === 0, problems };
};

// Fail closed (INV-6): an unreadable/non-array allowlist or an empty
// verifier model reject rather than permit. judgeModel/verifierModel/
// allowlist are all already-parsed values (INV-4); reading the trusted
// allowlist file is the caller's responsibility.
const checkModel = (judgeModel, verifierModel, allowlist) => {
  if (!Array.isArray(allowlist)) {
    return { allowed: false, reason: 'allowlist was not checked' };
  }
  if (!isNonEmptyString(verifierModel)) {
    return { allowed: false, reason: 'verifier model is unknown' };
  }
  if (!isNonEmptyString(judgeModel)) {
    return { allowed: false, reason: 'judge model is empty' };
  }
  if (judgeModel === verifierModel) {
    return { allowed: false, reason: 'judge model equals verifier model' };
  }
  if (!allowlist.includes(judgeModel)) {
    return { allowed: false, reason: `judge model is not in allowlist: ${judgeModel}` };
  }
  return { allowed: true, reason: null };
};

module.exports = {
  CRITERION_ID_PATTERN,
  SHA1_HEX,
  isEvidence,
  validateAnalysis,
  validateIndependentResult,
  checkModel,
};
