import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  login,
  refreshCookie,
  resetDb,
  seedOrg,
  seedUser,
  type TestCtx,
} from './helpers.js';

describe('auth', () => {
  let ctx: TestCtx;
  const phone = '+998900000001';

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    const org = await seedOrg(ctx.prisma, 'A');
    await seedUser(ctx.prisma, org.id, phone, 'OWNER');
    await seedUser(ctx.prisma, org.id, '+998900000009', 'SOTUVCHI', { isActive: false });
  });

  it("to'g'ri parol bilan kiradi, refresh cookie httpOnly", async () => {
    const { res, token } = await login(ctx.app, phone);
    expect(res.status).toBe(200);
    expect(token).toBeTruthy();
    expect(res.body.user.phone).toBe(phone);
    expect(res.body.user.passwordHash).toBeUndefined();
    const raw = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(raw).toMatch(/rt=.+HttpOnly/i);

    const me = await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('OWNER');
  });

  it("noto'g'ri parol — 401", async () => {
    const { res } = await login(ctx.app, phone, 'wrong-pass');
    expect(res.status).toBe(401);
  });

  it('faolsiz foydalanuvchi kira olmaydi', async () => {
    const { res } = await login(ctx.app, '+998900000009');
    expect(res.status).toBe(401);
  });

  it('tokensiz /auth/me — 401', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('refresh rotation: eski token qayta ishlamaydi', async () => {
    const { cookie: first } = await login(ctx.app, phone);
    const r1 = await request(ctx.app.getHttpServer()).post('/auth/refresh').set('Cookie', first);
    expect(r1.status).toBe(200);
    const second = refreshCookie(r1);
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    const reuse = await request(ctx.app.getHttpServer()).post('/auth/refresh').set('Cookie', first);
    expect(reuse.status).toBe(401);

    // Qayta ishlatish aniqlangani uchun yangi token ham bekor qilinadi
    const after = await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', second);
    expect(after.status).toBe(401);
  });

  it('logout refresh tokenni bekor qiladi', async () => {
    const { cookie } = await login(ctx.app, phone);
    const out = await request(ctx.app.getHttpServer()).post('/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    const r = await request(ctx.app.getHttpServer()).post('/auth/refresh').set('Cookie', cookie);
    expect(r.status).toBe(401);
  });
});
