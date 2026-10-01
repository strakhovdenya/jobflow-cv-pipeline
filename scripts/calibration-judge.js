'use strict';

const fs = require('node:fs');
const { loadTaxonomy } = require('./calibration-judge/taxonomy');
const { buildSchema } = require('./calibration-judge/schema');
const {
  validateAnalysis,
  validateIndependentResult,
  checkModel,
} = require('./calibration-judge/validate');
const {
  loadInputsConfig,
  collect,
  classifyRun,
} = require('./calibration-judge/collect');
const { loadFingerprintConfig, compareRounds } = require('./calibration-judge/compare');
const { computeTransitions } = require('./calibration-judge/transitions');
const {
  STAGE_INDEPENDENT,
  STAGE_ANALYSIS,
  STAGE_MANIFEST,
  STAGE_MODEL,
  buildAnalysisError,
  assemble,
} = require('./calibration-judge/assemble');
const { render } = require('./calibration-judge/render');
const { toRoundKey, publish } = require('./calibration-judge/publish');

const USAGE =
  'usage:\n' +
  '  calibration-judge.js schema <template.json> --taxonomy <taxonomy.json> ' +
  '[--out <file>]\n' +
  '  calibration-judge.js validate <analysis.json> ' +
  '--stage <independent|analysis> --taxonomy <taxonomy.json>\n' +
  '  calibration-judge.js check-model <judge-model> ' +
  '--verifier-model <model> --allowlist <allowed-models.json>\n' +
  '  calibration-judge.js collect <raw-dir> --inputs <inputs.json> ' +
  '--out <dir>\n' +
  '  calibration-judge.js assemble --manifest <manifest.json> ' +
  '--stage1 <independent.json> --stage2 <analysis.json> ' +
  '--taxonomy <taxonomy.json> [--model-error <reason>] [--out <file>]\n' +
  '  calibration-judge.js render <assembled.json> [--out <file>]\n' +
  '  calibration-judge.js resolve-round --attempts <attempts.json> ' +
  '--inputs <inputs.json> --pr <number> [--run-id <id>] ' +
  '[--run-attempt <n>]\n' +
  '  calibration-judge.js publish <assembled.json> --comments <comments.json> ' +
  '--author <login> --repository <owner/repo> --run-id <id> ' +
  '--run-attempt <n> --out <file> [--id-out <file>]\n' +
  '  calibration-judge.js check-pr --pull <pull.json> --round <round.json> ' +
  '--repository <owner/repo> --branch-prefix <prefix>\n' +
  '  calibration-judge.js compare --current <round-dir> ' +
  '[--previous <round-dir>|none] --inputs <inputs.json> [--out <file>]\n' +
  '  calibration-judge.js transitions --current <round-dir> ' +
  '[--previous <round-dir>|none] [--compare <compare.json>] [--out <file>]';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const readAllowlist = (file) => {
  try {
    const data = readJson(file);
    return Array.isArray(data) && data.every((item) => typeof item === 'string')
      ? data
      : null;
  } catch {
    return null;
  }
};

