'use strict';

// Configuration checks of the Calibration Judge workflow and of the verifier
// step that feeds it, read from the YAML text (no YAML dependency).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');
const JUDGE_FILE = path.join(WORKFLOWS, 'calibration-judge.yml');
const VERIFIER_FILE = path.join(WORKFLOWS, 'acceptance-verifier.yml');
const CLI = path.join(ROOT, 'scripts', 'calibration-judge.js');
const TAXONOMY_FILE = path.join(ROOT, '.github', 'calibration', 'taxonomy.json');

const JUDGE = fs.readFileSync(JUDGE_FILE, 'utf8');
const VERIFIER = fs.readFileSync(VERIFIER_FILE, 'utf8');

const linesOf = (text) => text.split(/\r?\n/);

// Text of a top-level key (`on:`, `concurrency:`), up to the next one.
const topLevelBlock = (text, key) => {
  const lines = linesOf(text);
  const start = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^\S/.test(line));
  const body = end === -1 ? rest : rest.slice(0, end);
  return [lines[start], ...body].join('\n');
};

const JOB_HEADER = /^ {2}([A-Za-z0-9_-]+):\s*$/;
const STEP_START = /^ {6}- /;

// Jobs keyed by id; each job has its own text and its steps' texts.
const readJobs = (text) => {
  const lines = linesOf(topLevelBlock(text, 'jobs'));
  const jobs = new Map();
  let current = null;
  for (const line of lines.slice(1)) {
    const header = JOB_HEADER.exec(line);
    if (header !== null) {
      current = { id: header[1], lines: [] };
      jobs.set(current.id, current);
      continue;
    }
    if (current !== null) current.lines.push(line);
  }
  for (const job of jobs.values()) {
    job.text = job.lines.join('\n');
    // A step starts at `      - ` and continues while lines are indented
    // deeper (or blank); comment lines between steps belong to no step.
    const steps = [];
    let step = null;
    for (const line of job.lines) {
      if (STEP_START.test(line)) {
        step = [line];
        steps.push(step);
      } else if (step !== null && (/^ {8}/.test(line) || line.trim() === '')) {
        step.push(line);
      } else {
        step = null;
      }
    }
    job.steps = steps.map((lines) => lines.join('\n'));
  }
  return jobs;
};

const jobField = (job, field) => {
  const match = new RegExp(`^ {4}${field}: (.+)$`, 'm').exec(job.text);
  return match === null ? null : match[1].trim();
};

const permissionsOf = (job) => {
  const lines = job.lines;
  const start = lines.findIndex((line) => /^ {4}permissions:/.test(line));
  if (start === -1) return null;
  const inline = lines[start].replace(/^ {4}permissions:/, '').trim();
  if (inline !== '') return { inline };
  const entries = {};
  for (const line of lines.slice(start + 1)) {
    const match = /^ {6}([a-z-]+): (\S+)$/.exec(line);
    if (match === null) break;
    entries[match[1]] = match[2];
  }
  return entries;
};

const stepName = (step) => {
  const match = /^ {6}- name: (.+)$/m.exec(step);
  return match === null ? null : match[1].trim();
};

const stepWith = (step, key) => {
  const match = new RegExp(`^ {10}${key}: (.+)$`, 'm').exec(step);
  return match === null ? null : match[1].trim();
};

const usesOf = (step) => {
  const match = /^ {8}uses: (\S+)/m.exec(step);
  return match === null ? null : match[1];
};

const codexSteps = (jobs) =>
  [...jobs.values()].flatMap((job) =>
    job.steps
      .filter((step) => (usesOf(step) ?? '').startsWith('openai/codex-action@'))
      .map((step) => ({ job, step })),
  );

// Minimal evaluator for the GitHub expression subset the job conditions use:
// property paths, string literals, startsWith(), always(), ==, !=, !, &&, || and
// parentheses. A missing property is an empty string, as in GitHub.
const TOKEN = /\s*(\|\||&&|==|!=|!|\(|\)|,|'(?:[^']|'')*'|[A-Za-z_][\w.-]*)/y;

