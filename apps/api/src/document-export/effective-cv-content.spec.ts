import { Logger } from '@nestjs/common';
import * as path from 'path';
import { FAKE_PROMPT2_JSON } from '../ai/providers/fake.provider';
import { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';
import { CANDIDATE_PROFILE_CONFIG } from './candidate-profile.config';
import {
  ArtifactTextReader,
  CV_CONTENT_JSON_FILE,
  EffectiveCvContentError,
  PRE_PDF_CHECK_JSON_FILE,
  buildEffectiveCvContent,
} from './effective-cv-content';
import { mapPrompt2OutputToCvContent } from './prompt2-to-cv-content.mapper';

const WORKSPACE = path.resolve('/storage/2026_01_01_Sample_Backend');

function makeDraft(): TargetedCvContentOutput {
  const draft = JSON.parse(
    JSON.stringify(FAKE_PROMPT2_JSON),
  ) as TargetedCvContentOutput;
  draft.cv_content.certifications = [
    { title: 'Hidden Course', include: false },
    { title: 'Sample Skill Badge', include: true },
  ];
  return draft;
}

function makePrePdfCheck(corrections: unknown[]): string {
  return JSON.stringify({
    schema_version: '1.0',
    workspace_id: 'ws-test-1',
    readiness: 'ready_with_minor_edits',
    corrections,
    quality_score: 80,
    export_blocked: false,
    overall_notes: 'Minor edits.',
  });
}

function enoent(): NodeJS.ErrnoException {
  const error = new Error('ENOENT') as NodeJS.ErrnoException;
  error.code = 'ENOENT';
  return error;
}

function makeReader(files: Record<string, string>): ArtifactTextReader & {
  readFile: jest.Mock;
} {
  return {
    readFile: jest.fn(async (absolutePath: string) => {
      const name = path.relative(WORKSPACE, absolutePath);
      if (!(name in files)) throw enoent();
      return files[name];
    }),
  };
}

describe('buildEffectiveCvContent', () => {
  it('returns the mapped Prompt 2 content when no pre-PDF check exists', async () => {
    const draft = makeDraft();
    const reader = makeReader({
      [CV_CONTENT_JSON_FILE]: JSON.stringify(draft),
    });

    const effective = await buildEffectiveCvContent(reader, WORKSPACE);

    expect(effective.draft).toEqual(draft);
    expect(effective.content).toEqual(
      mapPrompt2OutputToCvContent(draft, CANDIDATE_PROFILE_CONFIG),
    );
    expect(reader.readFile).toHaveBeenCalledWith(
      path.join(WORKSPACE, PRE_PDF_CHECK_JSON_FILE),
    );
  });

  it('applies Prompt 3 corrections to the mapped Prompt 2 content', async () => {
    const draft = makeDraft();
    const reader = makeReader({
      [CV_CONTENT_JSON_FILE]: JSON.stringify(draft),
      [PRE_PDF_CHECK_JSON_FILE]: makePrePdfCheck([
        {
          field_path: 'summary[0]',
          original_text: draft.cv_content.summary[0],
          suggested_text: 'Corrected summary sentence.',
          severity: 'warning',
          reason: 'Tighter wording.',
        },
        {
          field_path: 'experience[0].bullets[1].text',
          original_text: draft.cv_content.experience[0].bullets[1].text,
          suggested_text: 'Corrected experience bullet.',
          severity: 'critical',
          reason: 'Overclaiming risk.',
        },
        {
          field_path: 'certifications[1]',
          original_text: 'Sample Skill Badge',
          suggested_text: 'Renamed Skill Badge',
          severity: 'suggestion',
          reason: 'Exact title.',
        },
      ]),
    });

    const effective = await buildEffectiveCvContent(reader, WORKSPACE);
    const mapped = mapPrompt2OutputToCvContent(draft, CANDIDATE_PROFILE_CONFIG);

    expect(effective.content.summary).toEqual([
      'Corrected summary sentence.',
      mapped.summary[1],
    ]);
    expect(effective.content.experience[0].bullets[1].text).toBe(
      'Corrected experience bullet.',
    );
    expect(effective.content.experience[0].bullets[0].text).toBe(
      mapped.experience[0].bullets[0].text,
    );
    expect(effective.content.certifications).toEqual([
      { name: 'Renamed Skill Badge', priority: 'medium', source_index: 1 },
    ]);
    expect(effective.content.candidate).toEqual(
      CANDIDATE_PROFILE_CONFIG.candidate,
    );
    // The stored draft itself is left untouched.
    expect(effective.draft.cv_content.summary[0]).toBe(
      draft.cv_content.summary[0],
    );
  });

  it('keeps the field a mismatching pre-PDF check correction points at', async () => {
    const draft = makeDraft();
    draft.cv_content.experience[0].tech_stack = ['Tool A', 'Tool B', 'Tool C'];
    const matchingBullet = draft.cv_content.experience[0].bullets[0].text;
    const reader = makeReader({
      [CV_CONTENT_JSON_FILE]: JSON.stringify(draft),
      [PRE_PDF_CHECK_JSON_FILE]: makePrePdfCheck([
        {
          // The model's index points at Tool B, while its original_text names Tool C.
          field_path: 'experience[0].tech_stack[1]',
          original_text: 'Tool C',
          suggested_text: 'Tool C (qualified)',
          severity: 'warning',
          reason: 'Qualify the tool.',
        },
        {
          field_path: 'experience[0].bullets[0].text',
          original_text: matchingBullet,
          suggested_text: 'Corrected first bullet.',
          severity: 'warning',
          reason: 'Tighter wording.',
        },
      ]),
    });

    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const effective = await buildEffectiveCvContent(reader, WORKSPACE);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain(
      '"experience[0].tech_stack[1]"',
    );
    warnSpy.mockRestore();
    expect(effective.content.experience[0].tech_stack).toEqual([
      'Tool A',
      'Tool B',
      'Tool C',
    ]);
    expect(effective.content.experience[0].bullets[0].text).toBe(
      'Corrected first bullet.',
    );
  });

  it('rejects an invalid Prompt 2 draft', async () => {
    const reader = makeReader({ [CV_CONTENT_JSON_FILE]: '{"step": 1}' });

    const promise = buildEffectiveCvContent(reader, WORKSPACE);

    await expect(promise).rejects.toBeInstanceOf(EffectiveCvContentError);
    await expect(promise).rejects.toThrow(`Invalid ${CV_CONTENT_JSON_FILE}`);
  });

  it('rejects a missing Prompt 2 draft', async () => {
    const promise = buildEffectiveCvContent(makeReader({}), WORKSPACE);

    await expect(promise).rejects.toBeInstanceOf(EffectiveCvContentError);
    await expect(promise).rejects.toThrow('the CV draft file does not exist');
  });

  it('rejects an invalid pre-PDF check', async () => {
    const reader = makeReader({
      [CV_CONTENT_JSON_FILE]: JSON.stringify(makeDraft()),
      [PRE_PDF_CHECK_JSON_FILE]: 'not json',
    });

    const promise = buildEffectiveCvContent(reader, WORKSPACE);

    await expect(promise).rejects.toBeInstanceOf(EffectiveCvContentError);
    await expect(promise).rejects.toThrow(`Invalid ${PRE_PDF_CHECK_JSON_FILE}`);
  });

  it('propagates a read failure other than a missing file', async () => {
    const denied = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    const reader: ArtifactTextReader = {
      readFile: jest.fn(async (absolutePath: string) => {
        if (absolutePath.endsWith(CV_CONTENT_JSON_FILE)) {
          return JSON.stringify(makeDraft());
        }
        throw denied;
      }),
    };

    await expect(buildEffectiveCvContent(reader, WORKSPACE)).rejects.toBe(
      denied,
    );
  });
});
