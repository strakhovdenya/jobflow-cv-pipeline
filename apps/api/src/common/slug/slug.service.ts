import { Injectable } from '@nestjs/common';

@Injectable()
export class SlugService {
  normalizeCompanySlug(name: string): string {
    return name
      .trim()
      .replace(/[^A-Za-z\p{Script=Cyrillic}0-9_]/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  normalizeRoleSlug(title: string): string {
    return title
      .trim()
      .replace(/[^A-Za-z\p{Script=Cyrillic}_]/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
