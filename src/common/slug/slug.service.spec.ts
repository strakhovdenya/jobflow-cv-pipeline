import { SlugService } from './slug.service';

describe('SlugService', () => {
  let service: SlugService;

  beforeEach(() => {
    service = new SlugService();
  });

  describe('normalizeCompanySlug', () => {
    it('preserves numbers in company names', () => {
      expect(service.normalizeCompanySlug('Action1')).toBe('Action1');
    });

    it('CHECK24 with space', () => {
      expect(service.normalizeCompanySlug('CHECK24 Vergleichsportal')).toBe(
        'CHECK24_Vergleichsportal',
      );
    });

    it('comma and spaces converted to single underscore', () => {
      expect(
        service.normalizeCompanySlug('Omega CRM, A Merkle Company'),
      ).toBe('Omega_CRM_A_Merkle_Company');
    });

    it('Ukrainian Cyrillic with hyphen and spaces', () => {
      expect(service.normalizeCompanySlug('IT-компанія ДП ІНФОТЕХ')).toBe(
        'IT_компанія_ДП_ІНФОТЕХ',
      );
    });

    it('preserves original case', () => {
      expect(service.normalizeCompanySlug('MyCompany')).toBe('MyCompany');
    });

    it('collapses repeated separators', () => {
      expect(service.normalizeCompanySlug('A  --  B')).toBe('A_B');
    });

    it('trims leading and trailing whitespace', () => {
      expect(service.normalizeCompanySlug('  Acme Corp  ')).toBe('Acme_Corp');
    });

    it('empty string returns empty string', () => {
      expect(service.normalizeCompanySlug('')).toBe('');
    });

    it('does not mutate original value', () => {
      const original = 'Action1 Corp';
      service.normalizeCompanySlug(original);
      expect(original).toBe('Action1 Corp');
    });
  });

  describe('normalizeRoleSlug', () => {
    it('dots become underscores, numbers removed', () => {
      expect(
        service.normalizeRoleSlug(
          'Backend Developer Node.js JavaScript TypeScript',
        ),
      ).toBe('Backend_Developer_Node_js_JavaScript_TypeScript');
    });

    it('hyphen and slash become underscores', () => {
      expect(
        service.normalizeRoleSlug(
          'Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS',
        ),
      ).toBe(
        'Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS',
      );
    });

    it('parentheses and commas become underscores', () => {
      expect(
        service.normalizeRoleSlug(
          'Senior Backend Engineer (Node.js, AWS, DynamoDB)',
        ),
      ).toBe('Senior_Backend_Engineer_Node_js_AWS_DynamoDB');
    });

    it('em dash becomes underscore', () => {
      expect(
        service.normalizeRoleSlug(
          'Middle/Senior Full Stack Developer — Logistics Domain',
        ),
      ).toBe('Middle_Senior_Full_Stack_Developer_Logistics_Domain');
    });

    it('Cyrillic mixed with Latin', () => {
      expect(
        service.normalizeRoleSlug('Разработчик Node.js / Backend Developer'),
      ).toBe('Разработчик_Node_js_Backend_Developer');
    });

    it('C#/.NET — special chars and dot become underscores', () => {
      expect(service.normalizeRoleSlug('C#/.NET Backend Engineer')).toBe(
        'C_NET_Backend_Engineer',
      );
    });

    it('removes numbers from role slugs', () => {
      expect(service.normalizeRoleSlug('Action1')).toBe('Action');
    });

    it('repeated spaces collapsed', () => {
      expect(service.normalizeRoleSlug('hello   world')).toBe('hello_world');
    });

    it('trims leading and trailing whitespace', () => {
      expect(service.normalizeRoleSlug('  Backend Developer  ')).toBe(
        'Backend_Developer',
      );
    });

    it('empty string returns empty string', () => {
      expect(service.normalizeRoleSlug('')).toBe('');
    });

    it('only numbers returns empty string', () => {
      expect(service.normalizeRoleSlug('12345')).toBe('');
    });

    it('mixed separators collapsed to single underscore', () => {
      expect(service.normalizeRoleSlug('A / - B')).toBe('A_B');
    });

    it('does not mutate original value', () => {
      const original = 'Backend Developer Node.js';
      service.normalizeRoleSlug(original);
      expect(original).toBe('Backend Developer Node.js');
    });
  });
});
