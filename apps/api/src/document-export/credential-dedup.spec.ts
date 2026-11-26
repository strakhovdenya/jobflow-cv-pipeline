import type {
  CvCertification,
  CvContent,
} from '../pipeline/schemas/cv-content.schema';
import {
  REGISTRY_SNAPSHOT_SCHEMA,
  RegistrySnapshot,
} from '../evidence/registry-compliance';
import { collapseRepeatedCredentials } from './credential-dedup';

const BADGE_TITLE = 'Sample Cloud Skill Badge';
const BADGE_ALIAS = 'Sample Cloud Badge';
const COURSE = 'Sample Testing Course';
const ADVANCED_COURSE = 'Sample Testing Course: Advanced';
const FORCED = 'Sample Workshop Certificate';

function makeSnapshot(acceptedCredentials: string[] = []): RegistrySnapshot {
  const credential = {
    aliases: [] as string[],
    type: 'course_completion' as const,
    status: 'completed' as const,
    cvEligible: true,
    issuer: 'Sample Issuer',
    issued: '2026-01',
  };
  return {
    schema: REGISTRY_SNAPSHOT_SCHEMA,
    projects: [],
    credentials: [
      {
        ...credential,
        title: BADGE_TITLE,
        aliases: [BADGE_ALIAS],
        type: 'skill_badge',
        status: 'earned',
      },
      { ...credential, title: COURSE },
      { ...credential, title: ADVANCED_COURSE },
    ],
    acceptedForced: { projects: [], credentials: acceptedCredentials },
  };
}

const row = (name: string, sourceIndex: number): CvCertification => ({
  name,
  priority: 'medium',
  source_index: sourceIndex,
});

// Only certifications matter to the function; the rest of the content is passed through.
function makeContent(certifications: CvCertification[]): CvContent {
  return {
    headline: 'Backend Developer',
    certifications,
  } as unknown as CvContent;
}

describe('collapseRepeatedCredentials', () => {
  it('keeps the first occurrence, its source_index and the order of the rest', () => {
    const content = makeContent([
      row(COURSE, 0),
      row(BADGE_TITLE, 2),
      row('  sample   TESTING course ', 5),
      row(ADVANCED_COURSE, 6),
      row(BADGE_TITLE.toUpperCase(), 9),
    ]);

    const result = collapseRepeatedCredentials(content, makeSnapshot());

    expect(result.certifications).toEqual([
      row(COURSE, 0),
      row(BADGE_TITLE, 2),
      row(ADVANCED_COURSE, 6),
    ]);
    expect(result.headline).toBe(content.headline);
    // The input content is not changed.
    expect(content.certifications).toHaveLength(5);
  });

  it('collapses a title and its alias to one credential', () => {
    const content = makeContent([row(BADGE_ALIAS, 1), row(BADGE_TITLE, 4)]);

    const result = collapseRepeatedCredentials(content, makeSnapshot());

    expect(result.certifications).toEqual([row(BADGE_ALIAS, 1)]);
  });

  it('keeps distinct credentials with similar names', () => {
    const content = makeContent([
      row(COURSE, 0),
      row(ADVANCED_COURSE, 1),
      row(BADGE_TITLE, 2),
    ]);

    const result = collapseRepeatedCredentials(content, makeSnapshot());

    expect(result.certifications).toEqual(content.certifications);
    expect(result).toBe(content);
  });

  it('falls back to the normalized name without a snapshot entry', () => {
    const content = makeContent([
      row(BADGE_TITLE, 0),
      row(` ${BADGE_TITLE.toLowerCase()}`, 1),
      row(BADGE_ALIAS, 2),
    ]);

    const result = collapseRepeatedCredentials(content, null);

    // Identical normalized names collapse; a title and its alias stay two rows without a snapshot.
    expect(result.certifications).toEqual([
      row(BADGE_TITLE, 0),
      row(BADGE_ALIAS, 2),
    ]);
  });

  it('collapses a repeated accepted-forced credential by name', () => {
    const content = makeContent([
      row(FORCED, 0),
      row(COURSE, 1),
      row(FORCED.toUpperCase(), 2),
    ]);

    const result = collapseRepeatedCredentials(content, makeSnapshot([FORCED]));

    expect(result.certifications).toEqual([row(FORCED, 0), row(COURSE, 1)]);
  });

  it('keeps a row whose name is not a string', () => {
    const malformed = {
      priority: 'medium',
      source_index: 1,
    } as unknown as CvCertification;
    const content = makeContent([row(COURSE, 0), malformed, malformed]);

    const result = collapseRepeatedCredentials(content, makeSnapshot());

    expect(result.certifications).toEqual([
      row(COURSE, 0),
      malformed,
      malformed,
    ]);
  });
});
