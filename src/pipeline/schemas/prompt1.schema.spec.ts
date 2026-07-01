import { FAKE_PROMPT1_JSON } from '../../ai/providers/fake.provider';
import { validatePrompt1Json } from './prompt1.schema';

const validJson = JSON.stringify(FAKE_PROMPT1_JSON);

describe('validatePrompt1Json', () => {
  it('accepts a fully valid Prompt 1 JSON', () => {
    const result = validatePrompt1Json(validJson);
    expect(result.success).toBe(true);
    expect(result.data?.decision).toBe('apply');
    expect(result.data?.score).toBe(75);
    expect(result.data?.workspace.company_slug).toBe('Fake_Company');
  });

  it('rejects non-JSON string', () => {
    const result = validatePrompt1Json('this is not json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not valid JSON/i);
  });

  it('rejects JSON array at root', () => {
    const result = validatePrompt1Json('[1, 2, 3]');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/object/i);
  });

  it('rejects missing decision field', () => {
    const bad = { ...FAKE_PROMPT1_JSON, decision: undefined };
    const result = validatePrompt1Json(JSON.stringify(bad));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/decision/i);
  });

  it('rejects invalid decision value', () => {
    const bad = { ...FAKE_PROMPT1_JSON, decision: 'yes' };
    const result = validatePrompt1Json(JSON.stringify(bad));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/decision/i);
  });

  it('rejects missing workspace field', () => {
    const { workspace: _ws, ...rest } = FAKE_PROMPT1_JSON;
    const result = validatePrompt1Json(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/workspace/i);
  });

  it('rejects workspace missing company_slug', () => {
    const bad = {
      ...FAKE_PROMPT1_JSON,
      workspace: { ...FAKE_PROMPT1_JSON.workspace, company_slug: undefined },
    };
    const result = validatePrompt1Json(JSON.stringify(bad));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/company_slug/i);
  });

  it('rejects missing score', () => {
    const { score: _s, ...rest } = FAKE_PROMPT1_JSON;
    const result = validatePrompt1Json(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/score/i);
  });

  it('rejects non-integer score', () => {
    const bad = { ...FAKE_PROMPT1_JSON, score: 'high' };
    const result = validatePrompt1Json(JSON.stringify(bad));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/score/i);
  });

  it('rejects missing must_have array', () => {
    const bad = { ...FAKE_PROMPT1_JSON, must_have: 'not an array' };
    const result = validatePrompt1Json(JSON.stringify(bad));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/must_have/i);
  });

  it('rejects missing top_reasons', () => {
    const { top_reasons: _tr, ...rest } = FAKE_PROMPT1_JSON;
    const result = validatePrompt1Json(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/top_reasons/i);
  });

  it('rejects missing manual_review_required', () => {
    const { manual_review_required: _mr, ...rest } = FAKE_PROMPT1_JSON;
    const result = validatePrompt1Json(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/manual_review_required/i);
  });

  it('accepts all three valid decision values', () => {
    for (const decision of ['apply', 'maybe', 'skip'] as const) {
      const result = validatePrompt1Json(
        JSON.stringify({ ...FAKE_PROMPT1_JSON, decision }),
      );
      expect(result.success).toBe(true);
    }
  });
});
