import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Convention: controller tests use TestingModule with mocked providers.
// Replace real dependencies with jest.fn() stubs via useValue.
// This pattern works identically for PrismaService, AiProvider, etc.

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;

  beforeEach(async () => {
    const mockAppService: jest.Mocked<AppService> = {
      getAppVersion: jest.fn().mockReturnValue({
        name: 'jobflow-cv-pipeline',
        version: '0.1.0',
      }),
    } as jest.Mocked<AppService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockAppService }],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
  });

  describe('health', () => {
    it('returns { status: "ok" }', () => {
      expect(controller.health()).toEqual({ status: 'ok' });
    });
  });

  describe('version', () => {
    it('delegates to AppService', () => {
      const result = controller.version();
      expect(appService.getAppVersion).toHaveBeenCalled();
      expect(result.name).toBe('jobflow-cv-pipeline');
    });
  });
});
