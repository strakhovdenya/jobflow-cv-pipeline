import * as fs from 'fs';
import * as path from 'path';
import { CANDIDATE_PROFILE_CONFIG } from '../../document-export/candidate-profile.config';
import { ACTIVE_KNOWLEDGE_SOURCES } from '../../knowledge-sources/active-knowledge-sources';
import {
  CandidateConstants,
  buildCandidateConstants,
  renderCandidateConstantsBlock,
} from './candidate-constants-block';

// ADR-046 item 10: CANDIDATE_PROFILE_CONFIG is the authority for language levels, location and
// work authorisation; this spec fails when the real active sources state other values. The
// values are read from the config and the sources at run time, never copied here (INV-12).

const KNOWLEDGE_SOURCES_ROOT = path.join(
  __dirname,
  '../../../knowledge-sources',
);

const activeSourceTexts = (): string[] =>
  ACTIVE_KNOWLEDGE_SOURCES.filter(
    (entry) => path.extname(entry.relativePath).toLowerCase() === '.md',
  ).map((entry) =>
    fs.readFileSync(
      path.join(KNOWLEDGE_SOURCES_ROOT, entry.relativePath),
      'utf-8',
    ),
  );

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The level itself, without the usage note after the first comma: "B1/B1+, used …" → "b1/b1+".
const levelCode = (level: string): string =>
  level.split(',')[0].trim().toLowerCase();

// "Eligible to work in X" / "Authorized to work in X" → "x".
const AUTHORISATION = /to work in ([^.·,]+)/iu;
const jurisdictionOf = (text: string): string | null => {
  const match = AUTHORISATION.exec(text);
  return match ? match[1].trim().toLowerCase() : null;
};

interface Mismatch {
  field: string;
  stated: string;
}

interface Comparison {
  mismatches: Mismatch[];
  // how many statements of each field were found, so a check is never vacuous
  found: Record<string, number>;
}

// Language list items ("- <Language> — <level>") and the contact line of a "Contact" section
// ("<location> · … · <work authorisation>") are where the sources state these constants.
const compareWithSources = (
  constants: CandidateConstants,
  texts: readonly string[],
): Comparison => {
  const mismatches: Mismatch[] = [];
  const found: Record<string, number> = {};
  const count = (field: string) => {
    found[field] = (found[field] ?? 0) + 1;
  };

  for (const { language, level } of constants.language_levels) {
    const item = new RegExp(`^- ${escapeRegExp(language)} — (.+)$`, 'gimu');
    for (const text of texts) {
      for (const match of text.matchAll(item)) {
        count(language);
        if (levelCode(match[1]) !== levelCode(level)) {
          mismatches.push({ field: language, stated: match[1].trim() });
        }
      }
    }
  }

  for (const text of texts) {
    const lines = text.split(/\r?\n/u);
    const heading = lines.findIndex((line) =>
      /^#{2,6} Contact\s*$/u.test(line),
    );
    if (heading === -1) continue;
    const contactLine = lines
      .slice(heading + 1)
      .find((line) => line.trim() !== '');
    if (!contactLine) continue;
    const parts = contactLine.split('·').map((part) => part.trim());
    count('location');
    if (parts[0] !== constants.location) {
      mismatches.push({ field: 'location', stated: parts[0] });
    }
    const authorisation = parts.find((part) => jurisdictionOf(part) !== null);
    if (authorisation) {
      count('work_authorisation');
      if (
        jurisdictionOf(authorisation) !==
        jurisdictionOf(constants.work_authorisation)
      ) {
        mismatches.push({ field: 'work_authorisation', stated: authorisation });
      }
    }
  }
  return { mismatches, found };
};

describe('candidate constants block', () => {
  it('matches the constants stated in the active sources', () => {
    const constants = buildCandidateConstants();
    const { mismatches, found } = compareWithSources(
      constants,
      activeSourceTexts(),
    );

    expect(mismatches).toEqual([]);
    // Every constant is stated somewhere in the active sources, so the check bites.
    for (const field of [
      ...constants.language_levels.map((item) => item.language),
      'location',
      'work_authorisation',
    ]) {
      expect({ field, isStated: (found[field] ?? 0) > 0 }).toEqual({
        field,
        isStated: true,
      });
    }
  });

  it('reports a source that states another level, location or authorisation', () => {
    const constants = buildCandidateConstants();
    const [first] = constants.language_levels;
    const drifted = [
      `## Languages\n\n- ${first.language} — Z9, invented level`,
      `### Contact\n\nNowhere City · Phone · Authorized to work in Nowhere Land`,
    ];

    const { mismatches } = compareWithSources(constants, drifted);

    expect(mismatches).toEqual([
      { field: first.language, stated: 'Z9, invented level' },
      { field: 'location', stated: 'Nowhere City' },
      {
        field: 'work_authorisation',
        stated: 'Authorized to work in Nowhere Land',
      },
    ]);
  });

  it('contains no contact data', () => {
    const constants = buildCandidateConstants();
    const block = renderCandidateConstantsBlock(constants);
    const { candidate, links } = CANDIDATE_PROFILE_CONFIG;
    const forbidden = [
      candidate.name,
      ...Object.values(candidate.contact).filter(
        (value): value is string => typeof value === 'string' && value !== '',
      ),
      ...links.map((link) => link.url),
    ];

    expect(Object.keys(constants).sort()).toEqual([
      'language_levels',
      'location',
      'work_authorisation',
    ]);
    for (const item of constants.language_levels) {
      expect(Object.keys(item).sort()).toEqual(['language', 'level']);
    }
    expect(forbidden.length).toBeGreaterThan(0);
    for (const value of forbidden) {
      expect(block).not.toContain(value);
    }
    expect(JSON.parse(block)).toEqual(constants);
  });

  it('takes the values from the given config', () => {
    const config = {
      ...CANDIDATE_PROFILE_CONFIG,
      candidate: {
        ...CANDIDATE_PROFILE_CONFIG.candidate,
        location: 'Sample City',
        work_authorization: 'Eligible to work in Sample Land',
      },
      languages: [{ language: 'Sample', level: 'C2', notes: 'ignored' }],
    };

    expect(buildCandidateConstants(config)).toEqual({
      language_levels: [{ language: 'Sample', level: 'C2' }],
      location: 'Sample City',
      work_authorisation: 'Eligible to work in Sample Land',
    });
  });
});
