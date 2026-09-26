'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const VERIFIER_DIR = path.join(__dirname, '..', '.github', 'verifier');
const CONTRACT_JSON = path.join(VERIFIER_DIR, 'issue-contract.json');
const CONTRACT_MD = path.join(VERIFIER_DIR, 'issue-contract.md');

const readContract = () => JSON.parse(fs.readFileSync(CONTRACT_JSON, 'utf8'));
const readDoc = () => fs.readFileSync(CONTRACT_MD, 'utf8');

const tokensOf = (contract) => {
  const titles = contract.sections.map((section) => section.title);
  const prefixes = contract.sections
    .map((section) => section.idPrefix)
    .filter((prefix) => prefix !== null);
  const types = Object.keys(contract.itemTypes);
  return [...titles, ...prefixes, ...types];
};

const findMissingMentions = (contract, doc) =>
  tokensOf(contract).filter((token) => !doc.includes(`\`${token}\``));

test('issue-contract.json parses', () => {
  assert.doesNotThrow(readContract);
});

test('every section, prefix and type is mentioned in issue-contract.md', () => {
  assert.deepStrictEqual(findMissingMentions(readContract(), readDoc()), []);
});

test('removing any mention from the md is detected', () => {
  const contract = readContract();
  const doc = readDoc();
  for (const token of tokensOf(contract)) {
    const stripped = doc.replaceAll(`\`${token}\``, '');
    const missing = findMissingMentions(contract, stripped);
    assert.ok(missing.includes(token), `removal of ${token} not detected`);
  }
});

test('every type documents its Verify grammar in the md', () => {
  const contract = readContract();
  const doc = readDoc();
  for (const [name, type] of Object.entries(contract.itemTypes)) {
    assert.ok(doc.includes(type.verify), `grammar of ${name} missing in md`);
  }
});

test('all patterns in the contract compile', () => {
  const contract = readContract();
  const patterns = [
    contract.itemSyntax.checkItem,
    contract.itemSyntax.invariantItem,
    contract.parsing.fence,
    contract.parsing.topLevelItem,
    ...Object.values(contract.itemTypes).map((type) => type.verifyPattern),
  ];
  for (const pattern of patterns) {
    assert.doesNotThrow(() => new RegExp(pattern, 'u'), pattern);
  }
});

test('id prefixes map to the item sections', () => {
  const contract = readContract();
  const prefixOf = new Map(
    contract.sections.map((section) => [section.title, section.idPrefix]),
  );
  assert.strictEqual(prefixOf.get('Acceptance Criteria'), 'AC');
  assert.strictEqual(prefixOf.get('Definition of Done'), 'DOD');
  assert.strictEqual(prefixOf.get('Test Requirement'), 'TR');
  assert.strictEqual(prefixOf.get('Key Invariants'), 'INV');
});
