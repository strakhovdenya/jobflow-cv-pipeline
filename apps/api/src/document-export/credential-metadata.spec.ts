import type {
  CvCertification,
  CvContent,
} from '../pipeline/schemas/cv-content.schema';
import type {
  RegistrySnapshot,
  RegistrySnapshotCredential,
} from '../evidence/registry-compliance';
import { applyCredentialMetadata } from './credential-metadata';

const BADGE = 'Sample Agent Badge';
const BADGE_ALIAS = 'Sample Agents Badge';
const CERTIFICATE = 'Sample Cloud Certificate';
const COURSE = 'Sample Testing Course';
const UNDATED_COURSE = 'Sample Undated Course';
const LAB = 'Sample Lab';
const FORCED = 'Sample Local Workshop';
const LABELLED_BADGE = 'Sample Platform Skill Badge';
const LABEL_INSIDE_BADGE = 'Sample Skill Badge Workshop';
const CERTIFICATE_ENDING_IN_BADGE = 'Sample Vendor Skill Badge';
const LONGER_WORD_BADGE = 'Sample Superskill Badge';

function credential(
  title: string,
  overrides: Partial<RegistrySnapshotCredential> = {},
): RegistrySnapshotCredential {
  return {
    title,
    aliases: [],
    type: 'course_completion',
    status: 'completed',
    cvEligible: true,
    issuer: 'Sample Learning',
    issued: '2026-02',
    ...overrides,
  };
}

function makeSnapshot(): RegistrySnapshot {
  return {
    schema: 'registry-snapshot/v2',
    projects: [],
    credentials: [
      credential(BADGE, {
        aliases: [BADGE_ALIAS],
        type: 'skill_badge',
        status: 'earned',
        issuer: 'Sample Cloud',
        issued: '2025-11',
      }),
      credential(CERTIFICATE, {
        type: 'professional_certificate',
        status: 'earned',
        issuer: 'Sample Vendor',
        issued: '2024-06',
      }),
      credential(COURSE),
      credential(UNDATED_COURSE, { issued: null }),
      credential(LAB, { type: 'lab', cvEligible: false }),
      credential(LABELLED_BADGE, {
        type: 'skill_badge',
        status: 'earned',
        issuer: 'Sample Cloud',
        issued: '2025-11',
      }),
      credential(LABEL_INSIDE_BADGE, {
        type: 'skill_badge',
        status: 'earned',
        issuer: 'Sample Cloud',
      }),
      credential(CERTIFICATE_ENDING_IN_BADGE, {
        type: 'professional_certificate',
        status: 'earned',
        issuer: 'Sample Vendor',
      }),
      credential(LONGER_WORD_BADGE, {
        type: 'skill_badge',
        status: 'earned',
        issuer: 'Sample Cloud',
      }),
    ],
    acceptedForced: { projects: [], credentials: [FORCED] },
  };
}

function certification(name: string, sourceIndex: number): CvCertification {
  return { name, priority: 'medium', source_index: sourceIndex };
}

function makeContent(certifications: CvCertification[]): CvContent {
  return {
    candidate: {
      name: 'Static Candidate',
      contact: {},
      location: 'Somewhere',
      work_authorization: 'Authorized',
    },
    headline: 'Backend Developer',
    summary: ['Summary sentence.'],
    top_skills: ['Node.js'],
    current_work_block: {
      include: true,
      safe_label: 'Current Work',
      role_line: 'Independent Work',
      dates: '2025 - Present',
      stable_intro: 'Intro.',
      bullets: [],
      tech_stack: [],
    },
    experience: [],
    selected_projects: [],
    education: [],
    certifications,
    languages: [],
    links: [],
    volunteering: [],
    rendering_hints: {
      density: 'normal',
      target_pages: 2,
      max_pages: 3,
      strong_match_allows_page_3: false,
      optional_sections_to_hide_first: [],
    },
  };
}

const onlyCertification = (content: CvContent): CvCertification => {
  expect(content.certifications).toHaveLength(1);
  return content.certifications[0];
};

