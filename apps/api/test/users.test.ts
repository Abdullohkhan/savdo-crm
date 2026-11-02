import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, login, resetDb, seedOrg, seedUser, type TestCtx } from './helpers.js';

describe('users va organization', () => {
  let ctx: TestCtx;
  let ownerA: string;
  let sellerA: string;
  let ownerB: string;
  let userBId: string;

  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    const a = await seedOrg(ctx.prisma, 'A');
    const b = await seedOrg(ctx.prisma, 'B');
    await seedUser(ctx.prisma, a.id, '+998900000001', 'OWNER');
    await seedUser(ctx.prisma, a.id, '+998900000002', 'SOTUVCHI');
    await seedUser(ctx.prisma, b.id, '+998900000003', 'OWNER');
    userBId = (await seedUser(ctx.prisma, b.id, '+998900000004', 'OMBORCHI')).id;
    ownerA = (await login(ctx.app, '+998900000001')).token;
    sellerA = (await login(ctx.app, '+998900000002')).token;
    ownerB = (await login(ctx.app, '+998900000003')).token;
  });

  const newUser = { name: 'Ali', phone: '+998901112233', password: 'parol123', role: 'OMBORCHI' };

  it('OWNER xodim yaratadi', async () => {
    const r = await http().post('/users').set('Authorization', `Bearer ${ownerA}`).send(newUser);
    expect(r.status).toBe(201);
    expect(r.body.role).toBe('OMBORCHI');
    expect(r.body.passwordHash).toBeUndefined();
  });

  it('SOTUVCHI xodim yarata olmaydi', async () => {
    const r = await http().post('/users').set('Authorization', `Bearer ${sellerA}`).send(newUser);
    expect(r.status).toBe(403);
    const l = await http().get('/users').set('Authorization', `Bearer ${sellerA}`);
    expect(l.status).toBe(403);
  });

  it("A korxona B korxona xodimlarini ko'rmaydi", async () => {
    const l = await http().get('/users').set('Authorization', `Bearer ${ownerA}`);
    expect(l.status).toBe(200);
    expect(l.body).toHaveLength(2);
    expect(l.body.map((u: { phone: string }) => u.phone)).not.toContain('+998900000004');

    const one = await http().get(`/users/${userBId}`).set('Authorization', `Bearer ${ownerA}`);
    expect(one.status).toBe(404);
    const patch = await http()
      .patch(`/users/${userBId}`)
      .set('Authorization', `Bearer ${ownerA}`)
      .send({ isActive: false });
    expect(patch.status).toBe(404);

    const lb = await http().get('/users').set('Authorization', `Bearer ${ownerB}`);
    expect(lb.body).toHaveLength(2);
  });

  it("faolsizlantirilgan xodim kira olmaydi; o'chirish endpointi yo'q", async () => {
    const c = await http().post('/users').set('Authorization', `Bearer ${ownerA}`).send(newUser);
    const p = await http()
      .patch(`/users/${c.body.id}`)
      .set('Authorization', `Bearer ${ownerA}`)
      .send({ isActive: false });
    expect(p.status).toBe(200);
    expect((await login(ctx.app, newUser.phone, newUser.password)).res.status).toBe(401);
    const d = await http().delete(`/users/${c.body.id}`).set('Authorization', `Bearer ${ownerA}`);
    expect(d.status).toBe(404);
  });

  it('bir korxonada telefon takrorlanmaydi', async () => {
    const r = await http()
      .post('/users')
      .set('Authorization', `Bearer ${ownerA}`)
      .send({ ...newUser, phone: '+998900000002' });
    expect(r.status).toBe(409);
  });

  it("PATCH /users/me — til va parol o'zgaradi", async () => {
    const r = await http()
      .patch('/users/me')
      .set('Authorization', `Bearer ${sellerA}`)
      .send({ locale: 'ru' });
    expect(r.status).toBe(200);
    expect(r.body.locale).toBe('ru');

    const bad = await http()
      .patch('/users/me')
      .set('Authorization', `Bearer ${sellerA}`)
      .send({ currentPassword: 'xato', newPassword: 'yangi123' });
    expect(bad.status).toBe(400);

    const ok = await http()
      .patch('/users/me')
      .set('Authorization', `Bearer ${sellerA}`)
      .send({ currentPassword: 'secret123', newPassword: 'yangi123' });
    expect(ok.status).toBe(200);
    expect((await login(ctx.app, '+998900000002', 'yangi123')).res.status).toBe(200);
  });

  it('organization: hamma o`qiydi, faqat OWNER o`zgartiradi', async () => {
    const g = await http().get('/organization').set('Authorization', `Bearer ${sellerA}`);
    expect(g.status).toBe(200);
    expect(g.body.markupPercent).toBe(10);
    expect(g.body.advancePercent).toBe(30);

    const s = await http()
      .patch('/organization')
      .set('Authorization', `Bearer ${sellerA}`)
      .send({ markupPercent: 15 });
    expect(s.status).toBe(403);

    const o = await http()
      .patch('/organization')
      .set('Authorization', `Bearer ${ownerA}`)
      .send({ markupPercent: 15, advancePercent: 0 });
    expect(o.status).toBe(200);
    expect(o.body.markupPercent).toBe(15);

    const invalid = await http()
      .patch('/organization')
      .set('Authorization', `Bearer ${ownerA}`)
      .send({ advancePercent: 12.5 });
    expect(invalid.status).toBe(400);

    const gb = await http().get('/organization').set('Authorization', `Bearer ${ownerB}`);
    expect(gb.body.markupPercent).toBe(10);
  });
});
