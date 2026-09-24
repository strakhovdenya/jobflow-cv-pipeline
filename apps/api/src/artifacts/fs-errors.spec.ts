import { isEnoentError } from './fs-errors';

describe('isEnoentError', () => {
  it('is true for an error with code ENOENT', () => {
    const error = Object.assign(new Error('missing'), { code: 'ENOENT' });

    expect(isEnoentError(error)).toBe(true);
  });

  it.each(['EACCES', 'EIO', undefined])('is false for code %s', (code) => {
    const error = Object.assign(new Error('boom'), { code });

    expect(isEnoentError(error)).toBe(false);
  });

  it.each([null, undefined, 'ENOENT', 42])(
    'is false for a non-object value %p',
    (value) => {
      expect(isEnoentError(value)).toBe(false);
    },
  );
});
