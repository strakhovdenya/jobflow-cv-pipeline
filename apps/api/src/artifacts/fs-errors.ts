export const isEnoentError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as NodeJS.ErrnoException).code === 'ENOENT';

export const isEexistError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as NodeJS.ErrnoException).code === 'EEXIST';
