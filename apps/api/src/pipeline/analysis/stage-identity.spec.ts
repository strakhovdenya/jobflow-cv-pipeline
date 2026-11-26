import { createHash } from 'crypto';
import {
  AssessmentIdentityInput,
  ExtractionIdentityInput,
  RESPONSE_FORMAT_JSON_OBJECT,
  computeStageIdentity,
  stageIdentityComponents,
} from './stage-identity';

// One analysis "world": everything any stage of a run could read. Each stage identity is built
// from it the way the runner builds it, so a change of the world shows which identities move.
interface World {
  vacancyText: string;
  aiWeightExcerpt: string;
  requirementsText: string;
  candidateSources: { id: string; sourceType: string; contentHash: string }[];
  catalogHash: string;
  manualNotes: { id: string; text: string }[];
  candidateConstantsBlock: string;
}

const WORLD: World = {
  vacancyText: 'Generic vacancy text.',
  aiWeightExcerpt: '### AI weight\nCore, Plus, Not mentioned.',
  requirementsText: '{"contract_version":"1.0"}',
  candidateSources: [
    { id: 'ks-cases', sourceType: 'career_cases', contentHash: 'hash-1' },
    { id: 'ks-rules', sourceType: 'cv_rules', contentHash: 'hash-2' },
  ],
  catalogHash: 'catalog-hash-1',
  manualNotes: [{ id: 'note-1', text: 'A generic note.' }],
  candidateConstantsBlock: '{"location":"Sample City"}',
};

const COMMON = {
  templateContent: 'Template text.',
  model: { provider: 'fake', model: 'fake-model-v1' },
  settings: {
    maxOutputTokens: 8000,
    responseFormat: RESPONSE_FORMAT_JSON_OBJECT,
  },
};

// The request a stage sends is a function of exactly the inputs it reads.
const digest = (parts: readonly unknown[]) =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex');

const x1Of = (world: World): ExtractionIdentityInput => ({
  ...COMMON,
  requestHash: digest([world.vacancyText, world.aiWeightExcerpt]),
  stage: 'analysis_x1',
  contractMajors: [1],
  vacancyText: world.vacancyText,
  aiWeightExcerpt: world.aiWeightExcerpt,
});

const x2Of = (world: World): AssessmentIdentityInput => ({
  ...COMMON,
  requestHash: digest(Object.values(world)),
  stage: 'analysis_x2',
  contractMajors: [1],
  vacancyText: world.vacancyText,
  requirementsText: world.requirementsText,
  snapshot: world.candidateSources,
  catalogHash: world.catalogHash,
  manualNotes: world.manualNotes,
  candidateConstantsBlock: world.candidateConstantsBlock,
  contextProfile: { layout: 'single', sourceSet: 'full' },
});

describe('computeStageIdentity', () => {
  it('is a stable hash of the stage inputs', () => {
    const identity = computeStageIdentity(x2Of(WORLD));

    expect(identity).toMatch(/^[0-9a-f]{64}$/);
    expect(computeStageIdentity(x2Of({ ...WORLD }))).toBe(identity);
    expect(computeStageIdentity(x1Of(WORLD))).not.toBe(identity);
  });

  it('changes X2 identity for every material input', () => {
    const base = x2Of(WORLD);
    const variants: [string, AssessmentIdentityInput][] = [
      ['template content', { ...base, templateContent: 'Template v2.' }],
      ['contract major', { ...base, contractMajors: [2] }],
      ['model', { ...base, model: { ...base.model, model: 'other-model' } }],
      ['provider', { ...base, model: { ...base.model, provider: 'other' } }],
      [
        'output cap',
        { ...base, settings: { ...base.settings, maxOutputTokens: 9000 } },
      ],
      [
        'response format',
        { ...base, settings: { ...base.settings, responseFormat: 'text' } },
      ],
      [
        'context layout',
        { ...base, contextProfile: { layout: 'boundary', sourceSet: 'full' } },
      ],
      [
        'context source set',
        {
          ...base,
          contextProfile: { layout: 'single', sourceSet: 'assessment' },
        },
      ],
      [
        'snapshot',
        {
          ...base,
          snapshot: [
            { ...base.snapshot[0], contentHash: 'hash-1b' },
            base.snapshot[1],
          ],
        },
      ],
      ['catalog', { ...base, catalogHash: 'catalog-hash-2' }],
      [
        'manual notes',
        {
          ...base,
          manualNotes: [...base.manualNotes, { id: 'note-2', text: 'New.' }],
        },
      ],
      [
        'candidate block',
        { ...base, candidateConstantsBlock: '{"location":"Other City"}' },
      ],
      ['01a', { ...base, requirementsText: '{"contract_version":"1.1"}' }],
      ['vacancy', { ...base, vacancyText: 'Another vacancy.' }],
      ['request', { ...base, requestHash: 'another-request' }],
    ];
    const baseIdentity = computeStageIdentity(base);

    for (const [input, variant] of variants) {
      expect({
        input,
        changed: computeStageIdentity(variant) !== baseIdentity,
      }).toEqual({ input, changed: true });
    }
  });

  it('keeps X1 identity when candidate sources or notes change', () => {
    const changed: World = {
      ...WORLD,
      candidateSources: [
        { id: 'ks-cases-2', sourceType: 'career_cases', contentHash: 'h-9' },
      ],
      catalogHash: 'catalog-hash-9',
      manualNotes: [{ id: 'note-9', text: 'A different note.' }],
      candidateConstantsBlock: '{"location":"Elsewhere"}',
    };

    expect(computeStageIdentity(x1Of(changed))).toBe(
      computeStageIdentity(x1Of(WORLD)),
    );
    // The same change does move X2, so the X1 result is the only one that stays reusable.
    expect(computeStageIdentity(x2Of(changed))).not.toBe(
      computeStageIdentity(x2Of(WORLD)),
    );
  });

  it('changes X1 identity when its own inputs change', () => {
    const base = computeStageIdentity(x1Of(WORLD));

    expect(
      computeStageIdentity(x1Of({ ...WORLD, aiWeightExcerpt: 'Changed.' })),
    ).not.toBe(base);
    expect(
      computeStageIdentity(x1Of({ ...WORLD, vacancyText: 'Changed.' })),
    ).not.toBe(base);
    expect(
      computeStageIdentity({
        ...x1Of(WORLD),
        model: { provider: 'fake', model: 'other-model' },
      }),
    ).not.toBe(base);
  });

  it('records hashes, never the texts, in its components', () => {
    const components = stageIdentityComponents(x2Of(WORLD));

    expect(JSON.stringify(components)).not.toContain(WORLD.vacancyText);
    expect(JSON.stringify(components)).not.toContain(WORLD.manualNotes[0].text);
    expect(components).toEqual(
      expect.objectContaining({
        stage: 'analysis_x2',
        model: 'fake-model-v1',
        maxOutputTokens: 8000,
        contextProfile: 'single/full',
        catalog: 'catalog-hash-1',
      }),
    );
    expect(stageIdentityComponents(x1Of(WORLD))).not.toHaveProperty(
      'manualNotes',
    );
  });

  it('treats B without 01a as its own stage', () => {
    const b: AssessmentIdentityInput = {
      ...x2Of(WORLD),
      stage: 'analysis_b',
      requirementsText: null,
    };

    expect(stageIdentityComponents(b).requirements).toBeNull();
    expect(computeStageIdentity(b)).not.toBe(computeStageIdentity(x2Of(WORLD)));
  });
});
