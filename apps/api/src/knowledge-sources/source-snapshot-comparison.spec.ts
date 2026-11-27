import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ContextSourceSet } from '@prisma/client';
import {
  PinnedSnapshot,
  PinnedSnapshotReader,
  SnapshotSourceEntry,
  assertSourcesMatchSnapshot,
  findPinnedSnapshot,
  findSourceMismatches,
  parseSnapshotSources,
  pinnedTypesOf,
} from './source-snapshot-comparison';

const WORKSPACE_ID = 'ws-snapshot';

const entry = (
  sourceType: string,
  id = `ks-${sourceType}`,
  contentHash = `hash-${sourceType}`,
): SnapshotSourceEntry => ({ id, sourceType, contentHash });

const PROMPT_1_TYPES = [
  'master_cv',
  'profile_summary',
  'tech_stack',
  'project_inventory',
  'career_cases',
  'cv_rules',
  'certifications',
];

const FULL_SNAPSHOT = PROMPT_1_TYPES.map((type) => entry(type));

const pinnedOf = (
  sources: SnapshotSourceEntry[],
  sourceSet: ContextSourceSet = ContextSourceSet.full,
  stageKey = 'analysis_x2',
) => ({
  stageKey,
  sources,
  pinnedTypes: pinnedTypesOf(stageKey, sourceSet, sources),
});

const snapshotText = (sources: SnapshotSourceEntry[]) =>
  JSON.stringify({
    snapshotId: 'snap-0000000000000000',
    catalogHash: 'catalog-hash',
    knowledgeSources: sources.map((source) => ({
      ...source,
      filePath: `/knowledge-sources/${source.sourceType}.md`,
      versionLabel: null,
    })),
  });

interface RunRecord {
  id: string;
  workspaceId: string;
  promptStep: string;
  status: string;
  sourceSnapshot: string | null;
}

// A reader over an in-memory set of runs; the latest analysis artifact names its producing run.
const makeReader = (
  analysisRunId: string | null | undefined,
  runs: RunRecord[],
) => {
  const reader = {
    generatedArtifact: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          analysisRunId === undefined ? null : { promptRunId: analysisRunId },
        ),
    },
    promptRun: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(runs.find((run) => run.id === where.id) ?? null),
      ),
    },
  };
  return reader as typeof reader & PinnedSnapshotReader;
};

const WORKSPACE = {
  id: WORKSPACE_ID,
  contextSourceSet: ContextSourceSet.full,
};

describe('parseSnapshotSources', () => {
  it('reads the id, source type and content hash of every recorded source', () => {
    expect(parseSnapshotSources(snapshotText([entry('tech_stack')]))).toEqual([
      entry('tech_stack'),
    ]);
  });

  it('reads an empty source list', () => {
    expect(parseSnapshotSources('{"knowledgeSources":[]}')).toEqual([]);
  });

  it.each([
    ['a missing snapshot', null],
    ['text that is not JSON', '{not json'],
    ['a snapshot without a source list', '{"cvContentPath":"x"}'],
    ['a source list that is not an array', '{"knowledgeSources":{}}'],
    [
      'an entry without a content hash',
      '{"knowledgeSources":[{"id":"ks-1","sourceType":"tech_stack"}]}',
    ],
    [
      'an entry with an empty id',
      '{"knowledgeSources":[{"id":"","sourceType":"tech_stack","contentHash":"h"}]}',
    ],
  ])('returns null for %s', (_label, text) => {
    expect(parseSnapshotSources(text)).toBeNull();
  });
});

describe('pinnedTypesOf', () => {
  it('pins every type of the stage for the full source set', () => {
    expect([...pinnedTypesOf('analysis_x2', 'full', [])].sort()).toEqual(
      [...PROMPT_1_TYPES].sort(),
    );
  });

  it('leaves out the types the assessment set excludes unless the snapshot holds them', () => {
    const types = pinnedTypesOf('analysis_b', 'assessment', [
      entry('cv_rules'),
    ]);

    expect(types.has('profile_summary')).toBe(false);
    expect(types.has('cv_rules')).toBe(true);
    expect(types.has('career_cases')).toBe(true);
  });
});