describe('applyCredentialMetadata', () => {
  it('adds issuer, skill badge label and year from the registry snapshot without changing the name', () => {
    const content = makeContent([certification(BADGE, 3)]);
    const before = JSON.parse(JSON.stringify(content)) as CvContent;

    const result = applyCredentialMetadata(content, makeSnapshot());

    expect(result.certifications).toEqual([
      {
        name: BADGE,
        issuer: 'Sample Cloud',
        kind: 'skill badge',
        date: '2025',
        priority: 'medium',
        source_index: 3,
      },
    ]);
    const { certifications: _changed, ...rest } = result;
    const { certifications: _original, ...restBefore } = before;
    expect(rest).toEqual(restBefore);
    expect(content).toEqual(before);
  });

  it('labels a professional certificate', () => {
    const result = applyCredentialMetadata(
      makeContent([certification(CERTIFICATE, 0)]),
      makeSnapshot(),
    );
    expect(onlyCertification(result)).toMatchObject({
      name: CERTIFICATE,
      issuer: 'Sample Vendor',
      kind: 'professional certificate',
      date: '2024',
    });
  });

  it('adds no type label to a course completion', () => {
    const cert = onlyCertification(
      applyCredentialMetadata(
        makeContent([certification(COURSE, 0)]),
        makeSnapshot(),
      ),
    );
    expect(cert.issuer).toBe('Sample Learning');
    expect(cert.date).toBe('2026');
    expect(cert.kind).toBeUndefined();
  });

  it('omits the year when the registry has no issue date', () => {
    const cert = onlyCertification(
      applyCredentialMetadata(
        makeContent([certification(UNDATED_COURSE, 0)]),
        makeSnapshot(),
      ),
    );
    expect(cert.issuer).toBe('Sample Learning');
    expect(cert.date).toBeUndefined();
  });

  it('resolves metadata for a credential named by an alias and keeps the alias as its name', () => {
    const cert = onlyCertification(
      applyCredentialMetadata(
        makeContent([certification(BADGE_ALIAS, 0)]),
        makeSnapshot(),
      ),
    );
    expect(cert).toMatchObject({
      name: BADGE_ALIAS,
      issuer: 'Sample Cloud',
      kind: 'skill badge',
      date: '2025',
    });
  });

  it('omits unknown credential metadata without inventing values', () => {
    const forced = certification(FORCED, 1);
    const cert = onlyCertification(
      applyCredentialMetadata(makeContent([forced]), makeSnapshot()),
    );
    expect(cert).toEqual(forced);
    expect(cert).not.toHaveProperty('issuer');
    expect(cert).not.toHaveProperty('kind');
    expect(cert).not.toHaveProperty('date');
  });

  it('adds no metadata from a snapshot entry that is not cv eligible', () => {
    const cert = onlyCertification(
      applyCredentialMetadata(
        makeContent([certification(LAB, 0)]),
        makeSnapshot(),
      ),
    );
    expect(cert).toEqual(certification(LAB, 0));
  });

  it('omits the type label when the certification name already ends with it', () => {
    const cert = onlyCertification(
      applyCredentialMetadata(
        makeContent([certification(LABELLED_BADGE, 2)]),
        makeSnapshot(),
      ),
    );
    expect(cert.name).toBe(LABELLED_BADGE);
    expect(cert.issuer).toBe('Sample Cloud');
    expect(cert.date).toBe('2025');
    expect(cert.kind).toBeUndefined();
  });

  it('omits the type label for a name that ends with it in another case and spacing', () => {
    const name = '  sample platform   SKILL BADGE ';
    const cert = onlyCertification(
      applyCredentialMetadata(
        makeContent([certification(name, 0)]),
        makeSnapshot(),
      ),
    );
    expect(cert.name).toBe(name);
    expect(cert.issuer).toBe('Sample Cloud');
    expect(cert.kind).toBeUndefined();
  });

  it('keeps the type label when the name contains it before the end', () => {
    const cert = onlyCertification(
      applyCredentialMetadata(
        makeContent([certification(LABEL_INSIDE_BADGE, 0)]),
        makeSnapshot(),
      ),
    );
    expect(cert.name).toBe(LABEL_INSIDE_BADGE);
    expect(cert.kind).toBe('skill badge');
  });

  it('keeps its own type label when the name ends with another one', () => {
    const cert = onlyCertification(
      applyCredentialMetadata(
        makeContent([certification(CERTIFICATE_ENDING_IN_BADGE, 0)]),
        makeSnapshot(),
      ),
    );
    expect(cert.name).toBe(CERTIFICATE_ENDING_IN_BADGE);
    expect(cert.kind).toBe('professional certificate');
  });

  it('keeps the type label when the name ends with a longer word', () => {
    const cert = onlyCertification(
      applyCredentialMetadata(
        makeContent([certification(LONGER_WORD_BADGE, 0)]),
        makeSnapshot(),
      ),
    );
    expect(cert.name).toBe(LONGER_WORD_BADGE);
    expect(cert.kind).toBe('skill badge');
  });

  it('adds no metadata from a registry-snapshot/v1 or a missing snapshot', () => {
    const content = makeContent([certification(BADGE, 0)]);
    const v1: RegistrySnapshot = {
      ...makeSnapshot(),
      schema: 'registry-snapshot/v1',
    };

    expect(applyCredentialMetadata(content, v1)).toBe(content);
    expect(applyCredentialMetadata(content, null)).toBe(content);
  });
});
