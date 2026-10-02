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
const REF_WINDOW_LINES = 2;

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

const normalizeSpaces = (text) => text.replace(/\s+/g, ' ').trim();

// Search order for a cited line L: L itself, then the two lines at distance
// 1 (above before below), then the two at distance 2 — so a nearer match
// always wins, and an equal-distance tie picks the smaller line number
// ("the line above").
const windowLines = (line) => {
  const order = [line];
  for (let distance = 1; distance <= REF_WINDOW_LINES; distance++) {
    order.push(line - distance, line + distance);
  }
  return order;
};

// Reads the file once and searches a small window around ref.line for the
// quote, rather than requiring an exact line match: the verifier model is
// occasionally off by 1-2 lines on an otherwise-correct citation. The
// "past the end" check still applies only to the cited line itself, not to
// the window (a window would otherwise hide a wildly wrong line number).
const readReferencedLine = (root, ref) => {
  const { real, problem } = resolveInsideCheckout(root, ref.path);
  if (problem !== null) return { found: null, problem };
  const lines = fs.readFileSync(real, 'utf8').split(/\r?\n/);
  if (ref.line > lines.length) {
    return {
      found: null,
      problem: `line ${ref.line} is past the end (${lines.length} lines)`,
    };
  }
  const quote = normalizeSpaces(ref.quote);
  for (const candidate of windowLines(ref.line)) {
    if (candidate < 1 || candidate > lines.length) continue;
    if (normalizeSpaces(lines[candidate - 1]).includes(quote)) {
      return { found: candidate, problem: null };
    }
  }
  return { found: null, problem: null };
};

const readReferencedFile = (root, filePath) => {
  const { real, problem } = resolveInsideCheckout(root, filePath);
  if (problem !== null) return { content: null, problem };
  return { content: fs.readFileSync(real, 'utf8'), problem: null };
};

// A model report entry for a ci/absence id is entirely ignored (AC-8): the
// script computes those, so it never enters reference/id checking. Walks
// criteria and invariants as two separate lists (not one combined array) so
// entry/ref indices in the returned notes match INV-7's file format, which
// positions a note against one list's own array.
const checkListRefs = (list, entries, root, skip) => {
  const problems = [];
  const notes = [];
  entries.forEach((entry, entryIndex) => {
    if (skip.has(entry.id)) return;
    if (entry.status === STATUS_PASS && entry.refs.length === 0) {
      problems.push(`${labelOf(entry)}: PASS without references`);
    }
    entry.refs.forEach((ref, refIndex) => {
      const label = `${labelOf(entry)}: ${ref.path}:${ref.line}`;
      const { found, problem } = readReferencedLine(root, ref);
      if (problem !== null) {
        problems.push(`${label} - ${problem}`);
        return;
      }
      if (found === null) {
        const quote = JSON.stringify(ref.quote.slice(0, MAX_QUOTE_CHARS));
        const window = REF_WINDOW_LINES;
        problems.push(
          `${label} - quote not found within ${window} lines: ${quote}`,
        );
        return;
      }
      if (found !== ref.line) {
        notes.push({
          list,
          entry: entryIndex,
          ref: refIndex,
          cited: ref.line,
          found,
        });
      }
    });
  });
  return { problems, notes };
};

// Returns both the existing problems array and the shift notes (INV-6/7): a
// new function rather than changing checkRefs's own signature/return, so
// existing callers/tests of checkRefs keep working unchanged.
const checkRefsWithNotes = (report, root, specItems = null) => {
  const skip = deterministicIdsOf(specItems);
  const criteria = checkListRefs('criteria', report.criteria, root, skip);
  const invariants = checkListRefs(
    'invariants',
    report.invariants,
    root,
    skip,
  );
  return {
    problems: [...criteria.problems, ...invariants.problems],
    notes: [...criteria.notes, ...invariants.notes],
  };
};

const checkRefs = (report, root, specItems = null) =>
  checkRefsWithNotes(report, root, specItems).problems;

// Translates INV-7's positional notes (indices into the raw, pre-merge
// report checkRefsWithNotes read) into a lookup keyed by the entry's own
// stable id: mergeComputed() reorders report.criteria for ci/absence
// entries, so a rendered entry's array position can differ from the one the
// notes were computed against, while its id and its refs array do not.
const notesByKey = (parsed, refsNotes) => {
  const map = new Map();
  if (parsed === null) return map;
  for (const note of refsNotes) {
    const list =
      note.list === 'invariants' ? parsed.invariants : parsed.criteria;
    const entry = list[note.entry];
    if (entry === undefined || note.ref >= entry.refs.length) continue;
    map.set(`${note.list}:${entry.id}:${note.ref}`, note);
  }
  return map;
};

// A behavior implemented directly in a CI/workflow file has nothing to cite
// as "impl" — only "ci" — so a "ci" reference stands in for "impl" here.
const KIND_ALTERNATES = { impl: 'ci' };

const hasKindOrAlternate = (kinds, kind) =>
  kinds.has(kind) || kinds.has(KIND_ALTERNATES[kind]);

// Applies only to v2 "behavior" items (specItems null for legacy issues, or
// the item simply isn't type "behavior"): a PASS needs both an "impl" (or,
// for a CI/workflow-implemented behavior, "ci") reference and a "test"
// reference, not a description of one alone.
const checkBehaviorRefs = (report, specItems) => {
  if (!Array.isArray(specItems)) return [];
  const typeOf = new Map(specItems.map((item) => [item.id, item.type]));
  const problems = [];
  for (const criterion of report.criteria) {
    if (criterion.status !== STATUS_PASS) continue;
    if (typeOf.get(criterion.id) !== BEHAVIOR_TYPE) continue;
    const kinds = new Set(criterion.refs.map((ref) => ref.kind));
    const hasBoth = BEHAVIOR_REQUIRED_KINDS.every((kind) =>
      hasKindOrAlternate(kinds, kind),
    );
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
  checkRefsWithNotes,
  notesByKey,
  checkBehaviorRefs,
};