const tokenize = (source) => {
  const tokens = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < source.length) {
    const start = TOKEN.lastIndex;
    const match = TOKEN.exec(source);
    if (match === null) {
      if (source.slice(start).trim() === '') break;
      throw new Error(`cannot tokenize: ${source.slice(start)}`);
    }
    tokens.push(match[1]);
  }
  return tokens;
};

const evaluate = (source, context) => {
  const tokens = tokenize(source);
  let index = 0;
  const peek = () => tokens[index];
  const next = () => tokens[index++];
  const resolve = (name) =>
    name.split('.').reduce((value, key) => (value == null ? undefined : value[key]), context) ?? '';

  const primary = () => {
    const token = next();
    if (token === '(') {
      const value = or();
      assert.strictEqual(next(), ')');
      return value;
    }
    if (token === '!') return !primary();
    if (token.startsWith("'")) return token.slice(1, -1).replace(/''/g, "'");
    if (token === 'true' || token === 'false') return token === 'true';
    if (token === 'always' && peek() === '(') {
      next();
      assert.strictEqual(next(), ')');
      return true;
    }
    if (peek() === '(') {
      next();
      const args = [or()];
      while (peek() === ',') {
        next();
        args.push(or());
      }
      assert.strictEqual(next(), ')');
      assert.strictEqual(token, 'startsWith');
      return String(args[0]).toLowerCase().startsWith(String(args[1]).toLowerCase());
    }
    return resolve(token);
  };
  const comparison = () => {
    let value = primary();
    while (peek() === '==' || peek() === '!=') {
      const operator = next();
      const right = primary();
      value = operator === '==' ? value === right : value !== right;
    }
    return value;
  };
  const and = () => {
    let value = comparison();
    while (peek() === '&&') {
      next();
      const right = comparison();
      value = Boolean(value) && Boolean(right);
    }
    return value;
  };
  const or = () => {
    let value = and();
    while (peek() === '||') {
      next();
      const right = and();
      value = Boolean(value) || Boolean(right);
    }
    return value;
  };
  const result = or();
  assert.strictEqual(index, tokens.length, 'expression fully parsed');
  return Boolean(result);
};

const JOBS = readJobs(JUDGE);
const VERIFIER_JOBS = readJobs(VERIFIER);

test('job reader finds every Judge job', () => {
  assert.deepStrictEqual([...JOBS.keys()], ['collect', 'stage1', 'stage2', 'assemble', 'publish']);
  for (const job of JOBS.values()) assert.ok(job.steps.length > 0, job.id);
});

test('triggers on verifier completion and manual dispatch', () => {
  const on = topLevelBlock(JUDGE, 'on');
  const triggers = linesOf(on)
    .map((line) => /^ {2}([a-z_]+):/.exec(line))
    .filter((match) => match !== null)
    .map((match) => match[1]);
  assert.deepStrictEqual(triggers, ['workflow_run', 'workflow_dispatch']);
  assert.match(on, /workflows: \[Acceptance Verifier\]/);
  assert.match(on, /types: \[completed\]/);
  assert.match(on, / {6}pr:\n(?: {8}.*\n)*? {8}required: true/);
  assert.match(on, / {6}run_id:\n(?: {8}.*\n)*? {8}required: false/);
  assert.match(on, / {6}run_attempt:\n(?: {8}.*\n)*? {8}required: false/);
  for (const forbidden of ['push', 'pull_request', 'pull_request_target', 'schedule']) {
    assert.doesNotMatch(on, new RegExp(`^ {2}${forbidden}:`, 'm'));
  }
});

