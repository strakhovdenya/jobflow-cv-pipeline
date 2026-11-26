import { CANDIDATE_PROFILE_CONFIG } from '../../document-export/candidate-profile.config';
import { applyCorrectionsToCvContent } from '../../document-export/cv-template-renderer';
import { mapPrompt2OutputToCvContent } from '../../document-export/prompt2-to-cv-content.mapper';
import {
  parseAssessmentAnswer,
  parseRequirementsAnswer,
  recordSnapshotId,
  stagesOf,
} from '../../pipeline/analysis/analysis-stages';
import { runDecisionPolicy } from '../../pipeline/structured-analysis/decision-policy';
import { buildEvidenceCatalog } from '../../pipeline/structured-analysis/evidence-catalog';
import { validateFitAssessment } from '../../pipeline/structured-analysis/fit-assessment.schema';
import { projectToLegacyVacancyAnalysis } from '../../pipeline/structured-analysis/legacy-analysis-projection';
import { validateVacancyRequirements } from '../../pipeline/structured-analysis/vacancy-requirements.schema';
import {
  FAKE_PROMPT2_JSON,
  FAKE_PROMPT3_JSON,
  FAKE_SKIP_REASON_JSON,
  FakeAiProvider,
} from './fake.provider';

describe('FakeAiProvider', () => {
  let provider: FakeAiProvider;

  beforeEach(() => {
    provider = new FakeAiProvider();
  });

  it('fake Prompt 3 correction matches the fake Prompt 2 field it corrects and is applied to it', () => {
    const correction = FAKE_PROMPT3_JSON.corrections[0];
    const content = mapPrompt2OutputToCvContent(
      FAKE_PROMPT2_JSON,
      CANDIDATE_PROFILE_CONFIG,
    );
    expect(correction.field_path).toBe('summary[0]');
    expect(correction.original_text).toBe(content.summary[0]);

    const corrected = applyCorrectionsToCvContent(content, [correction]);

    expect(corrected.summary[0]).toBe(correction.suggested_text);
  });

  it('has the expected provider and model names', () => {
    expect(provider.providerName).toBe('fake');
    expect(provider.modelName).toBe('fake-model-v1');
  });

  it('returns a non-empty text response', async () => {
    const result = await provider.complete('analyze this vacancy', 'context');

    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('returns usage data with token counts', async () => {
    const result = await provider.complete('analyze this vacancy', 'context');

    expect(result.usage).toBeDefined();
    expect(result.usage!.inputTokens).toBeGreaterThan(0);
    expect(result.usage!.outputTokens).toBeGreaterThan(0);
    expect(result.usage!.totalTokens).toBe(
      result.usage!.inputTokens! + result.usage!.outputTokens!,
    );
  });

  it('returns parsed JSON when jsonMode is enabled', async () => {
    const result = await provider.complete('analyze this vacancy', 'context', {
      jsonMode: true,
    });

    expect(result.parsedJson).toBeDefined();
    const json = result.parsedJson as Record<string, unknown>;
    expect(json.decision).toBeDefined();
    expect(json.score).toBeDefined();
  });

  it('does not return parsedJson when jsonMode is disabled', async () => {
    const result = await provider.complete('analyze this vacancy', 'context');

    expect(result.parsedJson).toBeUndefined();
  });

  it('returns predictable output on repeated calls', async () => {
    const result1 = await provider.complete('prompt', 'context');
    const result2 = await provider.complete('prompt', 'context');

    expect(result1.text).toBe(result2.text);
    expect(result1.usage?.totalTokens).toBe(result2.usage?.totalTokens);
  });

  it('returns skip reason JSON when step is skip_reason', async () => {
    const result = await provider.complete('skip prompt', 'context', {
      jsonMode: true,
      step: 'skip_reason',
    });

    expect(result.parsedJson).toBeDefined();
    const json = result.parsedJson as typeof FAKE_SKIP_REASON_JSON;
    expect(json.step).toBe('skip_reason');
    expect(json.decision).toBe('skip');
    expect(json.score).toBe(FAKE_SKIP_REASON_JSON.score);
  });

  describe('experimental analysis stages', () => {
    const vacancyText =
      'Generic vacancy text that the fake answers never quote.';
    const catalog = buildEvidenceCatalog({
      snapshotId: 'snap-fake',
      careerCasesText: '',
      projects: [],
      credentials: [],
    });
    const answerOf = async (step: string): Promise<unknown> => {
      const result = await provider.complete('template', 'context', {
        jsonMode: true,
        step,
      });
      return JSON.parse(result.text) as unknown;
    };

    // Each answer passes what the stage runner checks: the envelope, the T1 validators, the
    // policy (row V) and the legacy projection.
    it('answers each experimental stage key with a valid contract', async () => {
      const [x1, x2] = stagesOf('c');
      const [b] = stagesOf('b');

      const extraction = parseRequirementsAnswer(await answerOf(x1.key));
      if (!extraction.success) throw new Error(extraction.errors.join('; '));
      const requirements = validateVacancyRequirements(
        extraction.data,
        vacancyText,
      );
      expect(requirements).toEqual(expect.objectContaining({ success: true }));

      for (const stage of [x2, b]) {
        const answer = parseAssessmentAnswer(stage, await answerOf(stage.key));
        if (!answer.success) throw new Error(answer.errors.join('; '));
        const requirementsRaw = answer.data.requirements ?? extraction.data;
        const validRequirements = validateVacancyRequirements(
          requirementsRaw,
          vacancyText,
        );
        if (!validRequirements.success) throw new Error(stage.key);
        const assessment = validateFitAssessment(
          recordSnapshotId(answer.data.assessment, catalog.snapshotId),
          { requirements: validRequirements.data, catalog },
        );
        if (!assessment.success) throw new Error(assessment.errors.join('; '));
        const decision = runDecisionPolicy(
          {
            vacancyText,
            requirements: validRequirements.data,
            assessment: assessment.data,
            catalog,
          },
          answer.data.advisoryDecision,
        );
        expect(decision.snapshot_id).toBe('snap-fake');
        expect(() =>
          projectToLegacyVacancyAnalysis({
            workspace: {
              company_name_original: 'Company',
              company_slug: 'Company',
              role_title_original: 'Role',
              role_slug: 'Role',
            },
            requirements: validRequirements.data,
            assessment: assessment.data,
            decision,
          }),
        ).not.toThrow();
      }
    });

    it('keeps the Prompt 1 answer for prompt_1 and an unknown step', async () => {
      for (const step of ['prompt_1', 'analysis_unknown']) {
        const json = (await answerOf(step)) as Record<string, unknown>;
        expect(json.step).toBe('prompt_1_vacancy_analysis');
      }
    });
  });
});
