import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, login, resetDb, seedOrg, seedUser, type TestCtx } from './helpers.js';

describe('savdo: buyurtma, to`lov, nasiya', () => {
  let ctx: TestCtx;
  const tok: Record<string, string> = {};
  let ownerB = '';
  let orgA = '';

  const http = () => request(ctx.app.getHttpServer());
  const as = (role: string) => ({ Authorization: `Bearer ${tok[role]}` });

  async function product(sku: string, stockQty: number, cost: number) {
    const p = await http()
      .post('/products')
      .set(as('OWNER'))
      .send({ sku, name: `Tovar ${sku}`, unit: 'dona' });
    expect(p.status).toBe(201);
    if (stockQty > 0) {
      const d = await http()
        .post('/purchases')
        .set(as('OWNER'))
        .send({ lines: [{ productId: p.body.id, quantity: stockQty, price: cost }] });
      expect((await http().post(`/purchases/${d.body.id}/confirm`).set(as('OWNER'))).status).toBe(
        201,
      );
    }
    return p.body.id as string;
  }

  async function customer(creditLimit?: number) {
    const r = await http()
      .post('/customers')
      .set(as('OWNER'))
      .send({ type: 'YURIDIK', name: 'Mijoz MCHJ', ...(creditLimit ? { creditLimit } : {}) });
    expect(r.status).toBe(201);
    return r.body.id as string;
  }

  async function draft(customerId: string, lines: object[], role = 'SOTUVCHI') {
    const r = await http().post('/orders').set(as(role)).send({ customerId, lines });
    expect(r.status).toBe(201);
    return r.body;
  }

  async function pay(orderId: string, amount: number, role = 'SOTUVCHI') {
    const r = await http()
      .post('/payments')
      .set(as(role))
      .send({ orderId, method: 'NAQD', amount });
    return r;
  }

  async function confirmPayment(id: string) {
    const r = await http().post(`/payments/${id}/confirm`).set(as('BUXGALTER'));
    expect(r.status).toBe(201);
    return r.body;
  }

  async function pickAll(order: { id: string; lines: { id: string }[] }) {
    for (const l of order.lines) {
      const r = await http()
        .patch(`/orders/${order.id}/lines/${l.id}`)
        .set(as('OMBORCHI'))
        .send({ picked: true });
      expect(r.status).toBe(200);
    }
  }

  const getOrder = async (id: string, role = 'OWNER') =>
    (await http().get(`/orders/${id}`).set(as(role))).body;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    const a = await seedOrg(ctx.prisma, 'A');
    orgA = a.id;
    const b = await seedOrg(ctx.prisma, 'B');
    const roles = ['OWNER', 'BUXGALTER', 'SOTUVCHI', 'OMBORCHI'] as const;
    for (const [i, role] of roles.entries()) {
      await seedUser(ctx.prisma, a.id, `+99890000002${i}`, role);
      tok[role] = (await login(ctx.app, `+99890000002${i}`)).token;
    }
    await seedUser(ctx.prisma, a.id, '+998900000029', 'SOTUVCHI', { name: 'Ikkinchi' });
    tok.SOTUVCHI2 = (await login(ctx.app, '+998900000029')).token;
    await seedUser(ctx.prisma, b.id, '+998900000099', 'OWNER');
    ownerB = (await login(ctx.app, '+998900000099')).token;
  });

  it("to'liq oqim: qoralama → avans → yig'ish → jo'natish → yakunlandi", async () => {
    const pid = await product('F1', 10, 100_000); // sotuv narxi 110 000
    const cid = await customer();
    const o = await draft(cid, [{ productId: pid, quantity: 4 }]);
    expect(o.status).toBe('QORALAMA');
    expect(o.lines[0].price).toBe(110_000);
    expect(o.total).toBe(440_000);
    expect(o.lines[0]).not.toHaveProperty('unitCost');

    const c = await http().post(`/orders/${o.id}/confirm`).set(as('SOTUVCHI'));
    expect(c.status).toBe(201);
    expect(c.body.status).toBe('AVANS_KUTILMOQDA');
    expect(c.body.advanceRequired).toBe(132_000);
    expect(c.body.history.map((h: { to: string }) => h.to)).toEqual([
      'QORALAMA',
      'TASDIQLANGAN',
      'AVANS_KUTILMOQDA',
    ]);

    // Avans tasdiqlanmaguncha ombor ishlay olmaydi
    const early = await http()
      .patch(`/orders/${o.id}/lines/${o.lines[0].id}`)
      .set(as('OWNER'))
      .send({ picked: true });
    expect(early.status).toBe(400);
    expect((await http().get(`/orders/${o.id}`).set(as('OMBORCHI'))).status).toBe(404);

    // Avans kam — bosqich o'zgarmaydi
    const p1 = await pay(o.id, 100_000);
    expect(p1.status).toBe(201);
    expect(p1.body.isAdvance).toBe(true);
    expect(p1.body.status).toBe('KUTILMOQDA');
    expect((await http().post(`/payments/${p1.body.id}/confirm`).set(as('SOTUVCHI'))).status).toBe(
      403,
    );
    await confirmPayment(p1.body.id);
    expect((await getOrder(o.id)).status).toBe('AVANS_KUTILMOQDA');

    const p2 = await pay(o.id, 40_000);
    await confirmPayment(p2.body.id);
    let cur = await getOrder(o.id);
    expect(cur.status).toBe('YIGILMOQDA');
    expect(cur.paidConfirmed).toBe(140_000);

    // Hamma qator yig'ilmasa jo'natilmaydi
    expect((await http().post(`/orders/${o.id}/ship`).set(as('OMBORCHI'))).status).toBe(400);
    await pickAll(cur);
    const s = await http().post(`/orders/${o.id}/ship`).set(as('OMBORCHI'));
    expect(s.status).toBe(201);
    expect(s.body.status).toBe('JONATILDI');
    const prod = (await http().get(`/products/${pid}`).set(as('OWNER'))).body;
    expect(prod.stock).toBe(6);

    // Foyda faqat OWNER/BUXGALTER'ga
    cur = await getOrder(o.id);
    expect(cur.costTotal).toBe(400_000);
    expect(cur.profit).toBe(40_000);
    const seller = await getOrder(o.id, 'SOTUVCHI');
    expect(seller).not.toHaveProperty('profit');
    expect(seller.lines[0]).not.toHaveProperty('unitCost');

    // Qolgan to'lov va yakunlash
    const p3 = await pay(o.id, 300_000);
    // Tasdiqlanmagan to'lov bor — yakunlab bo'lmaydi
    expect(
      (await http().post(`/orders/${o.id}/complete`).set(as('SOTUVCHI')).send({})).status,
    ).toBe(400);
    await confirmPayment(p3.body.id);
    const done = await http().post(`/orders/${o.id}/complete`).set(as('SOTUVCHI')).send({});
    expect(done.status).toBe(201);
    expect(done.body.status).toBe('YAKUNLANDI');
    expect(done.body.debt).toBeNull();

    const mv = (await http().get(`/products/${pid}/movements`).set(as('OWNER'))).body;
    expect(mv[0].type).toBe('CHIQIM');
    expect(mv[0].quantity).toBe(-4);
    expect(mv[0].orderNumber).toBe(o.number);
  });

  it("avans 0% bo'lsa — to'g'ri YIG'ILMOQDA", async () => {
    await ctx.prisma.organization.update({ where: { id: orgA }, data: { advancePercent: 0 } });
    const pid = await product('Z1', 5, 1000);
    const o = await draft(await customer(), [{ productId: pid, quantity: 1 }]);
    const c = await http().post(`/orders/${o.id}/confirm`).set(as('SOTUVCHI'));
    expect(c.body.status).toBe('YIGILMOQDA');
    expect(c.body.history.map((h: { to: string }) => h.to)).toEqual([
      'QORALAMA',
      'TASDIQLANGAN',
      'YIGILMOQDA',
    ]);
  });

  it("tannarxdan past narx OWNER tasdig'isiz tasdiqlanmaydi", async () => {
    const pid = await product('D1', 5, 1000); // tannarx 1000, sotuv 1100
    const cid = await customer();
    const o = await draft(cid, [{ productId: pid, quantity: 1, price: 1050 }]);
    expect(o.lines[0].belowCost).toBe(false);
    expect(o.needsPriceApproval).toBe(false);

    const low = await http()
      .patch(`/orders/${o.id}`)
      .set(as('SOTUVCHI'))
      .send({ lines: [{ productId: pid, quantity: 1, price: 900 }] });
    expect(low.body.lines[0].belowCost).toBe(true);
    expect(low.body.lines[0].listPrice).toBe(1100);
    expect(low.body.needsPriceApproval).toBe(true);
    // Sotuvchi tannarx raqamini ko'rmaydi
    expect(JSON.stringify(low.body)).not.toContain('"unitCost"');

    const no = await http().post(`/orders/${o.id}/confirm`).set(as('SOTUVCHI'));
    expect(no.status).toBe(400);
    expect(no.body.message).toBe('orders.priceApprovalRequired');
    expect((await http().post(`/orders/${o.id}/approve-price`).set(as('SOTUVCHI'))).status).toBe(
      403,
    );

    const dash = (await http().get('/dashboard').set(as('OWNER'))).body;
    expect(dash.priceApprovals.map((x: { id: string }) => x.id)).toContain(o.id);

    expect((await http().post(`/orders/${o.id}/approve-price`).set(as('OWNER'))).status).toBe(201);
    const ok = await http().post(`/orders/${o.id}/confirm`).set(as('SOTUVCHI'));
    expect(ok.status).toBe(201);
    const log = await ctx.prisma.auditLog.findFirst({
      where: { entityId: o.id, action: 'price.approve' },
    });
    expect(log).not.toBeNull();
  });

  it("qoldiq yetmasa jo'natilmaydi; yetishmayotganlardan kirim qoralamasi", async () => {
    await ctx.prisma.organization.update({ where: { id: orgA }, data: { advancePercent: 0 } });
    const a = await product('S1', 2, 1000);
    const b = await product('S2', 10, 1000);
    const o = await draft(await customer(), [
      { productId: a, quantity: 5 },
      { productId: b, quantity: 3 },
    ]);
    await http().post(`/orders/${o.id}/confirm`).set(as('SOTUVCHI'));
    await pickAll(o);

    const sh = (await http().get(`/orders/${o.id}/shortages`).set(as('OMBORCHI'))).body;
    expect(sh).toEqual([
      expect.objectContaining({ productId: a, required: 5, available: 2, missing: 3 }),
    ]);
    const fail = await http().post(`/orders/${o.id}/ship`).set(as('OMBORCHI'));
    expect(fail.status).toBe(400);
    expect(fail.body.message).toBe('stock.insufficient');
    expect((await http().get(`/products/${b}`).set(as('OWNER'))).body.stock).toBe(10);

    const pur = await http().post(`/orders/${o.id}/shortage-purchase`).set(as('OMBORCHI'));
    expect(pur.status).toBe(201);
    expect(pur.body.status).toBe('QORALAMA');
    expect(pur.body.lines).toEqual([expect.objectContaining({ productId: a, quantity: 3 })]);

    // Kirim tasdiqlangach jo'natish mumkin
    await http()
      .patch(`/purchases/${pur.body.id}`)
      .set(as('BUXGALTER'))
      .send({ lines: [{ productId: a, quantity: 3, price: 1200 }] });
    await http().post(`/purchases/${pur.body.id}/confirm`).set(as('BUXGALTER'));
    expect((await http().post(`/orders/${o.id}/ship`).set(as('OMBORCHI'))).status).toBe(201);
    expect((await http().get(`/products/${a}`).set(as('OWNER'))).body.stock).toBe(0);
  });

  it("nasiya: limit tekshiriladi, to'lov qarzni yopadi; ortiqcha to'lov rad", async () => {
    await ctx.prisma.organization.update({ where: { id: orgA }, data: { advancePercent: 0 } });
    const pid = await product('N1', 10, 1000); // sotuv 1100
    const cid = await customer(2_000);
    const o = await draft(cid, [{ productId: pid, quantity: 3 }]); // 3300
    await http().post(`/orders/${o.id}/confirm`).set(as('SOTUVCHI'));
    await pickAll(o);
    await http().post(`/orders/${o.id}/ship`).set(as('OMBORCHI'));

    expect((await pay(o.id, 3301)).status).toBe(400);
    const p1 = await pay(o.id, 1000);
    await confirmPayment(p1.body.id);

    expect(
      (await http().post(`/orders/${o.id}/complete`).set(as('SOTUVCHI')).send({})).body.message,
    ).toBe('orders.dueDateRequired');
    const over = await http()
      .post(`/orders/${o.id}/complete`)
      .set(as('SOTUVCHI'))
      .send({ dueDate: '2099-01-01' });
    expect(over.status).toBe(400);
    expect(over.body.message).toBe('orders.creditLimitExceeded');

    // OWNER limitni oshiradi (sotuvchi o'zgartira olmaydi)
    expect(
      (await http().patch(`/customers/${cid}`).set(as('SOTUVCHI')).send({ creditLimit: 5000 }))
        .status,
    ).toBe(403);
    await http().patch(`/customers/${cid}`).set(as('OWNER')).send({ creditLimit: 5000 });

    const done = await http()
      .post(`/orders/${o.id}/complete`)
      .set(as('SOTUVCHI'))
      .send({ dueDate: '2099-01-01' });
    expect(done.status).toBe(201);
    expect(done.body.debt.remaining).toBe(2300);
    expect((await http().get(`/customers/${cid}`).set(as('SOTUVCHI'))).body.debt).toBe(2300);

    // Nasiyaga to'lov
    expect((await pay(o.id, 2301)).status).toBe(400);
    const p2 = await pay(o.id, 2000);
    await confirmPayment(p2.body.id);
    expect((await getOrder(o.id)).debt.remaining).toBe(300);
    const p3 = await pay(o.id, 300);
    await confirmPayment(p3.body.id);
    const fin = await getOrder(o.id);
    expect(fin.debt.remaining).toBe(0);
    expect(fin.debt.closedAt).not.toBeNull();
    expect((await http().get(`/customers/${cid}`).set(as('OWNER'))).body.debt).toBe(0);
    expect((await pay(o.id, 1)).status).toBe(400);
  });

  it("muddati o'tgan nasiya bosh sahifada ko'rinadi", async () => {
    await ctx.prisma.organization.update({ where: { id: orgA }, data: { advancePercent: 0 } });
    const pid = await product('M1', 5, 1000);
    const cid = await customer(10_000);
    const o = await draft(cid, [{ productId: pid, quantity: 1 }]);
    await http().post(`/orders/${o.id}/confirm`).set(as('SOTUVCHI'));
    await pickAll(o);
    await http().post(`/orders/${o.id}/ship`).set(as('OMBORCHI'));
    const past = await http()
      .post(`/orders/${o.id}/complete`)
      .set(as('SOTUVCHI'))
      .send({ dueDate: '2000-01-01' });
    expect(past.body.message).toBe('orders.dueDatePast');
    await http()
      .post(`/orders/${o.id}/complete`)
      .set(as('SOTUVCHI'))
      .send({ dueDate: '2099-01-01' });
    await ctx.prisma.debt.updateMany({ data: { dueDate: new Date('2020-01-01T00:00:00Z') } });

    const dash = (await http().get('/dashboard').set(as('SOTUVCHI'))).body;
    expect(dash.debtsDue).toHaveLength(1);
    expect(dash.debtsDue[0].isOverdue).toBe(true);
    expect((await http().get(`/customers/${cid}`).set(as('OWNER'))).body.hasOverdue).toBe(true);
    expect((await http().get('/debts?filter=overdue').set(as('BUXGALTER'))).body).toHaveLength(1);
  });

  it("jo'natilgandan keyin bekor — faqat OWNER, tovar omborga qaytadi", async () => {
    await ctx.prisma.organization.update({ where: { id: orgA }, data: { advancePercent: 0 } });
    const pid = await product('R1', 10, 1000);
    const o = await draft(await customer(), [{ productId: pid, quantity: 4 }]);
    await http().post(`/orders/${o.id}/confirm`).set(as('SOTUVCHI'));
    await pickAll(o);
    await http().post(`/orders/${o.id}/ship`).set(as('OMBORCHI'));
    expect((await http().get(`/products/${pid}`).set(as('OWNER'))).body.stock).toBe(6);

    const bySeller = await http()
      .post(`/orders/${o.id}/cancel`)
      .set(as('SOTUVCHI'))
      .send({ reason: 'Mijoz qaytardi' });
    expect(bySeller.status).toBe(403);
    const c = await http()
      .post(`/orders/${o.id}/cancel`)
      .set(as('OWNER'))
      .send({ reason: 'Mijoz qaytardi' });
    expect(c.status).toBe(201);
    expect(c.body.status).toBe('BEKOR');
    expect(c.body.cancelReason).toBe('Mijoz qaytardi');
    const p = (await http().get(`/products/${pid}`).set(as('OWNER'))).body;
    expect(p.stock).toBe(10);
    expect(p.avgCost).toBe(1000);
    const mv = (await http().get(`/products/${pid}/movements`).set(as('OWNER'))).body;
    expect(mv[0].type).toBe('QAYTARISH');
    // Bekor qilingan buyurtmani qayta bekor qilib/yakunlab bo'lmaydi
    expect(
      (await http().post(`/orders/${o.id}/cancel`).set(as('OWNER')).send({ reason: 'yana' }))
        .status,
    ).toBe(400);
  });

  it("ko'rinish: SOTUVCHI faqat o'zinikini, OMBORCHI yig'ishdan boshlab; boshqa korxona yo'q", async () => {
    const pid = await product('V1', 5, 1000);
    const cid = await customer();
    const mine = await draft(cid, [{ productId: pid, quantity: 1 }]);
    const other = await draft(cid, [{ productId: pid, quantity: 1 }], 'SOTUVCHI2');

    const list = (await http().get('/orders').set(as('SOTUVCHI'))).body;
    expect(list.map((o: { id: string }) => o.id)).toEqual([mine.id]);
    expect((await http().get(`/orders/${other.id}`).set(as('SOTUVCHI'))).status).toBe(404);
    expect((await pay(other.id, 1)).status).toBe(404);
    expect((await http().post(`/orders/${other.id}/confirm`).set(as('SOTUVCHI'))).status).toBe(404);
    expect((await http().get('/orders').set(as('BUXGALTER'))).body).toHaveLength(2);
    expect((await http().get('/orders').set(as('OMBORCHI'))).body).toHaveLength(0);
    // OMBORCHI mijozlarni ko'rmaydi va buyurtma tuza olmaydi
    expect((await http().get('/customers').set(as('OMBORCHI'))).status).toBe(403);
    expect(
      (await http().post('/orders').set(as('OMBORCHI')).send({ customerId: cid, lines: [] }))
        .status,
    ).toBe(403);

    const bOwner = { Authorization: `Bearer ${ownerB}` };
    expect((await http().get('/orders').set(bOwner)).body).toHaveLength(0);
    expect((await http().get(`/orders/${mine.id}`).set(bOwner)).status).toBe(404);
    expect((await http().get('/customers').set(bOwner)).body).toHaveLength(0);
    const cross = await http()
      .post('/orders')
      .set(bOwner)
      .send({ customerId: cid, lines: [{ productId: pid, quantity: 1 }] });
    expect(cross.status).toBe(400);
  });

  it("to'lov rad etilsa hisobga olinmaydi; parallel to'lovlar ortiqcha summaga yo'l qo'ymaydi", async () => {
    const pid = await product('P1', 5, 1000); // 1100
    const o = await draft(await customer(), [{ productId: pid, quantity: 1 }]);
    await http().post(`/orders/${o.id}/confirm`).set(as('SOTUVCHI'));
    const p = await pay(o.id, 500);
    const r = await http()
      .post(`/payments/${p.body.id}/reject`)
      .set(as('BUXGALTER'))
      .send({ reason: 'Pul kelmadi' });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('RAD_ETILGAN');
    expect((await getOrder(o.id)).paidPending).toBe(0);

    const results = await Promise.all([pay(o.id, 700), pay(o.id, 700), pay(o.id, 700)]);
    expect(results.filter((x) => x.status === 201)).toHaveLength(1);
    expect((await getOrder(o.id)).paidPending).toBe(700);
    const queue = (await http().get('/payments?status=KUTILMOQDA').set(as('BUXGALTER'))).body;
    expect(queue).toHaveLength(1);
  });
});
