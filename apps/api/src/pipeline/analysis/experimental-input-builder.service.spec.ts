import { ContextLayout, ContextSourceSet } from '@prisma/client';
import {
  activeKnowledgeSourceRows,
  createKnowledgeSourceContentService,
} from '../../../test/legacy-input-reference.helper';
import { KnowledgeSourceContentEntry } from '../../knowledge-sources/knowledge-source-content.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { buildEvidenceCatalog } from '../structured-analysis/evidence-catalog';
import { snapshotIdOf, stagesOf } from './analysis-stages';
import {
  AiWeightExcerptError,
  AssessmentRequestInput,
  EvidenceCatalogSourceError,
  ExperimentalInputBuilderService,
  buildAssessmentRequest,
  buildExtractionRequest,
  buildStageCatalog,
  extractAiWeightExcerpt,
  renderEvidenceCatalog,
} from './experimental-input-builder.service';

const [X1, X2] = stagesOf('c');
const [B] = stagesOf('b');

const TEMPLATE = 'Stage template text.';
const VACANCY = 'Generic vacancy text.';
const REQUIREMENTS = '{"contract_version":"1.0","requirements":[]}';
const SOURCE_TEXT = 'Generic candidate evidence text.';
const CONSTANTS = '{"location":"Sample City"}';
const NOTE = { id: 'note-1', text: 'A generic manual note.' };

const entry = (sourceType: string): KnowledgeSourceContentEntry => ({
  id: `ks-${sourceType}`,
  sourceType,
  filePath: `/knowledge/${sourceType}.md`,
  versionLabel: 'v1',
  contentAvailable: true,
  content: `${SOURCE_TEXT} (${sourceType})`,
});

const CATALOG = buildEvidenceCatalog({
  snapshotId: 'snap-test',
  careerCasesText: '# Case 1 — Sample case\n\n## 1. Context\n',
  projects: [],
  credentials: [],
});

const requestInput = (layout: ContextLayout): AssessmentRequestInput => ({
  templateContent: TEMPLATE,
  layout,
  vacancyText: VACANCY,
  requirementsText: REQUIREMENTS,
  entries: [entry('career_cases')],
  aiWeightExcerpt: null,
  catalog: CATALOG,
  candidateConstantsBlock: CONSTANTS,
  manualNotes: [NOTE],
});

const createBuilder = () =>
  new ExperimentalInputBuilderService(
    new KnowledgeSourceSelectionService(),
    createKnowledgeSourceContentService(),
  );

describe('assessment request layouts', () => {
  it('builds the single and boundary layouts', () => {
    const single = buildAssessmentRequest(requestInput(ContextLayout.single));
    const boundary = buildAssessmentRequest(
      requestInput(ContextLayout.boundary),
    );
    const stableParts = [SOURCE_TEXT, 'snap-test', 'case:1', CONSTANTS];
    const dynamicParts = [VACANCY, REQUIREMENTS, NOTE.text];

    // single: the legacy split — the template alone is the prompt.
    expect(single.prompt).toBe(TEMPLATE);
    for (const part of [...stableParts, ...dynamicParts]) {
      expect(single.inputContext).toContain(part);
    }
    // boundary: the stable source pack moves behind the template into the prompt.
    expect(boundary.prompt.startsWith(`${TEMPLATE}\n`)).toBe(true);
    for (const part of stableParts) {
      expect(boundary.prompt).toContain(part);
      expect(boundary.inputContext).not.toContain(part);
    }
    for (const part of dynamicParts) {
      expect(boundary.inputContext).toContain(part);
      expect(boundary.prompt).not.toContain(part);
    }
  });

  it('gives each manual note its id and leaves the block out without notes', () => {
    const withNote = buildAssessmentRequest(requestInput(ContextLayout.single));
    const withoutNote = buildAssessmentRequest({
      ...requestInput(ContextLayout.single),
      manualNotes: [],
    });

    expect(withNote.inputContext).toContain(
      `=== MANUAL NOTE ===\n[manual_note:${NOTE.id}]\n${NOTE.text}`,
    );
    expect(withoutNote.inputContext).not.toContain('MANUAL NOTE');
  });

  it('omits 01a for B and adds the AI-weight excerpt only when given', () => {
    const b = buildAssessmentRequest({
      ...requestInput(ContextLayout.single),
      requirementsText: null,
      aiWeightExcerpt: '### AI weight rules',
    });

    expect(b.inputContext).not.toContain('VACANCY REQUIREMENTS (01a)');
    expect(b.inputContext).toContain(
      '=== AI-WEIGHT RULES (cv_rules excerpt) ===\n### AI weight rules',
    );
    expect(
      buildAssessmentRequest(requestInput(ContextLayout.single)).inputContext,
    ).not.toContain('AI-WEIGHT RULES');
  });

  it('renders every catalog entry with its flags', () => {
    expect(renderEvidenceCatalog(CATALOG).split('\n')).toEqual([
      'Snapshot id: snap-test',
      'case:1 | kind: case | provenance: judged by the assessment | assessable: yes | displayable: yes',
      'case:1#section-1 | kind: case | provenance: judged by the assessment | assessable: yes | displayable: yes',
    ]);
  });
});

