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
const {
  toRoundKey,
  findOwnComment,
  decodeRounds,
  publish,
} = require('./calibration-judge/publish');

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
  '--taxonomy <taxonomy.json> [--model-error <reason>] ' +
  '[--previous <previous-round.json>] [--compare <compare.json>] ' +
  '[--transitions <transitions.json>] [--out <file>]\n' +
  '  calibration-judge.js render <assembled.json> [--out <file>]\n' +
  '  calibration-judge.js resolve-round --attempts <attempts.json> ' +
  '--inputs <inputs.json> --pr <number> [--run-id <id>] ' +
  '[--run-attempt <n>]\n' +
  '  calibration-judge.js publish <assembled.json> --comments <comments.json> ' +
  '--author <login> --repository <owner/repo> --run-id <id> ' +
  '--run-attempt <n> --out <file> [--id-out <file>]\n' +
  '  calibration-judge.js previous-round --comments <comments.json> ' +
  '--author <login> --repository <owner/repo> --run-id <id> ' +
  '--run-attempt <n> [--out <file>]\n' +
  '  calibration-judge.js check-pr --pull <pull.json> --round <round.json> ' +
  '--repository <owner/repo> --branch-prefix <prefix>\n' +
  '  calibration-judge.js compare --current <round-dir> ' +
  '[--previous <round-dir>|none] --inputs <inputs.json> [--out <file>]\n' +
  '  calibration-judge.js transitions --current <round-dir> ' +
  '[--previous <round-dir>|none] [--compare <compare.json>] [--out <file>]';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// Statuses of the previous round's analysis, the same words collect.js and
// validate.js use: absent is the first observed round.
const PREVIOUS_PRESENT = 'present';
const PREVIOUS_ABSENT = 'absent';
const PREVIOUS_UNREADABLE = 'unreadable';

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
    transitions: null,
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
    else if (arg === '--transitions') options.transitions = argv[++index] ?? null;
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

// A round-context file the workflow could not produce is no context at all,
// never a guess: missing or broken reads as null.
const readOptionalJson = (file) => {
  if (file === null) return null;
  try {
    const value = readJson(file);
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
};

// The previous round as previous-round wrote it. Not passed: no earlier round
// is known, the round is the first observed one. Passed but missing or
// broken: the previous round exists but proves nothing (unreadable).
const readPreviousRound = (file) => {
  if (file === null) return { status: PREVIOUS_ABSENT, analysis: null };
  const data = readOptionalJson(file);
  if (data === null) return { status: PREVIOUS_UNREADABLE, analysis: null };
  return { status: data.status, analysis: data.analysis ?? null };
};

// The round context (comparison, transitions) is kept on every error path,
// as assemble itself does: a failed analysis still shows how the round
// relates to the previous one.
const assembleFromFiles = (options, taxonomy) => {
  const comparison = readOptionalJson(options.compare);
  const transitions = readOptionalJson(options.transitions);
  const fail = (manifest, stage, problem) =>
    buildAnalysisError(manifest, stage, [problem], comparison, transitions);

  const manifestFile = readStageFile(options.manifest, STAGE_MANIFEST);
  const manifest = manifestFile.value;
  if (manifestFile.problem !== null) {
    return fail(manifest, STAGE_MANIFEST, manifestFile.problem);
  }
  if (options.modelError !== null) {
    return fail(manifest, STAGE_MODEL, options.modelError);
  }
  const stage1 = readStageFile(options.stage1, STAGE_INDEPENDENT);
  if (stage1.problem !== null) {
    return fail(manifest, STAGE_INDEPENDENT, stage1.problem);
  }
  const stage2 = readStageFile(options.stage2, STAGE_ANALYSIS);
  if (stage2.problem !== null) {
    return fail(manifest, STAGE_ANALYSIS, stage2.problem);
  }
  return assemble({
    manifest,
    stage1: stage1.value,
    stage2: stage2.value,
    taxonomy,
    previous: readPreviousRound(options.previous),
    comparison,
    transitions,
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

const isEarlierRound = (left, right) => {
  const leftRun = Number(left.verifier_run_id);
  const rightRun = Number(right.verifier_run_id);
  if (leftRun !== rightRun) return leftRun < rightRun;
  return Number(left.verifier_run_attempt) < Number(right.verifier_run_attempt);
};

const previousResult = (status, record = null) => {
  const assembled = isPlainObject(record?.analysis) ? record.analysis : null;
  return {
    status,
    round_key: record === null ? null : record.round_key,
    head_sha: assembled?.head_sha ?? null,
    analysis: status === PREVIOUS_PRESENT ? assembled.analysis : null,
  };
};

// Picks the analysis of the round before roundKey from Judge's own comment
// (its hidden rounds block). No own comment or no earlier record: absent, the
// current round is the first observed one. A broken block, or an earlier
// round whose analysis failed: unreadable, so no earlier finding is assumed.
const selectPreviousRound = ({ comments, author, roundKey }) => {
  if (!Array.isArray(comments)) return previousResult(PREVIOUS_UNREADABLE);
  const own = findOwnComment(comments, author);
  if (own === null) return previousResult(PREVIOUS_ABSENT);
  const decoded = decodeRounds(own.body);
  if (!decoded.ok) return previousResult(PREVIOUS_UNREADABLE);

  const earlier = decoded.records.filter(
    (record) =>
      String(record.round_key.repository) === String(roundKey.repository) &&
      isEarlierRound(record.round_key, roundKey),
  );
  if (earlier.length === 0) return previousResult(PREVIOUS_ABSENT);
  const latest = earlier.reduce((best, record) =>
    isEarlierRound(best.round_key, record.round_key) ? record : best,
  );
  const hasAnalysis = isPlainObject(latest.analysis?.analysis);
  const status = hasAnalysis ? PREVIOUS_PRESENT : PREVIOUS_UNREADABLE;
  return previousResult(status, latest);
};

// An unreadable comments list is not an error here: it only means the
// previous round cannot be read, which the result says.
const runPreviousRound = (argv) => {
  const { options } = parseOptionArgs(argv);
  const required = [
    options.comments,
    options.author,
    options.repository,
    options.runId,
    options.runAttempt,
  ];
  if (required.includes(null)) {
    process.stderr.write(`${USAGE}
`);
    return 2;
  }
  let comments = null;
  try {
    comments = readJson(options.comments);
  } catch {
    comments = null;
  }
  const result = selectPreviousRound({
    comments,
    author: options.author,
    roundKey: toRoundKey({
      repository: options.repository,
      runId: options.runId,
      runAttempt: options.runAttempt,
    }),
  });
  writeOutput(`${JSON.stringify(result, null, 2)}
`, options.out);
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
  if (command === 'previous-round') return runPreviousRound(rest);
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
  selectPreviousRound,
  runPreviousRound,
  loadPackageContents,
  loadRound,
  runCompare,
  loadTransitionRound,
  runTransitions,
  main,
};
