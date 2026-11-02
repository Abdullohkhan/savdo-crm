try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {
  // CI: muhit o'zgaruvchilari tashqaridan
}

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/savdo_test';