// A verifier run started by workflow_run names the default branch in its own
// metadata, so the job condition must not filter on head_branch: the PR is
// read from the round's artifacts and checked by check-pr.
test('skips verifier runs that are not rounds', () => {
  const collect = JOBS.get('collect');
  const condition = jobField(collect, 'if');
  assert.doesNotMatch(condition, /head_branch/);
  const contextOf = (conclusion) => ({
    github: {
      event_name: 'workflow_run',
      event: { workflow_run: { conclusion, head_branch: 'main' } },
    },
  });
  assert.strictEqual(evaluate(condition, contextOf('success')), true);
  assert.strictEqual(evaluate(condition, contextOf('failure')), true);
  assert.strictEqual(evaluate(condition, contextOf('skipped')), false);
  assert.strictEqual(evaluate(condition, contextOf('cancelled')), false);
  assert.strictEqual(
    evaluate(condition, { github: { event_name: 'workflow_dispatch', event: {} } }),
    true,
  );

  const identify = collect.steps.find((step) => /^ {8}id: pr$/m.test(step));
  assert.match(identify, /art\/verdict-report\/verdict-report\.json/);
  assert.match(
    identify,
    /calibration-judge\.js check-pr --pull meta\/pull\.json\s*\\?\s*--round meta\/round\.json --repository "\$REPO" --branch-prefix 'task\/ISSUE-'/,
  );
  assert.match(collect.text, /skip: \$\{\{ steps\.pr\.outputs\.skip != 'false' \}\}/);
  assert.match(collect.text, /pr_number: \$\{\{ steps\.pr\.outputs\.pr_number \}\}/);
  assert.match(collect.text, /head_sha: \$\{\{ steps\.pr\.outputs\.head_sha \}\}/);
});

