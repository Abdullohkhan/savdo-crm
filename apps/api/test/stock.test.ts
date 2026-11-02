import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, login, resetDb, seedOrg, seedUser, type TestCtx } from './helpers.js';

describe('tovar, kirim va ombor', () => {
  let ctx: TestCtx;
  const tok: Record<string, string> = {};
  let ownerB = '';

  const http = () => request(ctx.app.getHttpServer());
  const as = (role: string) => ({ Authorization: `Bearer ${tok[role]}` });

  async function product(app: INestApplication, sku: string, extra: object = {}) {
    const r = await request(app.getHttpServer())
      .post('/products')
      .set(as('OWNER'))
      .send({ sku, name: `Tovar ${sku}`, unit: 'dona', ...extra });
    expect(r.status).toBe(201);
    return r.body.id as string;
  }

  async function confirmedPurchase(
    lines: { productId: string; quantity: number; price: number }[],
    expenses: { title: string; amount: number }[] = [],
  ) {
    const c = await http().post('/purchases').set(as('BUXGALTER')).send({ lines, expenses });
    expect(c.status).toBe(201);
    const r = await http().post(`/purchases/${c.body.id}/confirm`).set(as('BUXGALTER'));
    expect(r.status).toBe(201);
    return r.body;
  }

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
    const roles = ['OWNER', 'BUXGALTER', 'SOTUVCHI', 'OMBORCHI'] as const;
    for (const [i, role] of roles.entries()) {
      await seedUser(ctx.prisma, a.id, `+99890000001${i}`, role);
      tok[role] = (await login(ctx.app, `+99890000001${i}`)).token;
    }
    await seedUser(ctx.prisma, b.id, '+998900000099', 'OWNER');
    ownerB = (await login(ctx.app, '+998900000099')).token;
  });

  it("kirim tasdiqlanadi: qoldiq, o'rtacha tannarx va sotuv narxi (10% ustama)", async () => {
    const id = await product(ctx.app, 'A1');
    await confirmedPurchase([{ productId: id, quantity: 10, price: 100_000 }]);
    let p = (await http().get(`/products/${id}`).set(as('OWNER'))).body;
    expect(p.stock).toBe(10);
    expect(p.avgCost).toBe(100_000);
    expect(p.salePrice).toBe(110_000);

    // Ikkinchi kirim boshqa narxda — o'rtacha tortilgan
    await confirmedPurchase([{ productId: id, quantity: 10, price: 120_000 }]);
    p = (await http().get(`/products/${id}`).set(as('OWNER'))).body;
    expect(p.stock).toBe(20);
    expect(p.avgCost).toBe(110_000);
    expect(p.salePrice).toBe(121_000);

    const mv = (await http().get(`/products/${id}/movements`).set(as('OWNER'))).body;
    expect(mv).toHaveLength(2);
    expect(mv[0].type).toBe('KIRIM');
  });

  it("xarajatlar qatorlarga taqsimlanib tannarxga qo'shiladi", async () => {
    const a = await product(ctx.app, 'X1');
    const b = await product(ctx.app, 'X2');
    const p = await confirmedPurchase(
      [
        { productId: a, quantity: 10, price: 100_000 },
        { productId: b, quantity: 5, price: 200_000 },
      ],
      [{ title: 'Logistika', amount: 100_000 }],
    );
    expect(p.status).toBe('TASDIQLANGAN');
    expect(p.total).toBe(2_100_000);
    const byProduct = Object.fromEntries(
      p.lines.map((l: { productId: string; unitCost: number }) => [l.productId, l.unitCost]),
    );
    expect(byProduct[a]).toBe(105_000);
    expect(byProduct[b]).toBe(210_000);
  });

  it("toifa ustamasi korxona ustamasidan ustun; qo'lda narx o'zgarmaydi", async () => {
    const cat = await http()
      .post('/categories')
      .set(as('OWNER'))
      .send({ name: 'Elektr', markupPercent: 20 });
    expect(cat.status).toBe(201);
    const auto = await product(ctx.app, 'C1', { categoryId: cat.body.id });
    const manual = await product(ctx.app, 'C2', { salePrice: 999 });
    await confirmedPurchase([
      { productId: auto, quantity: 1, price: 1000 },
      { productId: manual, quantity: 1, price: 1000 },
    ]);
    expect((await http().get(`/products/${auto}`).set(as('OWNER'))).body.salePrice).toBe(1200);
    expect((await http().get(`/products/${manual}`).set(as('OWNER'))).body.salePrice).toBe(999);

    // Toifa ustamasi o'zgarsa — avtomatik narx yangilanadi
    await http().patch(`/categories/${cat.body.id}`).set(as('OWNER')).send({ markupPercent: 50 });
    expect((await http().get(`/products/${auto}`).set(as('OWNER'))).body.salePrice).toBe(1500);
  });

  it("SOTUVCHI va OMBORCHI tannarxni ko'rmaydi", async () => {
    const id = await product(ctx.app, 'S1');
    const pur = await confirmedPurchase(
      [{ productId: id, quantity: 3, price: 5000 }],
      [{ title: 'Yuk', amount: 300 }],
    );
    for (const role of ['SOTUVCHI', 'OMBORCHI']) {
      const p = (await http().get(`/products/${id}`).set(as(role))).body;
      expect(p.salePrice).toBe(5610);
      expect(p).not.toHaveProperty('avgCost');
      const list = (await http().get('/products').set(as(role))).body;
      expect(list[0]).not.toHaveProperty('avgCost');
      const mv = (await http().get(`/products/${id}/movements`).set(as(role))).body;
      expect(mv[0]).not.toHaveProperty('unitCost');
    }
    const om = (await http().get(`/purchases/${pur.id}`).set(as('OMBORCHI'))).body;
    expect(om.lines[0]).not.toHaveProperty('price');
    expect(om.lines[0]).not.toHaveProperty('unitCost');
    expect(om).not.toHaveProperty('expenses');
    expect(om).not.toHaveProperty('total');
    // SOTUVCHI kirimlarni umuman ko'rmaydi
    expect((await http().get('/purchases').set(as('SOTUVCHI'))).status).toBe(403);
  });

  it('OMBORCHI qoralama tuzadi, lekin narx kiritolmaydi va tasdiqlay olmaydi', async () => {
    const id = await product(ctx.app, 'O1');
    const withPrice = await http()
      .post('/purchases')
      .set(as('OMBORCHI'))
      .send({ lines: [{ productId: id, quantity: 2, price: 100 }] });
    expect(withPrice.status).toBe(403);

    const draft = await http()
      .post('/purchases')
      .set(as('OMBORCHI'))
      .send({ lines: [{ productId: id, quantity: 2 }] });
    expect(draft.status).toBe(201);
    const pid = draft.body.id;
    expect((await http().post(`/purchases/${pid}/confirm`).set(as('OMBORCHI'))).status).toBe(403);

    // BUXGALTER narx qo'yadi, OMBORCHI miqdorni o'zgartirsa narx saqlanadi
    await http()
      .patch(`/purchases/${pid}`)
      .set(as('BUXGALTER'))
      .send({ lines: [{ productId: id, quantity: 2, price: 700 }] });
    await http()
      .patch(`/purchases/${pid}`)
      .set(as('OMBORCHI'))
      .send({ lines: [{ productId: id, quantity: 3 }] });
    const ok = await http().post(`/purchases/${pid}/confirm`).set(as('BUXGALTER'));
    expect(ok.status).toBe(201);
    expect(ok.body.lines[0].quantity).toBe(3);
    expect(ok.body.lines[0].price).toBe(700);
    // Tasdiqlangan kirim tahrirlanmaydi
    const edit = await http().patch(`/purchases/${pid}`).set(as('BUXGALTER')).send({ note: 'x' });
    expect(edit.status).toBe(400);
  });

  it('narxi kiritilmagan kirim tasdiqlanmaydi', async () => {
    const id = await product(ctx.app, 'N1');
    const d = await http()
      .post('/purchases')
      .set(as('BUXGALTER'))
      .send({ lines: [{ productId: id, quantity: 1 }] });
    const r = await http().post(`/purchases/${d.body.id}/confirm`).set(as('BUXGALTER'));
    expect(r.status).toBe(400);
    expect(r.body.message).toBe('purchases.priceMissing');
  });

  it('inventarizatsiya: farq TUZATISH, manfiy qoldiq rad etiladi', async () => {
    const id = await product(ctx.app, 'I1');
    await confirmedPurchase([{ productId: id, quantity: 10, price: 1000 }]);
    const r = await http()
      .post('/stock/adjustments')
      .set(as('OMBORCHI'))
      .send({ productId: id, actualQuantity: 8, reason: 'Sanoq' });
    expect(r.status).toBe(201);
    expect(r.body.stock).toBe(8);
    const p = (await http().get(`/products/${id}`).set(as('OWNER'))).body;
    expect(p.stock).toBe(8);
    expect(p.avgCost).toBe(1000);

    const neg = await http()
      .post('/stock/adjustments')
      .set(as('OMBORCHI'))
      .send({ productId: id, actualQuantity: -1, reason: 'Sanoq' });
    expect(neg.status).toBe(400);
    const seller = await http()
      .post('/stock/adjustments')
      .set(as('SOTUVCHI'))
      .send({ productId: id, actualQuantity: 1, reason: 'Sanoq' });
    expect(seller.status).toBe(403);
  });

  it('tasdiqlangan kirim bekor qilinsa qoldiq va tannarx qaytadi; qoldiq yetmasa — rad', async () => {
    const id = await product(ctx.app, 'B1');
    await confirmedPurchase([{ productId: id, quantity: 10, price: 100_000 }]);
    const second = await confirmedPurchase([{ productId: id, quantity: 10, price: 120_000 }]);

    const noReason = await http().post(`/purchases/${second.id}/cancel`).set(as('OWNER')).send({});
    expect(noReason.status).toBe(400);

    const c = await http()
      .post(`/purchases/${second.id}/cancel`)
      .set(as('OWNER'))
      .send({ reason: 'Xato kiritildi' });
    expect(c.status).toBe(201);
    expect(c.body.status).toBe('BEKOR');
    const logs = await ctx.prisma.auditLog.findMany({ where: { entityId: second.id } });
    expect(logs.map((l) => (l.data as { to: string }).to).sort()).toEqual([
      'BEKOR',
      'TASDIQLANGAN',
    ]);
    let p = (await http().get(`/products/${id}`).set(as('OWNER'))).body;
    expect(p.stock).toBe(10);
    expect(p.avgCost).toBe(100_000);
    expect(p.salePrice).toBe(110_000);

    // Qoldiq kamaygach, birinchi kirimni bekor qilib bo'lmaydi
    const first = (await http().get('/purchases?status=TASDIQLANGAN').set(as('OWNER'))).body[0];
    await http()
      .post('/stock/adjustments')
      .set(as('OWNER'))
      .send({ productId: id, actualQuantity: 4, reason: 'Sanoq' });
    const bad = await http()
      .post(`/purchases/${first.id}/cancel`)
      .set(as('OWNER'))
      .send({ reason: 'Bekor' });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe('stock.insufficient');
    p = (await http().get(`/products/${id}`).set(as('OWNER'))).body;
    expect(p.stock).toBe(4);
  });

  it('parallel tasdiqlashda tannarx va qoldiq buzilmaydi', async () => {
    const id = await product(ctx.app, 'P1');
    const drafts = await Promise.all(
      [100, 200, 300, 400].map((price) =>
        http()
          .post('/purchases')
          .set(as('BUXGALTER'))
          .send({ lines: [{ productId: id, quantity: 1, price }] }),
      ),
    );
    const numbers = drafts.map((d) => d.body.number).sort();
    expect(new Set(numbers).size).toBe(4);
    const res = await Promise.all(
      drafts.map((d) => http().post(`/purchases/${d.body.id}/confirm`).set(as('BUXGALTER'))),
    );
    expect(res.every((r) => r.status === 201)).toBe(true);
    const p = (await http().get(`/products/${id}`).set(as('OWNER'))).body;
    expect(p.stock).toBe(4);
    expect(p.avgCost).toBe(250);
  });

  it("boshqa korxona tovari va kirimi ko'rinmaydi; SKU takrorlanmaydi", async () => {
    const id = await product(ctx.app, 'K1');
    expect(
      (await http().post('/products').set(as('OWNER')).send({ sku: 'K1', name: 'X', unit: 'dona' }))
        .status,
    ).toBe(409);
    const bOwner = { Authorization: `Bearer ${ownerB}` };
    expect((await http().get(`/products/${id}`).set(bOwner)).status).toBe(404);
    expect((await http().get('/products').set(bOwner)).body).toHaveLength(0);
    // B korxona boshqa korxona tovari bilan kirim qila olmaydi
    const r = await http()
      .post('/purchases')
      .set(bOwner)
      .send({ lines: [{ productId: id, quantity: 1, price: 1 }] });
    expect(r.status).toBe(400);
    // B korxonada ham K1 SKU bo'lishi mumkin
    expect(
      (await http().post('/products').set(bOwner).send({ sku: 'K1', name: 'X', unit: 'dona' }))
        .status,
    ).toBe(201);
  });

  it("kam qolgan tovarlar filtri; SOTUVCHI tovar qo'sha olmaydi; OMBORCHI narx qo'ya olmaydi", async () => {
    const low = await product(ctx.app, 'L1', { minStock: 5 });
    await product(ctx.app, 'L2', { minStock: 0 });
    await confirmedPurchase([{ productId: low, quantity: 2, price: 10 }]);
    const r = (await http().get('/products?low=1').set(as('SOTUVCHI'))).body;
    expect(r.map((p: { sku: string }) => p.sku)).toEqual(['L1']);
    expect(r[0].isLow).toBe(true);

    expect(
      (
        await http()
          .post('/products')
          .set(as('SOTUVCHI'))
          .send({ sku: 'Z', name: 'Z', unit: 'dona' })
      ).status,
    ).toBe(403);
    expect(
      (
        await http()
          .post('/products')
          .set(as('OMBORCHI'))
          .send({ sku: 'Z', name: 'Z', unit: 'kg', salePrice: 5 })
      ).status,
    ).toBe(403);
    expect(
      (await http().post('/products').set(as('OMBORCHI')).send({ sku: 'Z', name: 'Z', unit: 'kg' }))
        .status,
    ).toBe(201);
  });
});