const parseOptionArgs = (argv) => {
  const options = {
    taxonomy: null,
    out: null,
    stage: null,
    verifierModel: null,
    allowlist: null,
    inputs: null,
    manifest: null,
    stage1: null,
    stage2: null,
    modelError: null,
    attempts: null,
    pr: null,
    runId: null,
    runAttempt: null,
    comments: null,
    author: null,
    repository: null,
    idOut: null,
    pull: null,
    round: null,
    branchPrefix: null,
    previous: null,
    current: null,
    compare: null,
  };
  const positional = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--taxonomy') options.taxonomy = argv[++index] ?? null;
    else if (arg === '--out') options.out = argv[++index] ?? null;
    else if (arg === '--stage') options.stage = argv[++index] ?? null;
    else if (arg === '--verifier-model') options.verifierModel = argv[++index] ?? null;
    else if (arg === '--allowlist') options.allowlist = argv[++index] ?? null;
    else if (arg === '--inputs') options.inputs = argv[++index] ?? null;
    else if (arg === '--manifest') options.manifest = argv[++index] ?? null;
    else if (arg === '--stage1') options.stage1 = argv[++index] ?? null;
    else if (arg === '--stage2') options.stage2 = argv[++index] ?? null;
    else if (arg === '--model-error') options.modelError = argv[++index] ?? null;
    else if (arg === '--attempts') options.attempts = argv[++index] ?? null;
    else if (arg === '--pr') options.pr = argv[++index] ?? null;
    else if (arg === '--run-id') options.runId = argv[++index] ?? null;
    else if (arg === '--run-attempt') options.runAttempt = argv[++index] ?? null;
    else if (arg === '--comments') options.comments = argv[++index] ?? null;
    else if (arg === '--author') options.author = argv[++index] ?? null;
    else if (arg === '--repository') options.repository = argv[++index] ?? null;
    else if (arg === '--id-out') options.idOut = argv[++index] ?? null;
    else if (arg === '--pull') options.pull = argv[++index] ?? null;
    else if (arg === '--round') options.round = argv[++index] ?? null;
    else if (arg === '--branch-prefix') options.branchPrefix = argv[++index] ?? null;
    else if (arg === '--previous') options.previous = argv[++index] ?? null;
    else if (arg === '--current') options.current = argv[++index] ?? null;
    else if (arg === '--compare') options.compare = argv[++index] ?? null;
    else positional.push(arg);
  }
  return { options, positional };
};

