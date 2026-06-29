import { AppService } from './app.service';

// Convention: unit tests live next to the file they test as <name>.spec.ts
// No NestJS TestingModule needed for pure services — instantiate directly.
// Use jest.fn() / jest.spyOn() to mock dependencies passed via constructor.

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  describe('getAppVersion', () => {
    it('returns name and version', () => {
      const result = service.getAppVersion();
      expect(result.name).toBe('jobflow-cv-pipeline');
      expect(result.version).toBeDefined();
    });
  });
});
