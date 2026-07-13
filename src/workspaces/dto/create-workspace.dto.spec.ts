import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWorkspaceDto } from './create-workspace.dto';

function buildValid(
  overrides: Partial<CreateWorkspaceDto> = {},
): CreateWorkspaceDto {
  return plainToInstance(CreateWorkspaceDto, {
    companyNameOriginal: 'Action1',
    roleTitleOriginal: 'Backend Developer Node.js',
    vacancyText: 'We are looking for a backend developer...',
    ...overrides,
  });
}

describe('CreateWorkspaceDto', () => {
  it('passes with all required fields', async () => {
    const errors = await validate(buildValid());
    expect(errors).toHaveLength(0);
  });

  it('passes without optional sourceUrl', async () => {
    const errors = await validate(buildValid({ sourceUrl: undefined }));
    expect(errors).toHaveLength(0);
  });

  it('passes with a valid sourceUrl', async () => {
    const errors = await validate(
      buildValid({ sourceUrl: 'https://example.com/job' }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails when companyNameOriginal is missing', async () => {
    const dto = plainToInstance(CreateWorkspaceDto, {
      roleTitleOriginal: 'Backend Developer',
      vacancyText: 'Some text',
    });
    const errors = await validate(dto);
    const field = errors.find((e) => e.property === 'companyNameOriginal');
    expect(field).toBeDefined();
  });

  it('fails when companyNameOriginal is empty string', async () => {
    const errors = await validate(buildValid({ companyNameOriginal: '' }));
    const field = errors.find((e) => e.property === 'companyNameOriginal');
    expect(field).toBeDefined();
  });

  it('fails when roleTitleOriginal is missing', async () => {
    const dto = plainToInstance(CreateWorkspaceDto, {
      companyNameOriginal: 'Action1',
      vacancyText: 'Some text',
    });
    const errors = await validate(dto);
    const field = errors.find((e) => e.property === 'roleTitleOriginal');
    expect(field).toBeDefined();
  });

  it('fails when roleTitleOriginal is empty string', async () => {
    const errors = await validate(buildValid({ roleTitleOriginal: '' }));
    const field = errors.find((e) => e.property === 'roleTitleOriginal');
    expect(field).toBeDefined();
  });

  it('fails when vacancyText is missing', async () => {
    const dto = plainToInstance(CreateWorkspaceDto, {
      companyNameOriginal: 'Action1',
      roleTitleOriginal: 'Backend Developer',
    });
    const errors = await validate(dto);
    const field = errors.find((e) => e.property === 'vacancyText');
    expect(field).toBeDefined();
  });

  it('fails when vacancyText is empty string', async () => {
    const errors = await validate(buildValid({ vacancyText: '' }));
    const field = errors.find((e) => e.property === 'vacancyText');
    expect(field).toBeDefined();
  });

  it('fails when sourceUrl is not a valid URL', async () => {
    const errors = await validate(buildValid({ sourceUrl: 'not-a-url' }));
    const field = errors.find((e) => e.property === 'sourceUrl');
    expect(field).toBeDefined();
  });

  it('passes when companyNameOriginal is exactly 200 characters', async () => {
    const errors = await validate(
      buildValid({ companyNameOriginal: 'A'.repeat(200) }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails when companyNameOriginal exceeds 200 characters', async () => {
    const errors = await validate(
      buildValid({ companyNameOriginal: 'A'.repeat(201) }),
    );
    const field = errors.find((e) => e.property === 'companyNameOriginal');
    expect(field).toBeDefined();
  });

  it('fails when roleTitleOriginal exceeds 200 characters', async () => {
    const errors = await validate(
      buildValid({ roleTitleOriginal: 'A'.repeat(201) }),
    );
    const field = errors.find((e) => e.property === 'roleTitleOriginal');
    expect(field).toBeDefined();
  });
});
