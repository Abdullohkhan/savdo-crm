import { defineConfig, env } from 'prisma/config';

try {
  process.loadEnvFile('../../.env');
} catch {
  // .env bo'lmasa — muhit o'zgaruvchilari tashqaridan beriladi (CI)
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --import tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
