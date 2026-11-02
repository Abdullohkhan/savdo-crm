import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './env.js';

export default function setup(): void {
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
