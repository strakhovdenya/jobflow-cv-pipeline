'use strict';

const { validateAnalysis, validateIndependentResult } = require('./validate');

// Names of the pipeline stages an analysis error can point at. They are the
// same words the validate subcommand takes for --stage, plus the two checks
// that run before any model output exists; none of them is a taxonomy value.
const STAGE_INDEPENDENT = 'independent';
const STAGE_ANALYSIS = 'analysis';
const STAGE_MANIFEST = 'manifest';
const STAGE_MODEL = 'model';

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isRoundKeyPart = (value) =>
  (typeof value === 'string' && value !== '') || typeof value === 'number';

const isRoundKey = (value) =>
  isObject(value) &&
  isRoundKeyPart(value.repository) &&
  isRoundKeyPart(value.verifier_run_id) &&
  isRoundKeyPart(value.verifier_run_attempt);

const roundOf = (manifest) => {
  const source = isObject(manifest) ? manifest : {};
  return {
    round_key: isRoundKey(source.round_key) ? structuredClone(source.round_key) : null,
    head_sha: typeof source.head_sha === 'string' ? source.head_sha : null,
    inputs: isObject(source.inputs) ? structuredClone(source.inputs) : {},
  };
};

// Every assembled analysis has the same shape: a failed one keeps the round
// identity and the input statuses but carries no model values at all, so a
// missing stage is never filled with invented content (AC-7).
const buildAnalysisError = (manifest, stage, problems) => ({
  ...roundOf(manifest),
  error: { stage, problems: [...problems] },
  independent: null,
  analysis: null,
});

const checkStage = (output, stage, validator, taxonomy) => {
  if (output === null || output === undefined) {
    return [`${stage} stage output is missing`];
  }
  const { valid, problems } = validator(output, taxonomy);
  return valid ? [] : problems.map((problem) => `${stage}: ${problem}`);
};

// Stage 1 is copied as a deep clone and never merged with Stage 2 (INV-3):
// the requirement statuses live only under `independent`, and the single
// field both stages could carry, independent_expected_verdict, is always
// taken from Stage 1 — whatever Stage 2 returned for it is discarded.
const assemble = ({ manifest, stage1, stage2, taxonomy }) => {
  if (!isRoundKey(isObject(manifest) ? manifest.round_key : null)) {
    return buildAnalysisError(manifest, STAGE_MANIFEST, [
      'manifest has no round key',
    ]);
  }

  const stage1Problems = checkStage(
    stage1,
    STAGE_INDEPENDENT,
    validateIndependentResult,
    taxonomy,
  );
  if (stage1Problems.length > 0) {
    return buildAnalysisError(manifest, STAGE_INDEPENDENT, stage1Problems);
  }

  const independent = structuredClone(stage1);
  const verdict = independent.independent_expected_verdict;
  const analysis = isObject(stage2)
    ? { ...structuredClone(stage2), independent_expected_verdict: verdict }
    : stage2;
  const stage2Problems = checkStage(
    analysis,
    STAGE_ANALYSIS,
    validateAnalysis,
    taxonomy,
  );
  if (stage2Problems.length > 0) {
    return buildAnalysisError(manifest, STAGE_ANALYSIS, stage2Problems);
  }

  return { ...roundOf(manifest), error: null, independent, analysis };
};

module.exports = {
  STAGE_INDEPENDENT,
  STAGE_ANALYSIS,
  STAGE_MANIFEST,
  STAGE_MODEL,
  buildAnalysisError,
  assemble,
};