describe('X1 request', () => {
  it('carries only the vacancy and the AI-weight excerpt', () => {
    const request = buildExtractionRequest(TEMPLATE, VACANCY, '### Excerpt');

    expect(request).toEqual({
      prompt: TEMPLATE,
      inputContext: `=== VACANCY TEXT ===\n${VACANCY}\n\n=== AI-WEIGHT RULES (cv_rules excerpt) ===\n### Excerpt`,
    });
  });
});

describe('extractAiWeightExcerpt', () => {
  const rules = [
    '## 9. Selection',
    '### 9.2 Registry fields',
    'Registry text.',
    '### 9.3 AI-assisted engineering: weight and kind',
    'Weight text.',
    '#### Detail',
    'Detail text.',
    '### 9.4 Expected selection',
    'Selection text.',
  ].join('\r\n');

  it('cuts the section by heading up to the next heading of its level', () => {
    expect(extractAiWeightExcerpt(rules)).toBe(
      [
        '### 9.3 AI-assisted engineering: weight and kind',
        'Weight text.',
        '#### Detail',
        'Detail text.',
      ].join('\n'),
    );
  });

  it('runs to the end of the text when no later heading follows', () => {
    expect(
      extractAiWeightExcerpt(
        '## AI-assisted engineering: weight and kind\nEnd.',
      ),
    ).toBe('## AI-assisted engineering: weight and kind\nEnd.');
  });

  it('fails closed when the section is missing', () => {
    expect(() => extractAiWeightExcerpt('## Other rules\nText.')).toThrow(
      AiWeightExcerptError,
    );
  });
});

describe('buildStageCatalog', () => {
  it('needs the career cases', () => {
    expect(() => buildStageCatalog([entry('cv_rules')], 'snap-x')).toThrow(
      EvidenceCatalogSourceError,
    );
  });
});

describe('ExperimentalInputBuilderService.loadStageSources (real active sources)', () => {
  const typesOf = (sources: { sourceType: string }[]) =>
    sources.map((source) => source.sourceType).sort();

  it('gives X1 only its cv_rules excerpt', async () => {
    const loaded = await createBuilder().loadStageSources(
      X1,
      ContextSourceSet.assessment,
      activeKnowledgeSourceRows(),
    );

    expect(typesOf(loaded.sources)).toEqual(['cv_rules']);
    expect(loaded.entries).toEqual([]);
    expect(loaded.aiWeightExcerpt).toMatch(
      /^#+ .*AI-assisted engineering: weight and kind/u,
    );
  });

  it('gives X2 the Prompt 1 sources, narrowed by the assessment set', async () => {
    const rows = activeKnowledgeSourceRows();
    const prompt1Types = typesOf(
      new KnowledgeSourceSelectionService().selectForStep('prompt_1', rows),
    );
    const full = await createBuilder().loadStageSources(
      X2,
      ContextSourceSet.full,
      rows,
    );
    const assessment = await createBuilder().loadStageSources(
      X2,
      ContextSourceSet.assessment,
      rows,
    );

    expect(typesOf(full.sources)).toEqual(prompt1Types);
    expect(typesOf(full.entries)).toEqual(prompt1Types);
    expect(full.aiWeightExcerpt).toBeNull();
    expect(typesOf(assessment.entries)).toEqual(
      prompt1Types.filter(
        (type) => type !== 'profile_summary' && type !== 'cv_rules',
      ),
    );
    expect(assessment.aiWeightExcerpt).toBeNull();
    // The real registries and career cases yield a catalog.
    const catalog = buildStageCatalog(full.entries, snapshotIdOf(full.sources));
    expect(catalog.entries.size).toBeGreaterThan(0);
  });

  it('keeps the AI-weight excerpt for B when the assessment set drops cv_rules', async () => {
    const rows = activeKnowledgeSourceRows();
    const full = await createBuilder().loadStageSources(
      B,
      ContextSourceSet.full,
      rows,
    );
    const assessment = await createBuilder().loadStageSources(
      B,
      ContextSourceSet.assessment,
      rows,
    );

    expect(full.aiWeightExcerpt).toBeNull();
    expect(typesOf(assessment.entries)).not.toContain('cv_rules');
    expect(typesOf(assessment.sources)).toContain('cv_rules');
    expect(assessment.aiWeightExcerpt).toMatch(
      /AI-assisted engineering: weight and kind/u,
    );
  });
});
