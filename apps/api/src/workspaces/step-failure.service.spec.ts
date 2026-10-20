import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import {
  MAX_STEP_ERROR_LENGTH,
  StepFailureService,
} from './step-failure.service';

describe('StepFailureService', () => {
  let service: StepFailureService;
  let update: jest.Mock;
  let updateMany: jest.Mock;

  const recordedData = () =>
    (update.mock.calls[0][0] as { data: Record<string, unknown> }).data;

  beforeEach(async () => {
    update = jest.fn().mockResolvedValue({});
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        StepFailureService,
        {
          provide: PrismaService,
          useValue: { applicationWorkspace: { update, updateMany } },
        },
      ],
    }).compile();
    service = moduleRef.get(StepFailureService);
  });

  it('maps provider connection error to readable message', async () => {
    await service.record('ws-1', 'prompt_2', new Error('Connection error.'));

    expect(update).toHaveBeenCalledWith({
      where: { id: 'ws-1' },
      data: expect.objectContaining({
        lastStepErrorStep: 'prompt_2',
        lastStepErrorMessage:
          'CV generation failed: the AI provider could not be reached (network error). Retry the step.',
        lastStepErrorAt: expect.any(Date),
      }),
    });
  });

  it('falls back to generic message for unknown error', async () => {
    await service.record('ws-1', 'export', new Error('disk quota exceeded'));

    expect(recordedData().lastStepErrorMessage).toBe(
      'PDF export failed: disk quota exceeded',
    );
  });

  it('accepts a plain string reason', async () => {
    await service.record(
      'ws-1',
      'prompt_1',
      'JSON validation failed: no score',
    );

    expect(recordedData().lastStepErrorMessage).toBe(
      'Vacancy analysis failed: JSON validation failed: no score',
    );
  });

  it('truncates and sanitizes stored message', async () => {
    const secret = 'sk-abcdefghijklmnop1234';
    const longTail = 'x'.repeat(2000);
    const error = new Error(
      `boom ${secret} api_key=hunter2 ${longTail}\n    at Object.<anonymous> (file.ts:1:1)`,
    );

    await service.record('ws-1', 'prompt_3', error);

    const message = recordedData().lastStepErrorMessage as string;
    expect(message.length).toBeLessThanOrEqual(MAX_STEP_ERROR_LENGTH);
    expect(message).not.toContain(secret);
    expect(message).not.toContain('hunter2');
    expect(message).not.toContain('at Object');
    expect(message).toContain('[redacted]');
  });

  it('records failure for steps that keep status', async () => {
    for (const step of ['prompt_3', 'prompt_5', 'cover_letter'] as const) {
      update.mockClear();
      await service.record('ws-1', step, new Error('Request timed out.'));

      expect(recordedData().lastStepErrorStep).toBe(step);
      expect(recordedData()).not.toHaveProperty('status');
    }
  });

  it('clears recorded error on next run', async () => {
    await service.clear('ws-1', 'prompt_2');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'ws-1', lastStepErrorStep: 'prompt_2' },
      data: {
        lastStepErrorStep: null,
        lastStepErrorMessage: null,
        lastStepErrorAt: null,
      },
    });
  });

  it('does not mask original step error', async () => {
    update.mockRejectedValue(new Error('database is down'));
    updateMany.mockRejectedValue(new Error('database is down'));

    await expect(
      service.record('ws-1', 'prompt_2', new Error('Connection error.')),
    ).resolves.toBeUndefined();
    await expect(service.clear('ws-1', 'prompt_2')).resolves.toBeUndefined();
  });

  it('does not label an export error as an AI provider problem', async () => {
    await service.record(
      'ws-1',
      'export',
      new Error('Navigation timeout of 30000 ms exceeded'),
    );

    expect(recordedData().lastStepErrorMessage).toBe(
      'PDF export failed: Navigation timeout of 30000 ms exceeded',
    );
  });

  it('does not match a composed reason against provider patterns', async () => {
    await service.record(
      'ws-1',
      'prompt_1',
      'JSON validation failed: timeout field missing',
    );

    expect(recordedData().lastStepErrorMessage).toBe(
      'Vacancy analysis failed: JSON validation failed: timeout field missing',
    );
  });

  it('masks header, JWT and URL credentials', async () => {
    await service.record(
      'ws-1',
      'prompt_3',
      new Error(
        'x-api-key: abc123 eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fw https://user:pass@host/x',
      ),
    );

    const message = recordedData().lastStepErrorMessage as string;
    expect(message).not.toContain('abc123');
    expect(message).not.toContain('eyJhbGciOi');
    expect(message).not.toContain('user:pass');
  });

  it('clears only the error of the step that starts', async () => {
    await service.clear('ws-1', 'prompt_3');

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ws-1', lastStepErrorStep: 'prompt_3' },
      }),
    );
  });

  it('does not label a database timeout as an AI provider problem', async () => {
    await service.record(
      'ws-1',
      'prompt_2',
      new Error('Transaction timed out after 5000 ms'),
    );

    expect(recordedData().lastStepErrorMessage).toBe(
      'CV generation failed: Transaction timed out after 5000 ms',
    );
  });

  it('keeps every line of a composed multi-line reason', async () => {
    await service.record(
      'ws-1',
      'prompt_1',
      'JSON validation failed: Invalid JSON:\n  score: required\n  decision: required',
    );

    expect(recordedData().lastStepErrorMessage).toBe(
      'Vacancy analysis failed: JSON validation failed: Invalid JSON: score: required decision: required',
    );
  });

  it('masks Basic auth, Google keys and quoted values with spaces', async () => {
    await service.record(
      'ws-1',
      'prompt_5',
      new Error(
        'Authorization: Basic dXNlcjpwYXNzd29yZA== AIzaSyA1234567890abcdefghijk "api_key": "a b c"',
      ),
    );

    const message = recordedData().lastStepErrorMessage as string;
    expect(message).not.toContain('dXNlcjpwYXNzd29yZA');
    expect(message).not.toContain('AIzaSyA1234567890');
    expect(message).not.toContain('a b c');
  });

  it('masks environment variable style names', async () => {
    await service.record(
      'ws-1',
      'prompt_2',
      new Error('OPENAI_API_KEY=abcdef123456 failed'),
    );

    expect(recordedData().lastStepErrorMessage).not.toContain('abcdef123456');
  });

  it('drops stack frames from a composed multi-line reason', async () => {
    await service.record(
      'ws-1',
      'prompt_1',
      'JSON validation failed: bad\n    at Object.parse (file.ts:1:1)\n    at run (other.ts:2:2)',
    );

    const message = recordedData().lastStepErrorMessage as string;
    expect(message).toBe(
      'Vacancy analysis failed: JSON validation failed: bad',
    );
  });

  it('masks the value of a sensitive environment variable', async () => {
    process.env.TEST_STEP_FAILURE_DATABASE_URL =
      'postgresql://db-host:5432/app';
    try {
      await service.record(
        'ws-1',
        'prompt_2',
        new Error('cannot reach postgresql://db-host:5432/app now'),
      );

      expect(recordedData().lastStepErrorMessage).toBe(
        'CV generation failed: cannot reach [redacted] now',
      );
    } finally {
      delete process.env.TEST_STEP_FAILURE_DATABASE_URL;
    }
  });
});
