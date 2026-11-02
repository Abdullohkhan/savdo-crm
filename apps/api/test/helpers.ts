import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Role } from '@savdo/shared';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import type { AppConfig } from '../src/config.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';
import { TEST_DATABASE_URL } from './env.js';

export const config: AppConfig = {
  databaseUrl: TEST_DATABASE_URL,
  jwtAccessSecret: 'test-secret-test-secret-test-secret',
  accessTokenTtlSec: 900,
  refreshTokenDays: 30,
  port: 0,
  webOrigin: 'http://localhost:5173',
  cookieSecure: false,
};

export interface TestCtx {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestCtx> {
  const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] }).compile();
  const app = mod.createNestApplication();
  setupApp(app, config);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "RefreshToken", "User", "Organization" RESTART IDENTITY CASCADE',
  );
}

export const PASSWORD = 'secret123';

export async function seedOrg(prisma: PrismaService, name: string) {
  return prisma.organization.create({ data: { name } });
}

export async function seedUser(
  prisma: PrismaService,
  organizationId: string,
  phone: string,
  role: Role,
  opts: { isActive?: boolean; name?: string } = {},
) {
  return prisma.user.create({
    data: {
      organizationId,
      phone,
      role,
      name: opts.name ?? role,
      isActive: opts.isActive ?? true,
      passwordHash: await argon2.hash(PASSWORD),
    },
  });
}

/** Login qilib access token va refresh cookie qaytaradi */
export async function login(app: INestApplication, phone: string, password = PASSWORD) {
  const res = await request(app.getHttpServer()).post('/auth/login').send({ phone, password });
  return {
    res,
    token: res.body.accessToken as string,
    cookie: refreshCookie(res),
  };
}

export function refreshCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const c = raw?.find((v) => v.startsWith('rt='));
  return c ? c.split(';')[0]! : '';
}