const runSchema = (argv) => {
  const { options, positional } = parseOptionArgs(argv);
  const [templateFile] = positional;
  if (templateFile === undefined || options.taxonomy === null) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let schema;
  try {
    const template = readJson(templateFile);
    const taxonomy = loadTaxonomy(options.taxonomy);
    schema = buildSchema(template, taxonomy);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  const output = JSON.stringify(schema, null, 2);
  if (options.out !== null) fs.writeFileSync(options.out, output);
  else process.stdout.write(`${output}\n`);
  return 0;
};

const runValidate = (argv) => {
  const { options, positional } = parseOptionArgs(argv);
  const [analysisFile] = positional;
  if (
    analysisFile === undefined ||
    options.taxonomy === null ||
    (options.stage !== 'independent' && options.stage !== 'analysis')
  ) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let result;
  try {
    const analysis = readJson(analysisFile);
    const taxonomy = loadTaxonomy(options.taxonomy);
    result =
      options.stage === 'independent'
        ? validateIndependentResult(analysis, taxonomy)
        : validateAnalysis(analysis, taxonomy);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  if (result.valid) {
    console.log('VALID');
    return 0;
  }
  process.stderr.write(`${result.problems.join('\n')}\n`);
  return 1;
};

const runCheckModel = (argv) => {
  const { options, positional } = parseOptionArgs(argv);
  const [judgeModel] = positional;
  if (
    judgeModel === undefined ||
    options.verifierModel === null ||
    options.allowlist === null
  ) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const allowlist = readAllowlist(options.allowlist);
  const { allowed, reason } = checkModel(judgeModel, options.verifierModel, allowlist);
  if (allowed) {
    console.log('ALLOWED');
    return 0;
  }
  process.stderr.write(`${reason}\n`);
  return 1;
};

const runCollect = (argv) => {
  const { options, positional } = parseOptionArgs(argv);
  const [rawDir] = positional;
  if (rawDir === undefined || options.inputs === null || options.out === null) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let manifest;
  try {
    const config = loadInputsConfig(options.inputs);
    manifest = collect(rawDir, options.out, config);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  console.log(JSON.stringify(manifest, null, 2));
  return 0;
};

const writeOutput = (text, out) => {
  if (out !== null) fs.writeFileSync(out, text);
  else process.stdout.write(text);
};

// A missing or unparsable model output is not a CLI failure: it becomes an
// analysis error naming the stage, so the round still gets a comment.
const readStageFile = (file, stage) => {
  if (!fs.existsSync(file)) {
    return { value: null, problem: `${stage} stage output file is missing` };
  }
  try {
    return { value: readJson(file), problem: null };
  } catch {
    return { value: null, problem: `${stage} stage output is not valid JSON` };
  }
};

const assembleFromFiles = (options, taxonomy) => {
  const manifestFile = readStageFile(options.manifest, STAGE_MANIFEST);
  const manifest = manifestFile.value;
  if (manifestFile.problem !== null) {
    return buildAnalysisError(manifest, STAGE_MANIFEST, [manifestFile.problem]);
  }
  if (options.modelError !== null) {
    return buildAnalysisError(manifest, STAGE_MODEL, [options.modelError]);
  }
  const stage1 = readStageFile(options.stage1, STAGE_INDEPENDENT);
  if (stage1.problem !== null) {
    return buildAnalysisError(manifest, STAGE_INDEPENDENT, [stage1.problem]);
  }
  const stage2 = readStageFile(options.stage2, STAGE_ANALYSIS);
  if (stage2.problem !== null) {
    return buildAnalysisError(manifest, STAGE_ANALYSIS, [stage2.problem]);
  }
  return assemble({
    manifest,
    stage1: stage1.value,
    stage2: stage2.value,
    taxonomy,
  });
};

const runAssemble = (argv) => {
  const { options } = parseOptionArgs(argv);
  const required = [
    options.manifest,
    options.stage1,
    options.stage2,
    options.taxonomy,
  ];
  if (required.includes(null)) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let taxonomy;
  try {
    taxonomy = loadTaxonomy(options.taxonomy);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  const assembled = assembleFromFiles(options, taxonomy);
  writeOutput(`${JSON.stringify(assembled, null, 2)}\n`, options.out);
  return 0;
};

const runRender = (argv) => {
  const { options, positional } = parseOptionArgs(argv);
  const [assembledFile] = positional;
  if (assembledFile === undefined) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let comment;
  try {
    comment = render(readJson(assembledFile));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  writeOutput(comment, options.out);
  return 0;
};

const startedAt = (attempt) => {
  const time = Date.parse(attempt.run_started_at);
  return Number.isNaN(time) ? 0 : time;
};

const compareAttempts = (left, right) =>
  startedAt(left) - startedAt(right) ||
  Number(left.run_id) - Number(right.run_id) ||
  Number(left.run_attempt) - Number(right.run_attempt);

const matchesFilter = (attempt, runId, runAttempt) =>
  (runId === null || String(attempt.run_id) === String(runId)) &&
  (runAttempt === null || String(attempt.run_attempt) === String(runAttempt));

// Picks the latest attempt classified as a round (collect.js classifyRun):
// a run that did not conclude or a stale run published nothing to the PR
// and is not a round. "No runs at all" and "runs, but none is a round" are
// reported differently, both naming the PR.
const resolveRound = (attempts, roundMeta, filter) => {
  const where = filter.runId === null ? '' : ` for run ${filter.runId}`;
  const candidates = (Array.isArray(attempts) ? attempts : []).filter(
    (attempt) => matchesFilter(attempt, filter.runId, filter.runAttempt),
  );
  if (candidates.length === 0) {
    return {
      round: null,
      error: `PR #${filter.pr}: no verifier runs found${where}`,
    };
  }
  const rounds = candidates.filter(
    (attempt) => classifyRun(attempt, attempt.jobs ?? null, roundMeta).isRound,
  );
  if (rounds.length === 0) {
    return {
      round: null,
      error:
        `PR #${filter.pr}: none of ${candidates.length} verifier run ` +
        `attempts${where} is a round`,
    };
  }
  const latest = rounds.toSorted(compareAttempts).at(-1);
  return {
    round: { run_id: latest.run_id, run_attempt: latest.run_attempt },
    error: null,
  };
};

const runResolveRound = (argv) => {
  const { options } = parseOptionArgs(argv);
  const required = [options.attempts, options.inputs, options.pr];
  if (required.includes(null)) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let attempts;
  let config;
  try {
    attempts = readJson(options.attempts);
    config = loadInputsConfig(options.inputs);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  const { round, error } = resolveRound(attempts, config.roundMeta, {
    pr: options.pr,
    runId: options.runId,
    runAttempt: options.runAttempt,
  });
  if (round === null) {
    process.stderr.write(`${error}\n`);
    return 1;
  }
  console.log(JSON.stringify(round));
  return 0;
};

// An unreadable comments list fails the command instead of being read as
// "no own comment": that guess would post a second Judge comment.
const runPublish = (argv) => {
  const { options, positional } = parseOptionArgs(argv);
  const [assembledFile] = positional;
  const required = [
    options.comments,
    options.author,
    options.repository,
    options.runId,
    options.runAttempt,
    options.out,
  ];
  if (assembledFile === undefined || required.includes(null)) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let result;
  try {
    result = publish({
      comments: readJson(options.comments),
      author: options.author,
      roundKey: toRoundKey({
        repository: options.repository,
        runId: options.runId,
        runAttempt: options.runAttempt,
      }),
      assembled: readJson(assembledFile),
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  fs.writeFileSync(options.out, result.body);
  if (options.idOut !== null) {
    const commentId = result.commentId === null ? '' : String(result.commentId);
    fs.writeFileSync(options.idOut, commentId);
  }
  return 0;
};

const isPresent = (value) =>
  value !== null && value !== undefined && value !== '';

// Decides whether a round may be analysed for a pull request. A verifier
// run started by workflow_run carries the default branch in its own
// metadata, so the PR and head commit come from the round's artifacts
// (round = { pr_number, head_sha }) and are matched against the PR
// (pull = { number, head_ref, head_repo, commit_shas }). Fails closed: a
// round without a head commit, or with no way to tie it to the PR, is
// rejected. The branch prefix is passed in by the caller.
const checkPullRequest = (pull, round, { repository, branchPrefix }) => {
  const reject = (reason) => ({ ok: false, reason });
  const number = pull?.number;
  if (!isPresent(number)) return reject('pull request data is missing');
  if (pull.head_repo !== repository) {
    return reject(`PR #${number} is not from ${repository}`);
  }
  if (typeof pull.head_ref !== 'string' || !pull.head_ref.startsWith(branchPrefix)) {
    return reject(`PR #${number} is not on a ${branchPrefix} branch`);
  }
  const headSha = round?.head_sha;
  if (!isPresent(headSha)) return reject('round has no head commit');
  const roundPr = round.pr_number;
  if (isPresent(roundPr)) {
    return String(roundPr) === String(number)
      ? { ok: true, reason: null }
      : reject(`round belongs to PR #${roundPr}, not PR #${number}`);
  }
  const shas = Array.isArray(pull.commit_shas) ? pull.commit_shas : [];
  return shas.includes(headSha)
    ? { ok: true, reason: null }
    : reject(`round head ${headSha} is not a commit of PR #${number}`);
};

const runCheckPr = (argv) => {
  const { options } = parseOptionArgs(argv);
  const required = [
    options.pull,
    options.round,
    options.repository,
    options.branchPrefix,
  ];
  if (required.includes(null)) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let pull;
  let round;
  try {
    pull = readJson(options.pull);
    round = readJson(options.round);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  const { ok, reason } = checkPullRequest(pull, round, {
    repository: options.repository,
    branchPrefix: options.branchPrefix,
  });
  if (!ok) {
    process.stderr.write(`${reason}\n`);
    return 1;
  }
  console.log('OK');
  return 0;
};

// Reads every file directly inside dir (not "trusted/", collect.js's own
// trusted-config copy), keyed by filename without extension — the same key
// collect.js wrote it under (writeEntry: `${key}${extension}`).
const loadPackageContents = (dir) => {
  const contents = {};
  if (!fs.existsSync(dir)) return contents;
  for (const fileName of fs.readdirSync(dir)) {
    const fullPath = `${dir}/${fileName}`;
    if (!fs.statSync(fullPath).isFile()) continue;
    const key = fileName.replace(/\.[^.]+$/, '');
    try {
      contents[key] = fileName.endsWith('.json')
        ? readJson(fullPath)
        : fs.readFileSync(fullPath, 'utf8');
    } catch {
      contents[key] = null;
    }
  }
  return contents;
};

// Loads one round's manifest plus the raw content of its collected inputs
// (full/ wins over independent/ for a key present in both, same content
// either way) for compareRounds (scripts/calibration-judge/compare.js),
// which itself does no filesystem I/O.
const loadRound = (dir) => {
  const manifest = readJson(`${dir}/manifest.json`);
  const contents = {
    ...loadPackageContents(`${dir}/independent`),
    ...loadPackageContents(`${dir}/full`),
  };
  return { ...manifest, contents };
};

const runCompare = (argv) => {
  const { options } = parseOptionArgs(argv);
  if (options.current === null || options.inputs === null) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let result;
  try {
    const config = loadFingerprintConfig(readJson(options.inputs));
    const current = loadRound(options.current);
    const previous =
      options.previous === null || options.previous === 'none'
        ? null
        : loadRound(options.previous);
    result = compareRounds(previous, current, config);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  writeOutput(`${JSON.stringify(result, null, 2)}\n`, options.out);
  return 0;
};

// One round's verifier outputs for computeTransitions: the files may sit
// directly in dir or in a collected package (independent/, full/, under
// collect.js's keys); a missing or unreadable file is null, not an error.
const loadTransitionRound = (dir) => {
  const contents = {
    ...loadPackageContents(dir),
    ...loadPackageContents(`${dir}/independent`),
    ...loadPackageContents(`${dir}/full`),
  };
  const valueOf = (...keys) => {
    const key = keys.find((name) => contents[name] !== undefined);
    return key === undefined ? null : contents[key];
  };
  return {
    result: valueOf('result'),
    verdict2: valueOf('verdict2'),
    verdict: valueOf('verdict'),
    spec: valueOf('specLint', 'spec-lint'),
  };
};

// The task-change type from the compare subcommand's output; without it the
// type is unknown and no transition is marked FLIP.
const readTaskChangeType = (file) => {
  if (file === null) return null;
  const type = readJson(file)?.taskChange?.type;
  return typeof type === 'string' ? type : null;
};

const runTransitions = (argv) => {
  const { options } = parseOptionArgs(argv);
  if (options.current === null) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let result;
  try {
    const current = loadTransitionRound(options.current);
    const previous =
      options.previous === null || options.previous === 'none'
        ? null
        : loadTransitionRound(options.previous);
    const taskChangeType = readTaskChangeType(options.compare);
    result = computeTransitions(previous, current, taskChangeType);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  writeOutput(`${JSON.stringify(result, null, 2)}\n`, options.out);
  return 0;
};

const main = (argv) => {
  const [command, ...rest] = argv;
  if (command === 'schema') return runSchema(rest);
  if (command === 'validate') return runValidate(rest);
  if (command === 'check-model') return runCheckModel(rest);
  if (command === 'collect') return runCollect(rest);
  if (command === 'assemble') return runAssemble(rest);
  if (command === 'render') return runRender(rest);
  if (command === 'resolve-round') return runResolveRound(rest);
  if (command === 'publish') return runPublish(rest);
  if (command === 'check-pr') return runCheckPr(rest);
  if (command === 'compare') return runCompare(rest);
  if (command === 'transitions') return runTransitions(rest);
  process.stderr.write(`${USAGE}\n`);
  return 2;
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = {
  USAGE,
  readAllowlist,
  parseOptionArgs,
  runSchema,
  runValidate,
  runCheckModel,
  runCollect,
  runAssemble,
  runRender,
  resolveRound,
  checkPullRequest,
  runCheckPr,
  runResolveRound,
  runPublish,
  loadPackageContents,
  loadRound,
  runCompare,
  loadTransitionRound,
  runTransitions,
  main,
};
