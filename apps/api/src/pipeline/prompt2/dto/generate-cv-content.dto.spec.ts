import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  GenerateCvContentDto,
  REGENERATION_NOTES_MAX_LENGTH,
} from './generate-cv-content.dto';

describe('GenerateCvContentDto', () => {
  it('rejects notes over max length', async () => {
    const dto = plainToInstance(GenerateCvContentDto, {
      notes: 'a'.repeat(REGENERATION_NOTES_MAX_LENGTH + 1),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'notes')).toBeDefined();
  });

  it('accepts notes at max length', async () => {
    const dto = plainToInstance(GenerateCvContentDto, {
      notes: 'a'.repeat(REGENERATION_NOTES_MAX_LENGTH),
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts missing notes', async () => {
    const dto = plainToInstance(GenerateCvContentDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });
});