test('has no status or label permissions or calls', () => {
  assert.match(JUDGE, /^permissions: \{\}$/m);
  for (const job of JOBS.values()) {
    const permissions = permissionsOf(job);
    assert.notStrictEqual(permissions, null, `${job.id} declares permissions`);
    assert.notStrictEqual(permissions.statuses, 'write', job.id);
    assert.notStrictEqual(permissions.issues, 'write', job.id);
    const canWritePr = permissions['pull-requests'] === 'write';
    assert.strictEqual(canWritePr, job.id === 'publish', job.id);
  }
  assert.doesNotMatch(JUDGE, /\/labels/);
  assert.doesNotMatch(JUDGE, /--add-label|--remove-label/);
  assert.doesNotMatch(JUDGE, /-X POST "repos\/\$REPO\/statuses/);
  assert.doesNotMatch(JUDGE, /-f state=/);
});

test('reads judge files from default branch', () => {
  const checkouts = [...JOBS.values()].flatMap((job) =>
    job.steps.filter((step) => (usesOf(step) ?? '').startsWith('actions/checkout@')),
  );
  const trusted = checkouts.filter((step) => stepWith(step, 'path') === 'trusted');
  const prHead = checkouts.filter((step) => stepWith(step, 'path') === null);
  assert.strictEqual(trusted.length, JOBS.size);
  assert.ok(prHead.length > 0);
  for (const step of trusted) {
    assert.strictEqual(stepWith(step, 'ref'), '${{ github.sha }}');
    assert.match(step, /^ {12}\.github\/calibration$/m);
    assert.match(step, /^ {12}scripts\/calibration-judge\/$/m);
    assert.match(step, /^ {12}scripts\/calibration-judge\.js$/m);
  }
  for (const step of checkouts) {
    assert.strictEqual(stepWith(step, 'persist-credentials'), 'false');
  }
  for (const step of prHead) {
    assert.notStrictEqual(stepWith(step, 'ref'), '${{ github.sha }}');
  }
  const nodeCalls = JUDGE.match(/\bnode \S+/g) ?? [];
  assert.ok(nodeCalls.length > 0);
  for (const call of nodeCalls) assert.match(call, /^node trusted\//);
});

test('exposes model key only to model steps with verifier pin', () => {
  const keyUses = JUDGE.match(/secrets\.\w+/g) ?? [];
  assert.deepStrictEqual(keyUses, ['secrets.OPENAI_API_KEY', 'secrets.OPENAI_API_KEY']);
  const steps = codexSteps(JOBS);
  assert.deepStrictEqual(
    steps.map(({ job }) => job.id),
    ['stage1', 'stage2'],
  );
  for (const { step } of steps) {
    assert.match(step, /openai-api-key: \$\{\{ secrets\.OPENAI_API_KEY \}\}/);
  }
  const pins = (text) => new Set(text.match(/openai\/codex-action@\S+/g));
  assert.deepStrictEqual(pins(JUDGE), pins(VERIFIER));
  assert.strictEqual(pins(VERIFIER).size, 1);
  const codexVersion = (text) => /^ {2}CODEX_VERSION: (\S+)$/m.exec(text)[1];
  assert.strictEqual(codexVersion(JUDGE), codexVersion(VERIFIER));
  for (const { step } of steps) {
    assert.strictEqual(stepWith(step, 'codex-version'), '${{ env.CODEX_VERSION }}');
    assert.strictEqual(stepWith(step, 'safety-strategy'), 'drop-sudo');
    assert.strictEqual(stepWith(step, 'sandbox'), 'read-only');
  }
});

const downloadsOf = (job) =>
  job.steps
    .filter((step) => (usesOf(step) ?? '').startsWith('actions/download-artifact@'))
    .map((step) => stepWith(step, 'name'));

test('isolates stage one from full package', () => {
  const steps = codexSteps(JOBS);
  const [stage1, stage2] = steps;
  assert.notStrictEqual(stage1.job.id, stage2.job.id);
  assert.deepStrictEqual(downloadsOf(stage1.job), ['judge-independent']);
  // Every "verdict" occurrence in stage 1's job text must be the
  // scripts/acceptance-verdict/ dependency path (needed to run
  // calibration-judge.js at all, not a verifier output): stripping each such
  // path out first keeps this assertion exactly as strict as before that
  // dependency existed, instead of widening what it tolerates.
  const withoutDependencyPath = stage1.job.text.replaceAll(
    'scripts/acceptance-verdict/common.js',
    '',
  );
  assert.doesNotMatch(withoutDependencyPath, /judge-full|verdict/);
  assert.deepStrictEqual(downloadsOf(stage2.job), ['judge-full', 'judge-stage1']);
  const output1 = stepWith(stage1.step, 'output-file');
  const output2 = stepWith(stage2.step, 'output-file');
  assert.notStrictEqual(output1, output2);
  assert.doesNotMatch(stage2.job.text, new RegExp(`> ${output1.replace('.', '\\.')}`));

  const collect = JOBS.get('collect');
  const independentUpload = collect.steps.find(
    (step) => stepWith(step, 'name') === 'judge-independent',
  );
  assert.strictEqual(stepWith(independentUpload, 'path'), 'pkg/independent/');
});

test('stage one does not receive previous round', () => {
  const inputs = JSON.parse(
    fs.readFileSync(path.join(ROOT, '.github', 'calibration', 'inputs.json'), 'utf8'),
  );
  const previousRoundFiles = inputs.fullOnlyInputs
    .filter(({ key }) => /^(previous|round)/.test(key) || key.endsWith('Diff'))
    .map(({ path: file }) => file);
  assert.ok(previousRoundFiles.includes('previous-round.json'));
  const independentFiles = inputs.independentInputs.map(({ path: file }) => file);
  for (const file of previousRoundFiles) {
    assert.ok(!independentFiles.includes(file), `${file} is not independent`);
  }

  const [stage1] = codexSteps(JOBS);
  assert.strictEqual(stage1.job.id, 'stage1');
  assert.deepStrictEqual(downloadsOf(stage1.job), ['judge-independent']);
  assert.doesNotMatch(stage1.job.text, /judge-meta|judge-full|context\//);
  for (const file of previousRoundFiles) {
    assert.ok(!stage1.job.text.includes(file), `stage 1 mentions ${file}`);
  }

  // The previous round reaches only the full package and the assemble job.
  const collect = JOBS.get('collect');
  const build = collect.steps.find(
    (step) => stepName(step) === 'Build previous round inputs',
  );
  assert.ok(build !== undefined);
  assert.match(build, /calibration-judge\.js previous-round /);
  const independentUpload = collect.steps.find(
    (step) => stepWith(step, 'name') === 'judge-independent',
  );
  assert.doesNotMatch(independentUpload, /context|previous/);
  const metaUpload = collect.steps.find(
    (step) => stepWith(step, 'name') === 'judge-meta',
  );
  assert.match(metaUpload, /^ {12}pkg\/context\/$/m);
  const assemble = JOBS.get('assemble');
  assert.match(assemble.text, /--previous context\/previous-round\.json/);
  assert.match(assemble.text, /--transitions context\/round-transitions\.json/);
});

test('compares rounds on the same terms', () => {
  const collect = JOBS.get('collect');
  const raw = collect.steps.find((step) => stepName(step) === 'Build raw inputs');
  const previous = collect.steps.find(
    (step) => stepName(step) === 'Build previous round inputs',
  );

  // Both rounds get their base commit as the merge base with the PR base tip.
  for (const step of [raw, previous]) {
    assert.match(step, /\/compare\/\$BASE_TIP\.\.\.\$\w+" --jq '\.merge_base_commit\.sha'/);
  }
  assert.doesNotMatch(previous, /base_sha: null/);

  // Both rounds read the trusted policy at their own verifier commit, and the
  // policy diff compares only configs pinned in both.
  assert.match(raw, /contents\/\$CONFIG\?ref=\$VERIFIER_COMMIT/);
  assert.match(previous, /contents\/\$CONFIG\?ref=\$PREV_VERIFIER/);
  assert.match(previous, /grep -qxF "\$CONFIG" meta\/pinned-configs\.txt/);

  // "First round" (--previous none) is used only when no earlier round exists.
  const noneLines = linesOf(previous).filter((line) => /=none$/.test(line.trim()));
  assert.deepStrictEqual(
    noneLines.map((line) => line.trim()),
    ['PREV_PKG=none', 'PREV_TRANSITIONS=none'],
  );
  assert.match(
    previous,
    /if \[ "\$PREV_STATUS" = "absent" \]; then\n\s+PREV_PKG=none\n\s+PREV_TRANSITIONS=none\n/,
  );
  assert.match(previous, /if \[ -n "\$PREV_PKG" \] && node /);
  assert.match(previous, /if \[ -n "\$PREV_TRANSITIONS" \]; then/);
});

test('checks judge model before model steps', () => {
  for (const { job, step } of codexSteps(JOBS)) {
    assert.strictEqual(stepWith(step, 'model'), '${{ vars.CALIBRATION_JUDGE_MODEL }}');
    assert.doesNotMatch(step, /VERIFIER_MODEL/);
    assert.match(jobField(job, 'needs'), /collect/);
    assert.match(jobField(job, 'if'), /needs\.collect\.outputs\.model_allowed == 'true'/);
  }
  const collect = JOBS.get('collect');
  assert.match(collect.text, /model_allowed: \$\{\{ steps\.model\.outputs\.allowed \}\}/);
  const modelStep = collect.steps.find((step) => /^ {8}id: model$/m.test(step));
  assert.match(modelStep, /calibration-judge\.js check-model "\$JUDGE_MODEL"/);
  assert.match(modelStep, /JUDGE_MODEL: \$\{\{ vars\.CALIBRATION_JUDGE_MODEL \}\}/);
  assert.match(modelStep, /--allowlist trusted\/\.github\/calibration\/allowed-models\.json/);
});

test('verifier report uploads historical comment', () => {
  const report = VERIFIER_JOBS.get('report');
  const names = report.steps.map(stepName);
  const uploads = report.steps.filter((step) =>
    (usesOf(step) ?? '').startsWith('actions/upload-artifact@'),
  );
  assert.strictEqual(uploads.length, 1);
  const [upload] = uploads;
  assert.strictEqual(stepWith(upload, 'name'), 'verdict-report');
  assert.match(upload, /^ {8}if: always\(\)$/m);
  assert.match(upload, /^ {12}verdict-report\.json$/m);
  assert.match(upload, /^ {12}comment\.md$/m);
  assert.match(upload, /^ {12}timeline\.json$/m);

  const write = report.steps.find((step) => stepName(step) === 'Write verdict report');
  assert.match(write, /^ {8}if: always\(\)$/m);
  assert.match(write, /PR_NUMBER: \$\{\{ needs\.verify\.outputs\.pr_number \}\}/);
  assert.match(write, /HEAD_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(write, /RESULT: \$\{\{ steps\.verdict\.outputs\.result \}\}/);
  assert.match(write, /> verdict-report\.json; then/);

  // Both steps come last, after the comment and the status are published, so
  // they cannot affect either.
  assert.deepStrictEqual(names.slice(-2), ['Write verdict report', 'Upload verdict report']);
  assert.ok(names.indexOf('Compute verdict and comment') !== -1);
  assert.ok(names.indexOf('Set commit status') < names.length - 2);
});

test('verifier report uploads machine result', () => {
  const report = VERIFIER_JOBS.get('report');
  const compute = report.steps.find(
    (step) => stepName(step) === 'Compute verdict and comment',
  );
  const call = compute
    .split('\n')
    .find((line) => line.includes('trusted/scripts/acceptance-verdict.js verdict.json'));
  assert.ok(call !== undefined);
  assert.match(call, /--out comment\.md --result-out result\.json /);

  const upload = report.steps.find(
    (step) => stepWith(step, 'name') === 'verdict-report',
  );
  assert.match(upload, /^ {12}result\.json$/m);

  // The verify jobs neither produce nor upload the machine result.
  for (const id of ['verify', 'verify-second']) {
    const text = VERIFIER_JOBS.get(id).text;
    assert.doesNotMatch(text, /--result-out|(^|\s)result\.json/m);
  }
});

test('keeps analysis artifact and does not cancel rounds', () => {
  const assemble = JOBS.get('assemble');
  const publish = JOBS.get('publish');
  const isAnalysisUpload = (step) =>
    (usesOf(step) ?? '').startsWith('actions/upload-artifact@') &&
    stepWith(step, 'name') === 'calibration-analysis';
  const upload = assemble.steps.find(isAnalysisUpload);
  assert.strictEqual(stepWith(upload, 'path'), 'calibration-analysis.json');
  assert.strictEqual(stepWith(upload, 'retention-days'), '90');
  // The analysis is kept outside the publication queue: a cancelled pending
  // publication cannot lose it. Publication only reads it back.
  assert.doesNotMatch(assemble.text, /^ {4}concurrency:/m);
  assert.strictEqual(publish.steps.filter(isAnalysisUpload).length, 0);
  assert.deepStrictEqual(downloadsOf(publish), ['calibration-analysis']);
  assert.match(jobField(publish, 'needs'), /assemble/);
  assert.match(jobField(publish, 'if'), /needs\.assemble\.result == 'success'/);
  // No workflow-level group: rounds of different PRs never wait on or cancel
  // each other; publications of one PR are serialised by the job group.
  assert.strictEqual(topLevelBlock(JUDGE, 'concurrency'), null);
  assert.match(
    publish.text,
    /^ {4}concurrency:\n {6}group: calibration-judge-publish-\$\{\{ needs\.collect\.outputs\.pr_number \}\}\n {6}cancel-in-progress: false$/m,
  );
  assert.doesNotMatch(JUDGE, /cancel-in-progress: true/);
});

test('publishes model rejection without calling model', () => {
  const prefixMatch = /--model-error "([^"$]*)\$/.exec(JUDGE);
  assert.notStrictEqual(prefixMatch, null);
  const prefix = prefixMatch[1];
  assert.ok(prefix.startsWith('модель запрещена'));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-workflow-'));
  const file = (name, data) => {
    const full = path.join(dir, name);
    fs.writeFileSync(full, JSON.stringify(data));
    return full;
  };
  const manifest = file('manifest.json', {
    round_key: { repository: 'o/r', verifier_run_id: 1, verifier_run_attempt: 1 },
    head_sha: null,
    inputs: {},
  });
  const assembledFile = path.join(dir, 'analysis.json');
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  const assembled = cli([
    'assemble',
    '--manifest',
    manifest,
    '--stage1',
    path.join(dir, 'absent-stage1.json'),
    '--stage2',
    path.join(dir, 'absent-stage2.json'),
    '--taxonomy',
    TAXONOMY_FILE,
    '--model-error',
    `${prefix}judge model is not in allowlist: x`,
    '--out',
    assembledFile,
  ]);
  assert.strictEqual(assembled.status, 0, assembled.stderr);
  const commentFile = path.join(dir, 'comment.md');
  const published = cli([
    'publish',
    assembledFile,
    '--comments',
    file('comments.json', []),
    '--author',
    'bot',
    '--repository',
    'o/r',
    '--run-id',
    '1',
    '--run-attempt',
    '1',
    '--out',
    commentFile,
  ]);
  assert.strictEqual(published.status, 0, published.stderr);
  const comment = fs.readFileSync(commentFile, 'utf8');
  assert.match(comment, /Ошибка разбора \(стадия: model\)/);
  assert.match(comment, /модель запрещена/);

  for (const { job } of codexSteps(JOBS)) {
    const condition = jobField(job, 'if');
    const context = {
      needs: {
        collect: { outputs: { skip: 'false', model_allowed: 'false' } },
        stage1: { outputs: { has_result: 'true' } },
      },
    };
    assert.strictEqual(evaluate(condition, context), false, job.id);
    context.needs.collect.outputs.model_allowed = 'true';
    assert.strictEqual(evaluate(condition, context), true, job.id);
  }
});

// Regression guard for the bug found live in production (every Acceptance
// Verifier round after PR #589/ISSUE-567 merged): `calibration-judge.js`
// requires `transitions.js`, which requires `../acceptance-verdict/common`,
// but no job's trusted `sparse-checkout` list included that file — every
// Judge run crashed with MODULE_NOT_FOUND inside `Resolve round` (the first
// step that runs the CLI from the trusted checkout) and was silently
// reported as "Verifier attempt is not a round", never running Stage 1/2.
// This builds each job's trusted checkout from only the files its own
// sparse-checkout list names (same pattern as acceptance-verdict.spec.js's
// "sparse checkout blocks are read by job id" test) and actually requires
// the CLI entry from each copy, so a future dependency added to any
// calibration-judge/*.js file without updating every job's list fails here
// instead of only in a live run.
const SPARSE_LINE = /^ {12}(\S.*)$/;

const sparseCheckoutPaths = (job) => {
  const lines = job.lines;
  const start = lines.findIndex((line) => /sparse-checkout: \|\s*$/.test(line));
  if (start === -1) return null;
  const paths = [];
  for (const line of lines.slice(start + 1)) {
    const match = SPARSE_LINE.exec(line);
    if (match === null) break;
    paths.push(match[1].trim());
  }
  return paths;
};

const copyIntoCheckout = (relPath, destRoot) => {
  const src = path.join(ROOT, relPath);
  const dest = path.join(destRoot, relPath);
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
};

test('every Judge job can actually require the CLI from its own trusted checkout', () => {
  const checked = [];
  for (const [jobId, job] of JOBS) {
    const sparsePaths = sparseCheckoutPaths(job);
    if (sparsePaths === null) continue;
    assert.ok(sparsePaths.includes('scripts/calibration-judge.js'), jobId);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-sparse-'));
    for (const relPath of sparsePaths) copyIntoCheckout(relPath, dir);
    const result = spawnSync(
      process.execPath,
      [path.join(dir, 'scripts', 'calibration-judge.js')],
      { encoding: 'utf8' },
    );
    assert.strictEqual(result.status, 2, `${jobId}: ${result.stderr}`);
    assert.doesNotMatch(result.stderr, /MODULE_NOT_FOUND/, jobId);
    checked.push(jobId);
  }
  assert.deepStrictEqual(checked, [...JOBS.keys()]);
});