describe('findSourceMismatches', () => {
  it('reports no mismatch when the selected sources equal the snapshot', () => {
    const selected = [entry('tech_stack'), entry('career_cases')];

    expect(
      findSourceMismatches('prompt_3', selected, pinnedOf(FULL_SNAPSHOT)),
    ).toEqual([]);
  });

  it('reports a source type missing from the snapshot', () => {
    const snapshot = FULL_SNAPSHOT.filter(
      (source) => source.sourceType !== 'career_cases',
    );
    const selected = [entry('tech_stack'), entry('career_cases')];

    expect(
      findSourceMismatches('prompt_3', selected, pinnedOf(snapshot)),
    ).toEqual(['career_cases']);
  });

  it('reports a pinned source the step no longer selects', () => {
    expect(
      findSourceMismatches(
        'prompt_3',
        [entry('tech_stack')],
        pinnedOf(FULL_SNAPSHOT),
      ),
    ).toEqual(['career_cases']);
  });

  it('reports a hash change under the same id', () => {
    const selected = [
      entry('tech_stack'),
      entry('career_cases', 'ks-career_cases', 'hash-new'),
    ];

    expect(
      findSourceMismatches('prompt_3', selected, pinnedOf(FULL_SNAPSHOT)),
    ).toEqual(['career_cases']);
  });

  it('reports an id change under the same content hash', () => {
    const selected = [
      entry('tech_stack'),
      entry('career_cases', 'ks-new', 'hash-career_cases'),
    ];

    expect(
      findSourceMismatches('prompt_3', selected, pinnedOf(FULL_SNAPSHOT)),
    ).toEqual(['career_cases']);
  });

  it('ignores snapshot types the step does not select', () => {
    const snapshot = [
      ...FULL_SNAPSHOT,
      entry('layout'),
      entry('master_cv', 'ks-master-cv-2', 'hash-other'),
    ];
    const selected = [entry('tech_stack'), entry('career_cases')];

    expect(
      findSourceMismatches('prompt_3', selected, pinnedOf(snapshot)),
    ).toEqual([]);
  });

  it('ignores selected rows of types outside the step', () => {
    const selected = [
      entry('tech_stack'),
      entry('career_cases'),
      entry('master_cv', 'ks-other', 'hash-other'),
    ];

    expect(
      findSourceMismatches('prompt_3', selected, pinnedOf(FULL_SNAPSHOT)),
    ).toEqual([]);
  });

  it('reports every mismatched type of the cover letter in the order of its groups', () => {
    const selected = [
      entry('profile_summary'),
      entry('cv_rules', 'ks-cv-rules-2'),
      entry('career_cases', 'ks-career_cases', 'hash-new'),
      entry('tech_stack'),
      entry('project_inventory'),
    ];

    expect(
      findSourceMismatches('cover_letter', selected, pinnedOf(FULL_SNAPSHOT)),
    ).toEqual(['cv_rules', 'career_cases']);
  });

  it('does not compare the types the assessment set left out', () => {
    const snapshot = FULL_SNAPSHOT.filter(
      (source) =>
        source.sourceType !== 'profile_summary' &&
        source.sourceType !== 'cv_rules',
    );
    const pinned = pinnedOf(snapshot, ContextSourceSet.assessment);
    const unchanged = [
      entry('profile_summary', 'ks-profile-2', 'hash-profile-2'),
      entry('cv_rules', 'ks-rules-2', 'hash-rules-2'),
      entry('career_cases'),
      entry('tech_stack'),
      entry('project_inventory'),
    ];
    const changed = unchanged.map((source) =>
      source.sourceType === 'career_cases'
        ? { ...source, contentHash: 'hash-new' }
        : source,
    );

    expect(findSourceMismatches('cover_letter', unchanged, pinned)).toEqual([]);
    expect(findSourceMismatches('cover_letter', changed, pinned)).toEqual([
      'career_cases',
    ]);
  });

  it('compares a source of several rows of one type as a whole', () => {
    const snapshot = [
      entry('career_cases', 'ks-a'),
      entry('career_cases', 'ks-b'),
    ];
    const pinned = pinnedOf([...snapshot, entry('tech_stack')]);

    expect(
      findSourceMismatches(
        'prompt_3',
        [entry('tech_stack'), ...[...snapshot].reverse()],
        pinned,
      ),
    ).toEqual([]);
    expect(
      findSourceMismatches(
        'prompt_3',
        [entry('tech_stack'), entry('career_cases', 'ks-a')],
        pinned,
      ),
    ).toEqual(['career_cases']);
  });

  it('throws for a step without source groups', () => {
    expect(() =>
      findSourceMismatches('unknown_step', [], pinnedOf(FULL_SNAPSHOT)),
    ).toThrow('unknown_step');
  });
});

