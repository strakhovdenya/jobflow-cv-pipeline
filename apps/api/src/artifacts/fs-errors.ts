export const isEnoentError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as NodeJS.ErrnoException).code === 'ENOENT';
