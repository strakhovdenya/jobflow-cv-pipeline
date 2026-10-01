'use strict';

const fs = require('node:fs');
const { loadTaxonomy } = require('./calibration-judge/taxonomy');
const { buildSchema } = require('./calibration-judge/schema');
const {
  validateAnalysis,
  validateIndependentResult,
  checkModel,
} = require('./calibration-judge/validate');
const { loadInputsConfig, collect } = require('./calibration-judge/collect');
const {
  STAGE_INDEPENDENT,
  STAGE_ANALYSIS,
  STAGE_MANIFEST,
  STAGE_MODEL,
  buildAnalysisError,
  assemble,
} = require('./calibration-judge/assemble');
const { render } = require('./calibration-judge/render');

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
  '  calibration-judge.js render <assembled.json> [--out <file>]';

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

const main = (argv) => {
  const [command, ...rest] = argv;
  if (command === 'schema') return runSchema(rest);
  if (command === 'validate') return runValidate(rest);
  if (command === 'check-model') return runCheckModel(rest);
  if (command === 'collect') return runCollect(rest);
  if (command === 'assemble') return runAssemble(rest);
  if (command === 'render') return runRender(rest);
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
  main,
};
