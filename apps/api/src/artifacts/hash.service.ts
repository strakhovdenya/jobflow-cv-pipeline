import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';

@Injectable()
export class HashService {
  hashText(text: string): string {
    return createHash('sha256').update(text, 'utf-8').digest('hex');
  }

  async hashFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.hashText(content);
  }
}
