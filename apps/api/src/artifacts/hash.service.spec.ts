import { HashService } from './hash.service';

describe('HashService', () => {
  let service: HashService;

  beforeEach(() => {
    service = new HashService();
  });

  describe('hashText', () => {
    it('returns a 64-character hex string', () => {
      const hash = service.hashText('hello');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns the same hash for the same content', () => {
      const text = 'We are hiring!\nLine 2\nSpecial: ü, é, Ω';
      expect(service.hashText(text)).toBe(service.hashText(text));
    });

    it('returns different hashes for different content', () => {
      expect(service.hashText('content A')).not.toBe(
        service.hashText('content B'),
      );
    });

    it('handles Cyrillic UTF-8 text', () => {
      const hash1 = service.hashText('Вакансия: Разработчик');
      const hash2 = service.hashText('Вакансия: Разработчик');
      const hash3 = service.hashText('Вакансия: Другой текст');
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it('treats whitespace differences as different content', () => {
      expect(service.hashText('hello world')).not.toBe(
        service.hashText('hello  world'),
      );
    });
  });
});
