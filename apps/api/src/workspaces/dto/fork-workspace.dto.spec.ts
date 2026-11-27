import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ForkWorkspaceDto } from './fork-workspace.dto';

const REQUEST_KEY = '3f1c2b4a-8d7e-4f6a-9b0c-1d2e3f4a5b6c';

const errorPropertiesOf = async (body: Record<string, unknown>) =>
  (await validate(plainToInstance(ForkWorkspaceDto, body))).map(
    (error) => error.property,
  );

describe('ForkWorkspaceDto', () => {
  it('accepts a strategy without profile, carry-over or key', async () => {
    for (const analysisStrategy of ['legacy', 'b', 'c']) {
      const dto = plainToInstance(ForkWorkspaceDto, { analysisStrategy });
      expect(await validate(dto)).toEqual([]);
      expect(dto.contextLayout).toBeUndefined();
      expect(dto.contextSourceSet).toBeUndefined();
    }
  });

  it('accepts every documented field', async () => {
    expect(
      await errorPropertiesOf({
        analysisStrategy: 'c',
        contextLayout: 'boundary',
        contextSourceSet: 'assessment',
        carryOverRequirements: true,
        requestKey: REQUEST_KEY,
      }),
    ).toEqual([]);
  });

  it('rejects an unknown or missing strategy', async () => {
    expect(await errorPropertiesOf({ analysisStrategy: 'd' })).toEqual([
      'analysisStrategy',
    ]);
    expect(await errorPropertiesOf({})).toEqual(['analysisStrategy']);
  });

  it('rejects an unknown context profile', async () => {
    expect(
      await errorPropertiesOf({
        analysisStrategy: 'c',
        contextLayout: 'split',
      }),
    ).toEqual(['contextLayout']);
    expect(
      await errorPropertiesOf({
        analysisStrategy: 'c',
        contextSourceSet: 'partial',
      }),
    ).toEqual(['contextSourceSet']);
  });

  it('rejects a request key that is not a UUID', async () => {
    for (const requestKey of ['abc', '', 42, `${REQUEST_KEY}0`]) {
      expect(
        await errorPropertiesOf({ analysisStrategy: 'b', requestKey }),
      ).toEqual(['requestKey']);
    }
  });

  it('rejects a carry-over flag that is not a boolean', async () => {
    expect(
      await errorPropertiesOf({
        analysisStrategy: 'c',
        carryOverRequirements: 'yes',
      }),
    ).toEqual(['carryOverRequirements']);
  });
});
