import * as path from 'path';

export function getStorageRoot(): string {
  return (
    process.env.STORAGE_ROOT ??
    path.join(process.cwd(), 'storage', 'applications')
  );
}