describe('findPinnedSnapshot', () => {
  const x2Run = (
    id: string,
    sources: SnapshotSourceEntry[],
    status = 'completed',
  ): RunRecord => ({
    id,
    workspaceId: WORKSPACE_ID,
    promptStep: 'analysis_x2',
    status,
    sourceSnapshot: snapshotText(sources),
  });

  it('looks up the latest analysis artifact of the workspace', async () => {
    const reader = makeReader(undefined, []);

    await findPinnedSnapshot(reader, WORKSPACE);

    expect(reader.generatedArtifact.findFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: WORKSPACE_ID,
        artifactType: 'vacancy_analysis_json',
        isLatest: true,
      },
      select: { promptRunId: true },
    });
  });

  it('pins the run that produced the latest analysis', async () => {
    const olderSources = [entry('tech_stack', 'ks-old', 'hash-old')];
    const latestSources = [entry('tech_stack')];
    const reader = makeReader('pr-reused', [
      x2Run('pr-older', olderSources, 'completed'),
      x2Run('pr-reused', latestSources, 'failed'),
    ]);

    const pinned = await findPinnedSnapshot(reader, WORKSPACE);

    expect(reader.promptRun.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pr-reused' } }),
    );
    expect(pinned).toEqual({
      kind: 'pinned',
      stageKey: 'analysis_x2',
      sources: latestSources,
      pinnedTypes: expect.any(Set),
    });
  });

  it('pins the snapshot of a B run with the pinned types of its source set', async () => {
    const sources = [entry('cv_rules'), entry('career_cases')];
    const reader = makeReader('pr-b', [
      { ...x2Run('pr-b', sources), promptStep: 'analysis_b' },
    ]);

    const pinned = await findPinnedSnapshot(reader, {
      id: WORKSPACE_ID,
      contextSourceSet: ContextSourceSet.assessment,
    });

    expect(pinned.kind).toBe('pinned');
    const { pinnedTypes } = pinned as Extract<
      PinnedSnapshot,
      { kind: 'pinned' }
    >;
    expect(pinnedTypes.has('cv_rules')).toBe(true);
    expect(pinnedTypes.has('profile_summary')).toBe(false);
  });

  it('finds no snapshot for a legacy analysis', async () => {
    const reader = makeReader('pr-legacy', [
      {
        id: 'pr-legacy',
        workspaceId: WORKSPACE_ID,
        promptStep: 'prompt_1',
        status: 'completed',
        sourceSnapshot: '[]',
      },
    ]);

    expect(await findPinnedSnapshot(reader, WORKSPACE)).toEqual({
      kind: 'none',
    });
  });

  it('finds no snapshot for a workspace without a completed analysis', async () => {
    const reader = makeReader(undefined, [x2Run('pr-x2', FULL_SNAPSHOT)]);

    expect(await findPinnedSnapshot(reader, WORKSPACE)).toEqual({
      kind: 'none',
    });
    expect(reader.promptRun.findUnique).not.toHaveBeenCalled();
  });

  it('finds no snapshot for an analysis artifact without a producing run', async () => {
    const reader = makeReader(null, []);

    expect(await findPinnedSnapshot(reader, WORKSPACE)).toEqual({
      kind: 'none',
    });
  });

  it('reports an unreadable snapshot when the producing run is missing', async () => {
    const reader = makeReader('pr-gone', []);

    expect(await findPinnedSnapshot(reader, WORKSPACE)).toEqual({
      kind: 'unreadable',
      reason: expect.stringContaining('pr-gone'),
    });
  });

  it('reports an unreadable snapshot when the producing run belongs to another workspace', async () => {
    const reader = makeReader('pr-other', [
      { ...x2Run('pr-other', FULL_SNAPSHOT), workspaceId: 'ws-other' },
    ]);

    expect((await findPinnedSnapshot(reader, WORKSPACE)).kind).toBe(
      'unreadable',
    );
  });

  it.each([
    ['missing', null],
    ['not JSON', '{broken'],
    ['malformed', '{"knowledgeSources":[{"id":"ks-1"}]}'],
  ])(
    'reports an unreadable snapshot when the X2 snapshot is %s',
    async (_label, sourceSnapshot) => {
      const reader = makeReader('pr-x2', [
        { ...x2Run('pr-x2', []), sourceSnapshot },
      ]);

      expect(await findPinnedSnapshot(reader, WORKSPACE)).toEqual({
        kind: 'unreadable',
        reason: expect.stringContaining('analysis_x2'),
      });
    },
  );
});

describe('assertSourcesMatchSnapshot', () => {
  const pinned: PinnedSnapshot = { kind: 'pinned', ...pinnedOf(FULL_SNAPSHOT) };

  it('does nothing without a snapshot, whatever the step selected', () => {
    expect(() =>
      assertSourcesMatchSnapshot('prompt_3', 'not even JSON', { kind: 'none' }),
    ).not.toThrow();
  });

  it('accepts sources that match the snapshot', () => {
    expect(() =>
      assertSourcesMatchSnapshot(
        'prompt_3',
        snapshotText([entry('tech_stack'), entry('career_cases')]),
        pinned,
      ),
    ).not.toThrow();
  });

  it('refuses a mismatch with a reason naming the source type', () => {
    const selected = snapshotText([
      entry('tech_stack'),
      entry('career_cases', 'ks-career_cases', 'hash-new'),
    ]);

    expect(() =>
      assertSourcesMatchSnapshot('prompt_3', selected, pinned),
    ).toThrow(BadRequestException);
    expect(() =>
      assertSourcesMatchSnapshot('prompt_3', selected, pinned),
    ).toThrow(
      /prompt_3 refused: .*\(career_cases: id or content hash changed\)/,
    );
  });

  it('refuses an unreadable pinned snapshot', () => {
    expect(() =>
      assertSourcesMatchSnapshot('cover_letter', snapshotText([]), {
        kind: 'unreadable',
        reason:
          'the source snapshot of the analysis_x2 run is missing or malformed',
      }),
    ).toThrow(BadRequestException);
  });

  it('treats an unreadable snapshot of the step itself as an internal error', () => {
    expect(() => assertSourcesMatchSnapshot('prompt_3', '{}', pinned)).toThrow(
      InternalServerErrorException,
    );
  });
});
