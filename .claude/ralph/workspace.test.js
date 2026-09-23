const test = require('node:test');
const assert = require('node:assert');
const { buildTaskRules } = require('./prompts');
const { hasDelRalphMarker } = require('./workspace');

const promptMarkerExamples = () => {
  const rules = buildTaskRules(150, []).join('\n');
  const spans = [...rules.matchAll(/`([^`\n]*DEL_RALPH:[^`\n]*)`/g)];
  return spans.map((match) => match[1]);
};

test('prompt still documents at least one marker example', () => {
  assert.ok(promptMarkerExamples().length > 0);
});

test('every marker example from the prompt is detected as a first-line marker', () => {
  for (const example of promptMarkerExamples()) {
    assert.ok(hasDelRalphMarker(`${example}\nconst a = 1;\n`), example);
  }
});

test('detects the bare form and every allowed comment prefix', () => {
  const prefixes = ['', '// ', '//', '# ', '/* ', '<!-- ', '-- ', '  // '];
  for (const prefix of prefixes) {
    const head = `${prefix}DEL_RALPH: migrated\nrest`;
    assert.ok(hasDelRalphMarker(head), JSON.stringify(prefix));
  }
});

test('handles CRLF, BOM and a marker-only file', () => {
  assert.ok(hasDelRalphMarker('// DEL_RALPH: x\r\nrest'));
  assert.ok(hasDelRalphMarker('﻿// DEL_RALPH: x\nrest'));
  assert.ok(hasDelRalphMarker('DEL_RALPH: x'));
});

test('ignores a marker that is not on the first line', () => {
  assert.strictEqual(hasDelRalphMarker('const a = 1;\n// DEL_RALPH: x\n'), false);
  assert.strictEqual(hasDelRalphMarker('\n// DEL_RALPH: x\n'), false);
});

test('ignores mentions of the marker inside other text', () => {
  assert.strictEqual(hasDelRalphMarker('// see DEL_RALPH: docs\n'), false);
  assert.strictEqual(hasDelRalphMarker('const s = "DEL_RALPH: x";\n'), false);
  assert.strictEqual(hasDelRalphMarker(''), false);
});
