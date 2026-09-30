'use strict';

const fs = require('node:fs');
const { patternToRegex, changedPathsOf } = require('./affects-scope');
const { authorizeLabel } = require('./label-authority');

const usage = () =>
  'usage: node scripts/factory-separation.js --files <file> ' +
  '--timeline <file> --owners <file> [--json]';

// The cross-side gate protects only these two sides (INV-1). Contract files
// (.github/verifier/issue-contract.*) are deliberately in neither list — they
// are a shared interface.
const SPEC_PATTERNS = [
  '.claude/skills/issues/**',
  'scripts/issue-lint.js',
  'scripts/issue-lint.spec.js',
].map(patternToRegex);

const VERIFIER_PATTERNS = [
  '.github/verifier/prompt.md',
  '.github/verifier/schema.json',
  'scripts/acceptance-verdict.js',
  'scripts/acceptance-verdict.spec.js',
  'scripts/acceptance-verdict/**',
  '.github/workflows/acceptance-verifier.yml',
].map(patternToRegex);

const LABEL_NAME = 'factory-cross-change';

const matchesAny = (patterns, changedPath) =>
  patterns.some((pattern) => pattern.test(changedPath));

// The classifier proper (AC-1..AC-4): a plain list of already-resolved
// changed paths, no rename/delete parsing here.
const classifyPaths = (changedPaths) => ({
  spec: changedPaths.some((changedPath) => matchesAny(SPEC_PATTERNS, changedPath)),
  verifier: changedPaths.some((changedPath) =>
    matchesAny(VERIFIER_PATTERNS, changedPath),
  ),
});

// git diff --name-status text in, classification out. changedPathsOf is
// affects-scope.js's own rename/delete/dedup rule (INV-2, TR-1), reused
// directly rather than reimplemented.
const classify = (filesTxt) => classifyPaths(changedPathsOf(filesTxt));

const parseArgs = (argv) => {
  let files = null;
  let timeline = null;
  let owners = null;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--files' || arg === '--timeline' || arg === '--owners') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) return null;
      if (arg === '--files') files = value;
      else if (arg === '--timeline') timeline = value;
      else owners = value;
      index += 1;
    } else if (arg === '--json') {
      json = true;
    } else {
      return null;
    }
  }

  return files && timeline && owners ? { files, timeline, owners, json } : null;
};

const readJsonArray = (file) => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(data) ? data : [];
};

// Fail-closed (mirrors label-authority.js's own CLI, INV-3/INV-4): an
// unreadable or malformed timeline/owners file means the label is not
// counted, not a crashed job.
const authorizationFor = (args) => {
  try {
    const events = readJsonArray(args.timeline);
    const owners = readJsonArray(args.owners);
    return authorizeLabel(events, owners, LABEL_NAME);
  } catch {
    return { authorized: false, actor: null };
  }
};

const main = (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv);
  if (!args) {
    process.stderr.write(`${usage()}\n`);
    return 2;
  }

  let classification;
  try {
    const filesTxt = fs.readFileSync(args.files, 'utf8');
    classification = classify(filesTxt);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }

  const bothSides = classification.spec && classification.verifier;
  const label = bothSides
    ? authorizationFor(args)
    : { authorized: null, actor: null };

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ ...classification, label })}\n`);
  }

  if (!bothSides) return 0;
  return label.authorized ? 0 : 1;
};

if (require.main === module) process.exitCode = main();

module.exports = {
  classify,
  classifyPaths,
  changedPathsOf,
  parseArgs,
  main,
  SPEC_PATTERNS,
  VERIFIER_PATTERNS,
  LABEL_NAME,
};
