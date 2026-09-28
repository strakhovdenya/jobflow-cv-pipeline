'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  STATUS_PASS,
  BEHAVIOR_TYPE,
  BEHAVIOR_REQUIRED_KINDS,
  labelOf,
  deterministicIdsOf,
} = require('./common');

const MAX_REF_FILE_BYTES = 2 * 1024 * 1024;
const FORBIDDEN_REF_ROOTS = new Set(['.git', 'trusted']);
const MAX_QUOTE_CHARS = 200;

const isInside = (rootReal, target) => {
  const relative = path.relative(rootReal, target);
  if (relative === '' || path.isAbsolute(relative)) return false;
  if (relative === '..' || relative.startsWith(`..${path.sep}`)) return false;
  const [first] = relative.split(path.sep);
  return !FORBIDDEN_REF_ROOTS.has(first);
};

// Untrusted: a model- or issue-supplied path must stay inside the checkout,
// be a regular file (no symlink at any level) and be small.
const resolveInsideCheckout = (root, filePath) => {
  const rootReal = fs.realpathSync(root);
  const target = path.resolve(rootReal, filePath);
  if (!isInside(rootReal, target)) {
    return { real: null, problem: 'path is outside the checkout' };
  }
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch (error) {
    return { real: null, problem: `file not readable: ${error.code}` };
  }
  if (!stat.isFile() || !isInside(rootReal, fs.realpathSync(target))) {
    return { real: null, problem: 'not a regular file inside the checkout' };
  }
  if (stat.size > MAX_REF_FILE_BYTES) {
    return { real: null, problem: 'file is too large to check' };
  }
  return { real: target, problem: null };
};

const readReferencedLine = (root, ref) => {
  const { real, problem } = resolveInsideCheckout(root, ref.path);
  if (problem !== null) return { content: null, problem };
  const lines = fs.readFileSync(real, 'utf8').split(/\r?\n/);
  if (ref.line > lines.length) {
    return {
      content: null,
      problem: `line ${ref.line} is past the end (${lines.length} lines)`,
    };
  }
  return { content: lines[ref.line - 1], problem: null };
};

const readReferencedFile = (root, filePath) => {
  const { real, problem } = resolveInsideCheckout(root, filePath);
  if (problem !== null) return { content: null, problem };
  return { content: fs.readFileSync(real, 'utf8'), problem: null };
};

const normalizeSpaces = (text) => text.replace(/\s+/g, ' ').trim();

// A model report entry for a ci/absence id is entirely ignored (AC-8): the
// script computes those, so it never enters reference/id checking.
const checkRefs = (report, root, specItems = null) => {
  const skip = deterministicIdsOf(specItems);
  const problems = [];
  for (const entry of [...report.criteria, ...report.invariants]) {
    if (skip.has(entry.id)) continue;
    if (entry.status === STATUS_PASS && entry.refs.length === 0) {
      problems.push(`${labelOf(entry)}: PASS without references`);
    }
    for (const ref of entry.refs) {
      const label = `${labelOf(entry)}: ${ref.path}:${ref.line}`;
      const { content, problem } = readReferencedLine(root, ref);
      if (problem !== null) {
        problems.push(`${label} - ${problem}`);
        continue;
      }
      const found = normalizeSpaces(content).includes(
        normalizeSpaces(ref.quote),
      );
      if (!found) {
        const quote = JSON.stringify(ref.quote.slice(0, MAX_QUOTE_CHARS));
        problems.push(`${label} - quote not found on that line: ${quote}`);
      }
    }
  }
  return problems;
};

// Applies only to v2 "behavior" items (specItems null for legacy issues, or
// the item simply isn't type "behavior"): a PASS needs both an "impl" and a
// "test" reference, not a description of one alone.
const checkBehaviorRefs = (report, specItems) => {
  if (!Array.isArray(specItems)) return [];
  const typeOf = new Map(specItems.map((item) => [item.id, item.type]));
  const problems = [];
  for (const criterion of report.criteria) {
    if (criterion.status !== STATUS_PASS) continue;
    if (typeOf.get(criterion.id) !== BEHAVIOR_TYPE) continue;
    const kinds = new Set(criterion.refs.map((ref) => ref.kind));
    const hasBoth = BEHAVIOR_REQUIRED_KINDS.every((kind) => kinds.has(kind));
    if (!hasBoth) {
      problems.push(
        `behavior item passed without impl and test references: ${criterion.id}`,
      );
    }
  }
  return problems;
};

module.exports = {
  isInside,
  resolveInsideCheckout,
  readReferencedLine,
  readReferencedFile,
  checkRefs,
  checkBehaviorRefs,
};
