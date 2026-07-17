// Global Jest setup — runs after the test framework is installed.
// Add global mocks, environment config, or test utilities here.
//
// Testing conventions:
//   - Unit test files: src/**/<name>.spec.ts (next to the file under test)
//   - E2E test files:  test/**/<name>.e2e-spec.ts
//   - Pure services: instantiate directly with `new Service(dep1, dep2)`
//   - NestJS controllers/modules: use Test.createTestingModule()
//   - Mock dependencies with: { provide: Token, useValue: { method: jest.fn() } }
//   - Never use real AI providers (OpenAI/Anthropic) in unit tests
//   - Never use real filesystem paths — use os.tmpdir() or jest temp dirs
//   - Never reset the database in unit tests — mock PrismaService instead
