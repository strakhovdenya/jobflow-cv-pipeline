import { buildEvidenceCatalog } from '../structured-analysis/evidence-catalog';
import {
  catalogHashOf,
  parseAssessmentAnswer,
  parseRequirementsAnswer,
  parseStageJson,
  recordSnapshotId,
  snapshotIdOf,
  stagesOf,
} from './analysis-stages';

const [X1, X2] = stagesOf('c');
const [B] = stagesOf('b');

const source = (sourceType: string, contentHash = `hash-${sourceType}`) => ({
  id: `ks-${sourceType}`,
  sourceType,
  contentHash,
});

describe('analysis stages', () => {
  it('runs B as one stage and C as X1 followed by X2', () => {
    expect(stagesOf('b').map((stage) => stage.key)).toEqual(['analysis_b']);
    expect(stagesOf('c').map((stage) => stage.key)).toEqual([
      'analysis_x1',
      'analysis_x2',
    ]);
    expect(X1.isCandidateAware).toBe(false);
    expect(X2.isCandidateAware).toBe(true);
    expect(B).toEqual(
      expect.objectContaining({
        producesRequirements: true,
        producesAssessment: true,
      }),
    );
    // B carries both contract majors, X1 and X2 one each.
    expect(B.contractMajors).toEqual([
      ...X1.contractMajors,
      ...X2.contractMajors,
    ]);
  });
});

describe('stage answers', () => {
  const assessment = { contract_version: '1.0' };
  const requirements = { contract_version: '1.0' };

  it('reads the X2 and B envelopes', () => {
    expect(
      parseAssessmentAnswer(X2, {
        fit_assessment: assessment,
        advisory_decision: 'maybe',
      }),
    ).toEqual({
      success: true,
      data: {
        requirements: null,
        assessment,
        advisoryDecision: 'maybe',
      },
    });
    expect(
      parseAssessmentAnswer(B, {
        vacancy_requirements: requirements,
        fit_assessment: assessment,
        advisory_decision: 'apply',
      }),
    ).toEqual({
      success: true,
      data: { requirements, assessment, advisoryDecision: 'apply' },
    });
  });

  it('rejects a stage answer without its envelope fields', () => {
    const errorsOf = (stage: typeof X2, raw: unknown): string[] => {
      const result = parseAssessmentAnswer(stage, raw);
      return result.success ? [] : result.errors;
    };

    expect(errorsOf(X2, { fit_assessment: assessment })).toEqual([
      'advisory_decision must be apply, maybe or skip',
    ]);
    expect(
      errorsOf(X2, {
        fit_assessment: assessment,
        advisory_decision: 'borderline',
      }),
    ).toEqual(['advisory_decision must be apply, maybe or skip']);
    expect(errorsOf(X2, { advisory_decision: 'skip' })).toEqual([
      'fit_assessment must be an object',
    ]);
    expect(
      errorsOf(B, { fit_assessment: assessment, advisory_decision: 'skip' }),
    ).toEqual(['vacancy_requirements must be an object']);
    expect(errorsOf(B, [])).toEqual([
      'the analysis_b answer must be a JSON object',
    ]);
    expect(parseRequirementsAnswer('text')).toEqual({
      success: false,
      errors: ['the X1 answer must be a JSON object'],
    });
  });

  it('reports a non-JSON answer', () => {
    const result = parseStageJson('{ not json');
    expect(result.success).toBe(false);
    expect(result.success ? [] : result.errors).toEqual([
      expect.stringMatching(/^the answer is not JSON: /),
    ]);
  });
});

describe('the pinned snapshot', () => {
  it('derives the snapshot id from source ids and hashes, not from their order', () => {
    const sources = [source('career_cases'), source('cv_rules')];
    const id = snapshotIdOf(sources);

    expect(id).toMatch(/^snap-[0-9a-f]{16}$/);
    expect(snapshotIdOf([...sources].reverse())).toBe(id);
    expect(
      snapshotIdOf([source('career_cases', 'other-hash'), source('cv_rules')]),
    ).not.toBe(id);
  });

  it('hashes the catalog of a snapshot', () => {
    const catalogOf = (snapshotId: string, caseTitle: string) =>
      buildEvidenceCatalog({
        snapshotId,
        careerCasesText: `# Case 1 — ${caseTitle}\n\n## 1. Context\n`,
        projects: [],
        credentials: [],
      });

    const hash = catalogHashOf(catalogOf('snap-a', 'Sample'));
    expect(catalogHashOf(catalogOf('snap-a', 'Other title'))).toBe(hash);
    expect(catalogHashOf(catalogOf('snap-b', 'Sample'))).not.toBe(hash);
    expect(
      catalogHashOf(
        buildEvidenceCatalog({
          snapshotId: 'snap-a',
          careerCasesText: '# Case 1 — Sample\n\n## 1. A\n## 2. B\n',
          projects: [],
          credentials: [],
        }),
      ),
    ).not.toBe(hash);
  });

  it('records the snapshot id where the answer carries none', () => {
    const answer = {
      contract_version: '1.0',
      coverage: [
        {
          requirement_id: 'R1',
          evidence: [
            { ref: 'case:1', provenance: 'commercial' },
            { ref: 'case:1#section-1', snapshot_id: null },
            { ref: 'case:2', snapshot_id: 'snap-other' },
            { ref: 'manual_note:n1', provenance: 'manual_note' },
          ],
        },
      ],
    };

    const recorded = recordSnapshotId(answer, 'snap-run') as {
      snapshot_id: string;
      coverage: { evidence: Record<string, unknown>[] }[];
    };

    expect(recorded.snapshot_id).toBe('snap-run');
    expect(recorded.coverage[0].evidence.map((ref) => ref.snapshot_id)).toEqual(
      ['snap-run', 'snap-run', 'snap-other', undefined],
    );
    // The answer itself is not changed.
    expect(answer.coverage[0].evidence[0]).not.toHaveProperty('snapshot_id');
  });

  it('keeps a snapshot id the answer already holds and ignores a non-object', () => {
    expect(
      recordSnapshotId({ snapshot_id: 'snap-model', coverage: [] }, 'snap-run'),
    ).toEqual({ snapshot_id: 'snap-model', coverage: [] });
    expect(recordSnapshotId('text', 'snap-run')).toBe('text');
  });
});
