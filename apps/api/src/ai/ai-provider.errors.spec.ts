import { AiProviderResponseError } from './ai-provider.errors';

describe('AiProviderResponseError', () => {
  it('is an Error carrying its name, message and the original cause', () => {
    const cause = new SyntaxError('Unexpected token');

    const error = new AiProviderResponseError('bad answer', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AiProviderResponseError');
    expect(error.message).toBe('bad answer');
    expect(error.cause).toBe(cause);
  });
});
