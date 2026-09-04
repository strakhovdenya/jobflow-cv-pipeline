import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppendManualNoteDto } from './append-manual-note.dto';

function buildValid(
  overrides: Partial<AppendManualNoteDto> = {},
): AppendManualNoteDto {
  return plainToInstance(AppendManualNoteDto, {
    note: 'No commercial AWS experience, remove that.',
    ...overrides,
  });
}

describe('AppendManualNoteDto', () => {
  it('passes with a valid note', async () => {
    const errors = await validate(buildValid());
    expect(errors).toHaveLength(0);
  });

  it('fails when note is missing', async () => {
    const dto = plainToInstance(AppendManualNoteDto, {});
    const errors = await validate(dto);
    const field = errors.find((e) => e.property === 'note');
    expect(field).toBeDefined();
  });

  it('fails when note is an empty string', async () => {
    const errors = await validate(buildValid({ note: '' }));
    const field = errors.find((e) => e.property === 'note');
    expect(field).toBeDefined();
  });

  it('fails when note is whitespace only', async () => {
    const errors = await validate(buildValid({ note: '   ' }));
    const field = errors.find((e) => e.property === 'note');
    expect(field).toBeDefined();
  });
});
