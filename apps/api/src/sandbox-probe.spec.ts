import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const COMMAND_TIMEOUT_MS = 30000;
const TEST_TIMEOUT_MS = 40000;
const REMOTE_URL = 'https://github.com/strakhovdenya/jobflow-cv-pipeline.git';
const CREDENTIAL_QUERY = 'protocol=https\nhost=github.com\n\n';

const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

const runGit = (args: string[], input?: string) =>
  spawnSync('git', args, {
    env: gitEnv,
    encoding: 'utf8',
    timeout: COMMAND_TIMEOUT_MS,
    input,
  });

describe('sandbox probe', () => {
  it('has no gh hosts config in home', () => {
    const hostsConfig = path.join(os.homedir(), '.config', 'gh', 'hosts.yml');

    expect(fs.existsSync(hostsConfig)).toBe(false);
  });

  it(
    'git is available',
    () => {
      const result = runGit(['--version']);

      expect(result.status).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'no credential helper is configured',
    () => {
      const result = runGit(['config', '--get-all', 'credential.helper']);
      const helpers = String(result.stdout ?? '').replace(/\s/g, '');

      expect(helpers === '').toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'git credential fill returns no password',
    () => {
      const result = runGit(['credential', 'fill'], CREDENTIAL_QUERY);
      const output = String(result.stdout ?? '');

      expect(output.includes('password=')).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'git push over https fails',
    () => {
      const result = runGit([
        'push',
        '--dry-run',
        REMOTE_URL,
        'HEAD:refs/heads/sandbox-probe',
      ]);

      expect(result.status !== 0).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );
});
