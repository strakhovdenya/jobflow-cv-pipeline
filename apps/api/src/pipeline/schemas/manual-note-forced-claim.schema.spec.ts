import { validateManualNoteForcedClaims } from './manual-note-forced-claim.schema';

describe('validateManualNoteForcedClaims', () => {
  it('normalizes an absent field to [] and succeeds', () => {
    const p: Record<string, unknown> = {};
    const result = validateManualNoteForcedClaims(p);

    expect(result).toEqual({ success: true });
    expect(p['manual_note_forced_claims']).toEqual([]);
  });

  it('succeeds on an explicit empty array', () => {
    const p: Record<string, unknown> = { manual_note_forced_claims: [] };
    const result = validateManualNoteForcedClaims(p);

    expect(result).toEqual({ success: true });
  });

  it('succeeds on a well-formed array of claims', () => {
    const p: Record<string, unknown> = {
      manual_note_forced_claims: [
        { location: 'cv_content.top_skills[3]', text: 'EGZ' },
        { location: 'cv_content.bullets[1]', text: 'worked with EGZ' },
      ],
    };
    const result = validateManualNoteForcedClaims(p);

    expect(result).toEqual({ success: true });
  });

  it('fails when the field is present but not an array', () => {
    const p: Record<string, unknown> = { manual_note_forced_claims: 'nope' };
    const result = validateManualNoteForcedClaims(p);

    expect(result).toEqual({
      success: false,
      error:
        'Missing or invalid field: manual_note_forced_claims (must be array)',
    });
  });

  it('fails when an entry is not an object', () => {
    const p: Record<string, unknown> = {
      manual_note_forced_claims: ['not-an-object'],
    };
    const result = validateManualNoteForcedClaims(p);

    expect(result).toEqual({
      success: false,
      error:
        'Missing or invalid field: manual_note_forced_claims[0] (must be object)',
    });
  });

  it('fails when an entry is an array (rejected by the object check, not treated as an object)', () => {
    const p: Record<string, unknown> = {
      manual_note_forced_claims: [['location', 'text']],
    };
    const result = validateManualNoteForcedClaims(p);

    expect(result).toEqual({
      success: false,
      error:
        'Missing or invalid field: manual_note_forced_claims[0] (must be object)',
    });
  });

  it('fails when an entry is missing location', () => {
    const p: Record<string, unknown> = {
      manual_note_forced_claims: [{ text: 'EGZ' }],
    };
    const result = validateManualNoteForcedClaims(p);

    expect(result).toEqual({
      success: false,
      error: 'Missing or invalid field: manual_note_forced_claims[0].location',
    });
  });

  it('fails when an entry is missing text', () => {
    const p: Record<string, unknown> = {
      manual_note_forced_claims: [{ location: 'cv_content.top_skills[3]' }],
    };
    const result = validateManualNoteForcedClaims(p);

    expect(result).toEqual({
      success: false,
      error: 'Missing or invalid field: manual_note_forced_claims[0].text',
    });
  });

  it('reports the correct index for a failing entry past the first', () => {
    const p: Record<string, unknown> = {
      manual_note_forced_claims: [
        { location: 'ok', text: 'ok' },
        { location: 'cv_content.bullets[1]' },
      ],
    };
    const result = validateManualNoteForcedClaims(p);

    expect(result).toEqual({
      success: false,
      error: 'Missing or invalid field: manual_note_forced_claims[1].text',
    });
  });
});
