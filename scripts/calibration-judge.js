'use strict';

const fs = require('node:fs');
const { loadTaxonomy } = require('./calibration-judge/taxonomy');
const { buildSchema } = require('./calibration-judge/schema');
const {
  validateAnalysis,
  validateIndependentResult,
  checkModel,
} = require('./calibration-judge/validate');

const USAGE =
  'usage:\n' +
  '  calibration-judge.js schema <template.json> --taxonomy <taxonomy.json> ' +
  '[--out <file>]\n' +
  '  calibration-judge.js validate <analysis.json> ' +
  '--stage <independent|analysis> --taxonomy <taxonomy.json>\n' +
  '  calibration-judge.js check-model <judge-model> ' +
  '--verifier-model <model> --allowlist <allowed-models.json>';

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
  const options = { taxonomy: null, out: null, stage: null, verifierModel: null, allowlist: null };
  const positional = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--taxonomy') options.taxonomy = argv[++index] ?? null;
    else if (arg === '--out') options.out = argv[++index] ?? null;
    else if (arg === '--stage') options.stage = argv[++index] ?? null;
    else if (arg === '--verifier-model') options.verifierModel = argv[++index] ?? null;
    else if (arg === '--allowlist') options.allowlist = argv[++index] ?? null;
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

const main = (argv) => {
  const [command, ...rest] = argv;
  if (command === 'schema') return runSchema(rest);
  if (command === 'validate') return runValidate(rest);
  if (command === 'check-model') return runCheckModel(rest);
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
  main,
};
