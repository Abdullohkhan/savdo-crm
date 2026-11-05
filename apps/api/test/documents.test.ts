import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DocumentsService } from '../src/documents/documents.service.js';
import { htmlToPdf } from '../src/documents/pdf.js';
import { RemindersService } from '../src/notifications/reminders.service.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import { TelegramService } from '../src/notifications/telegram.service.js';
import { createTestApp, login, resetDb, seedOrg, seedUser, type TestCtx } from './helpers.js';

describe('hujjatlar va bildirishnomalar', () => {
  let ctx: TestCtx;
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  let ownerB = '';
  let orgA = '';

  const http = () => request(ctx.app.getHttpServer());
  const as = (role: string) => ({ Authorization: `Bearer ${tok[role]}` });

  async function product(sku: string, qty: number, cost: number) {
    const p = await http()
      .post('/products')
      .set(as('OWNER'))
      .send({ sku, name: `Tovar ${sku}`, unit: 'dona' });
    const d = await http()
      .post('/purchases')
      .set(as('OWNER'))
      .send({ lines: [{ productId: p.body.id, quantity: qty, price: cost }] });
    await http().post(`/purchases/${d.body.id}/confirm`).set(as('OWNER'));
    return p.body.id as string;
  }

  async function customer(creditLimit = 0) {
    const r = await http()
      .post('/customers')
      .set(as('OWNER'))
      .send({ type: 'YURIDIK', name: 'Mijoz MCHJ', inn: '123456789', creditLimit });
    return r.body.id as string;
  }

  async function confirmed(pid: string, cid: string, quantity = 1) {
    const o = await http()
      .post('/orders')
      .set(as('SOTUVCHI'))
      .send({ customerId: cid, lines: [{ productId: pid, quantity }] });
    const c = await http().post(`/orders/${o.body.id}/confirm`).set(as('SOTUVCHI'));
    expect(c.status).toBe(201);
    return c.body;
  }

  async function shipped(pid: string, cid: string) {
    await ctx.prisma.organization.update({ where: { id: orgA }, data: { advancePercent: 0 } });
    const o = await confirmed(pid, cid);
    for (const l of o.lines) {
      await http()
        .patch(`/orders/${o.id}/lines/${l.id}`)
        .set(as('OMBORCHI'))
        .send({ picked: true });
    }
    const s = await http().post(`/orders/${o.id}/ship`).set(as('OMBORCHI'));
    expect(s.status).toBe(201);
    return s.body;
  }

  const docsOf = async (orderId: string, role = 'OWNER') =>
    (await http().get(`/orders/${orderId}/documents`).set(as(role))).body as {
      id: string;
      type: string;
      status: string;
      number: string;
      templateVersion: number;
    }[];

  const notes = async (role: string) =>
    (await http().get('/notifications').set(as(role))).body as {
      id: string;
      type: string;
      params: Record<string, unknown>;
    }[];

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
      const u = await seedUser(ctx.prisma, a.id, `+99890000003${i}`, role);
      uid[role] = u.id;
      tok[role] = (await login(ctx.app, `+99890000003${i}`)).token;
    }
    await seedUser(ctx.prisma, b.id, '+998900000098', 'OWNER');
    ownerB = (await login(ctx.app, '+998900000098')).token;
    ctx.app.get(TelegramService).setSender(null);
  });

  it('tasdiqlashda shartnoma avtomatik (raqam SH-YYYY-0001), avans 0% bo`lsa ham', async () => {
    const pid = await product('A1', 10, 1000);
    const cid = await customer();
    const o = await confirmed(pid, cid);
    expect(o.status).toBe('AVANS_KUTILMOQDA');
    const year = new Date().getFullYear();
    const d1 = await docsOf(o.id);
    expect(d1).toHaveLength(1);
    expect(d1[0]).toMatchObject({ type: 'SHARTNOMA', status: 'YARATILDI' });
    expect(d1[0]!.number).toMatch(new RegExp(`^SH-(${year}|${year + 1})-0001$`));

    await ctx.prisma.organization.update({
      where: { id: orgA },
      data: { advancePercent: 0, shartnomaPrefix: 'DOG' },
    });
    const o2 = await confirmed(pid, cid);
    expect(o2.status).toBe('YIGILMOQDA');
    const d2 = await docsOf(o2.id);
    expect(d2[0]!.number).toMatch(/^DOG-\d{4}-0002$/);

    const pdf = await http().get(`/documents/${d2[0]!.id}/pdf`).set(as('SOTUVCHI'));
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(Buffer.from(pdf.body).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('raqamlash parallel so`rovlarda takrorlanmaydi', async () => {
    const docs = ctx.app.get(DocumentsService);
    const org = await ctx.prisma.organization.findUniqueOrThrow({ where: { id: orgA } });
    const nums = await Promise.all(
      Array.from({ length: 20 }, () =>
        ctx.prisma.$transaction((tx) => docs.nextNumber(tx, org, 'AKT')),
      ),
    );
    expect(new Set(nums).size).toBe(20);

    // Buyurtmalarni parallel tasdiqlash — shartnoma raqamlari noyob
    const pid = await product('P1', 50, 1000);
    const cid = await customer();
    const drafts = await Promise.all(
      Array.from({ length: 6 }, () =>
        http()
          .post('/orders')
          .set(as('SOTUVCHI'))
          .send({ customerId: cid, lines: [{ productId: pid, quantity: 1 }] }),
      ),
    );
    const res = await Promise.all(
      drafts.map((d) => http().post(`/orders/${d.body.id}/confirm`).set(as('SOTUVCHI'))),
    );
    expect(res.every((r) => r.status === 201)).toBe(true);
    const all = await ctx.prisma.document.findMany({ where: { type: 'SHARTNOMA' } });
    expect(new Set(all.map((d) => d.number)).size).toBe(6);
  });

  it('shablon o`zgarsa eski hujjat o`zgarmaydi; qayta yaratish — yangi raqam, eskisi BEKOR', async () => {
    const pid = await product('T1', 10, 1000);
    const o = await confirmed(pid, await customer());
    const [d] = await docsOf(o.id);
    const before = (await http().get(`/documents/${d!.id}/html`).set(as('OWNER'))).text;
    expect(before).toContain('Mijoz MCHJ');

    const tpls = (await http().get('/document-templates').set(as('OWNER'))).body as {
      id: string;
      type: string;
      locale: string;
      version: number;
    }[];
    expect(tpls).toHaveLength(8);
    expect((await http().get('/document-templates').set(as('SOTUVCHI'))).status).toBe(403);
    const sh = tpls.find((t) => t.type === 'SHARTNOMA' && t.locale === 'uz')!;
    const upd = await http()
      .patch(`/document-templates/${sh.id}`)
      .set(as('OWNER'))
      .send({
        html: '<h1>YANGI SHARTNOMA {{document.number}}</h1><p>{{customer.name}} — {{totalWords}}</p>',
      });
    expect(upd.status).toBe(200);
    expect(upd.body.version).toBe(2);

    const after = (await http().get(`/documents/${d!.id}/html`).set(as('OWNER'))).text;
    expect(after).toBe(before);

    const re = await http()
      .post(`/orders/${o.id}/documents`)
      .set(as('SOTUVCHI'))
      .send({ type: 'SHARTNOMA' });
    expect(re.status).toBe(201);
    expect(re.body.number).not.toBe(d!.number);
    expect(re.body.templateVersion).toBe(2);
    const list = await docsOf(o.id);
    expect(list.find((x) => x.id === d!.id)!.status).toBe('BEKOR');
    expect((await http().get(`/documents/${re.body.id}/html`).set(as('OWNER'))).text).toContain(
      'YANGI SHARTNOMA',
    );
    // Hali jo'natilmagan — akt yaratib bo'lmaydi
    expect(
      (await http().post(`/orders/${o.id}/documents`).set(as('SOTUVCHI')).send({ type: 'AKT' }))
        .status,
    ).toBe(400);
  });

  it('xavfli shablon rad etiladi, oldindan ko`rish ishlaydi', async () => {
    const tpls = (await http().get('/document-templates').set(as('OWNER'))).body as {
      id: string;
    }[];
    for (const html of [
      '<script>alert(1)</script>',
      '<p onclick="x()">a</p>',
      '{{{customer.name}}}',
      '<a href="javascript:x">a</a>',
      '{{#each}',
    ]) {
      const r = await http()
        .patch(`/document-templates/${tpls[0]!.id}`)
        .set(as('OWNER'))
        .send({ html });
      expect(r.status).toBe(400);
    }
    const p = await http()
      .post('/document-templates/preview')
      .set(as('OWNER'))
      .send({ type: 'SHARTNOMA', locale: 'ru', html: '<p>{{customer.name}}: {{totalWords}}</p>' });
    expect(p.status).toBe(201);
    expect(p.body.html).toContain('ООО «Пример»');
    expect(p.body.html).toContain('сумов');
    // HTML escape: mijoz nomidagi teglar matn bo'lib chiqadi
    const cid = (
      await http().post('/customers').set(as('OWNER')).send({ type: 'JISMONIY', name: '<b>X</b>' })
    ).body.id;
    const pid = await product('E1', 5, 1000);
    const o = (
      await http()
        .post('/orders')
        .set(as('OWNER'))
        .send({ customerId: cid, lines: [{ productId: pid, quantity: 1 }] })
    ).body;
    expect(o.id).toBeTruthy();
    const p2 = await http()
      .post('/document-templates/preview')
      .set(as('OWNER'))
      .send({ type: 'AKT', locale: 'uz', html: '<p>{{customer.name}}</p>', orderId: o.id });
    expect(p2.body.html).toBe('<p>&lt;b&gt;X&lt;/b&gt;</p>');
  });

  it('akt imzolanmaguncha YAKUNLANDI yo`q; hujjatlarda tannarx yo`q; OMBORCHI faqat yuk xatini ko`radi', async () => {
    const pid = await product('K1', 10, 123_457); // tannarx 123 457, sotuv 135 803
    const o = await shipped(pid, await customer());
    const docs = await docsOf(o.id);
    expect(docs.map((d) => d.type).sort()).toEqual([
      'AKT',
      'HISOB_FAKTURA',
      'SHARTNOMA',
      'YUK_XATI',
    ]);

    for (const d of docs) {
      const html = (await http().get(`/documents/${d.id}/html`).set(as('OWNER'))).text;
      expect(html).toContain('135 803');
      expect(html).not.toContain('123 457');
      expect(html).not.toContain('123457');
    }

    const wh = await docsOf(o.id, 'OMBORCHI');
    expect(wh.map((d) => d.type)).toEqual(['YUK_XATI']);
    const akt = docs.find((d) => d.type === 'AKT')!;
    expect((await http().get(`/documents/${akt.id}/pdf`).set(as('OMBORCHI'))).status).toBe(404);
    expect((await http().post(`/documents/${akt.id}/sign`).set(as('OMBORCHI'))).status).toBe(403);

    const pay = await http()
      .post('/payments')
      .set(as('SOTUVCHI'))
      .send({ orderId: o.id, method: 'NAQD', amount: 135_803 });
    await http().post(`/payments/${pay.body.id}/confirm`).set(as('BUXGALTER'));
    const no = await http().post(`/orders/${o.id}/complete`).set(as('SOTUVCHI')).send({});
    expect(no.status).toBe(400);
    expect(no.body.message).toBe('orders.actNotSigned');

    const s = await http().post(`/documents/${akt.id}/sign`).set(as('BUXGALTER'));
    expect(s.status).toBe(201);
    expect(s.body.status).toBe('IMZOLANDI');
    expect(s.body.signedByName).toBe('BUXGALTER');
    expect((await http().post(`/documents/${akt.id}/sign`).set(as('OWNER'))).status).toBe(400);
    // Imzolangan aktni qayta yaratib bo'lmaydi
    expect(
      (await http().post(`/orders/${o.id}/documents`).set(as('OWNER')).send({ type: 'AKT' }))
        .status,
    ).toBe(400);
    const ok = await http().post(`/orders/${o.id}/complete`).set(as('SOTUVCHI')).send({});
    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe('YAKUNLANDI');
  });

  it('bekor qilingan buyurtma hujjatlari BEKOR bo`ladi (o`chirilmaydi)', async () => {
    const pid = await product('C1', 10, 1000);
    const o = await shipped(pid, await customer());
    await http().post(`/orders/${o.id}/cancel`).set(as('OWNER')).send({ reason: 'Qaytdi' });
    const docs = await docsOf(o.id);
    expect(docs).toHaveLength(4);
    expect(docs.every((d) => d.status === 'BEKOR')).toBe(true);
  });

  it('bildirishnoma to`g`ri rolga boradi; o`qildi belgilash', async () => {
    const pid = await product('N1', 10, 1000);
    const o = await confirmed(pid, await customer());
    expect((await notes('BUXGALTER')).map((n) => n.type)).toEqual(['ORDER_AWAITING_ADVANCE']);
    expect(await notes('OMBORCHI')).toHaveLength(0);
    expect(await notes('SOTUVCHI')).toHaveLength(0); // o'zi bajargan

    const pay = await http()
      .post('/payments')
      .set(as('SOTUVCHI'))
      .send({ orderId: o.id, method: 'NAQD', amount: 1000 });
    expect((await notes('BUXGALTER')).map((n) => n.type)).toContain('PAYMENT_TO_CONFIRM');
    await http()
      .post(`/payments/${pay.body.id}/reject`)
      .set(as('BUXGALTER'))
      .send({ reason: 'Pul yo`q' });
    const rej = (await notes('SOTUVCHI'))[0]!;
    expect(rej.type).toBe('PAYMENT_REJECTED');
    expect(rej.params.reason).toBe('Pul yo`q');

    const pay2 = await http()
      .post('/payments')
      .set(as('SOTUVCHI'))
      .send({ orderId: o.id, method: 'NAQD', amount: 1000 });
    await http().post(`/payments/${pay2.body.id}/confirm`).set(as('BUXGALTER'));
    expect((await notes('OMBORCHI')).map((n) => n.type)).toEqual(['ORDER_TO_PICK']);

    const cur = (await http().get(`/orders/${o.id}`).set(as('OMBORCHI'))).body;
    await http()
      .patch(`/orders/${o.id}/lines/${cur.lines[0].id}`)
      .set(as('OMBORCHI'))
      .send({ picked: true });
    await http().post(`/orders/${o.id}/ship`).set(as('OMBORCHI'));
    expect((await notes('SOTUVCHI'))[0]!.type).toBe('ORDER_SHIPPED');

    // Narx ruxsati → OWNER
    const low = await http()
      .post('/orders')
      .set(as('SOTUVCHI'))
      .send({ customerId: o.customerId, lines: [{ productId: pid, quantity: 1, price: 500 }] });
    await http()
      .patch(`/orders/${low.body.id}`)
      .set(as('SOTUVCHI'))
      .send({ lines: [{ productId: pid, quantity: 1, price: 400 }] });
    expect((await notes('OWNER')).filter((n) => n.type === 'PRICE_APPROVAL')).toHaveLength(1);

    const cnt = await http().get('/notifications/unread-count').set(as('SOTUVCHI'));
    expect(cnt.body.count).toBe(2);
    const first = (await notes('SOTUVCHI'))[0]!;
    expect((await http().post(`/notifications/${first.id}/read`).set(as('SOTUVCHI'))).status).toBe(
      201,
    );
    expect((await http().get('/notifications/unread-count').set(as('SOTUVCHI'))).body.count).toBe(
      1,
    );
    // Boshqa xodimning bildirishnomasi — 404
    expect((await http().post(`/notifications/${first.id}/read`).set(as('BUXGALTER'))).status).toBe(
      404,
    );
    await http().post('/notifications/read-all').set(as('SOTUVCHI'));
    expect((await http().get('/notifications/unread-count').set(as('SOTUVCHI'))).body.count).toBe(
      0,
    );
  });

  it('boshqa korxona hujjati va bildirishnomasi ko`rinmaydi', async () => {
    const pid = await product('X1', 10, 1000);
    const o = await confirmed(pid, await customer());
    const [d] = await docsOf(o.id);
    const b = { Authorization: `Bearer ${ownerB}` };
    expect((await http().get('/documents').set(b)).body).toHaveLength(0);
    expect((await http().get(`/documents/${d!.id}`).set(b)).status).toBe(404);
    expect((await http().get(`/documents/${d!.id}/pdf`).set(b)).status).toBe(404);
    expect((await http().get(`/orders/${o.id}/documents`).set(b)).status).toBe(404);
    expect((await http().post(`/documents/${d!.id}/sign`).set(b)).status).toBe(404);
    expect((await http().get('/notifications').set(b)).body).toHaveLength(0);
    const n = (await notes('BUXGALTER'))[0]!;
    expect((await http().post(`/notifications/${n.id}/read`).set(b)).status).toBe(404);
    const tplA = (await http().get('/document-templates').set(as('OWNER'))).body[0];
    expect((await http().get(`/document-templates/${tplA.id}`).set(b)).status).toBe(404);
    expect((await http().get('/documents?type=SHARTNOMA').set(as('BUXGALTER'))).body).toHaveLength(
      1,
    );
  });

  it('nasiya eslatmasi bir kunda bir marta; muddat o`tgach har 3 kunda', async () => {
    const pid = await product('D1', 10, 1000);
    const cid = await customer(1_000_000);
    const o = await shipped(pid, cid);
    const akt = (await docsOf(o.id)).find((d) => d.type === 'AKT')!;
    await http().post(`/documents/${akt.id}/sign`).set(as('SOTUVCHI'));
    const done = await http()
      .post(`/orders/${o.id}/complete`)
      .set(as('SOTUVCHI'))
      .send({ dueDate: '2099-01-10' });
    expect(done.status).toBe(201);

    const rem = ctx.app.get(RemindersService);
    const at = (iso: string) => new Date(`${iso}T09:00:00+05:00`);
    const count = (type: string) =>
      ctx.prisma.notification.count({ where: { type: type as never } });

    await rem.runDaily(at('2099-01-06')); // 4 kun qoldi — hech narsa
    expect(await count('DEBT_DUE_SOON')).toBe(0);
    await rem.runDaily(at('2099-01-07'));
    await rem.runDaily(at('2099-01-07')); // takror ishga tushdi
    expect(await count('DEBT_DUE_SOON')).toBe(2); // sotuvchi + OWNER
    const toSeller = await ctx.prisma.notification.findMany({
      where: { userId: uid.SOTUVCHI, type: 'DEBT_DUE_SOON' },
    });
    expect(toSeller).toHaveLength(1);

    await rem.runDaily(at('2099-01-10')); // muddat kuni — hali o'tmagan
    expect(await count('DEBT_OVERDUE')).toBe(0);
    await rem.runDaily(at('2099-01-11')); // o'tgan kuni
    await rem.runDaily(at('2099-01-12'));
    await rem.runDaily(at('2099-01-13'));
    expect(await count('DEBT_OVERDUE')).toBe(2);
    await rem.runDaily(at('2099-01-14')); // 3 kundan keyin
    expect(await count('DEBT_OVERDUE')).toBe(4);
    expect(
      await ctx.prisma.notification.count({
        where: {
          type: { in: ['DEBT_DUE_SOON', 'DEBT_OVERDUE'] },
          userId: { in: [uid.BUXGALTER!, uid.OMBORCHI!] },
        },
      }),
    ).toBe(0);
  });

  it('kam qoldiq — kuniga bir marta OMBORCHI va OWNER', async () => {
    const p = await http()
      .post('/products')
      .set(as('OWNER'))
      .send({ sku: 'L1', name: 'Kam', unit: 'dona', minStock: 5 });
    expect(p.status).toBe(201);
    const rem = ctx.app.get(RemindersService);
    await rem.runDaily(new Date('2099-02-01T05:00:00Z'));
    await rem.runDaily(new Date('2099-02-01T06:00:00Z'));
    const rows = await ctx.prisma.notification.findMany({ where: { type: 'LOW_STOCK' } });
    expect(rows.map((r) => r.userId).sort()).toEqual([uid.OMBORCHI, uid.OWNER].sort());
    expect(rows[0]!.params).toEqual({ count: 1 });
  });

  it('Telegram: bog`lash kodi 10 daqiqa, bir martalik; yuborish xatosi bildirishnomani yo`qotmaydi', async () => {
    const tg = ctx.app.get(TelegramService);
    const actor = { id: uid.BUXGALTER!, organizationId: orgA, role: 'BUXGALTER' as const };
    const t0 = new Date();
    const old = await tg.createLinkCode(actor, t0);
    expect(old.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(
      (await tg.handleStart(old.code, '111', new Date(t0.getTime() + 11 * 60_000))).result,
    ).toBe('expired');
    expect((await tg.handleStart(old.code, '111')).result).toBe('invalid');

    const res = await http().post('/telegram/link-code').set(as('BUXGALTER'));
    expect(res.status).toBe(201);
    expect((await tg.handleStart('WRONG123', '111')).result).toBe('invalid');
    expect((await tg.handleStart(res.body.code.toLowerCase(), '111')).result).toBe('linked');
    expect((await tg.handleStart(res.body.code, '222')).result).toBe('invalid'); // bir martalik
    expect((await http().get('/auth/me').set(as('BUXGALTER'))).body.telegramLinked).toBe(true);

    const sent: { chatId: string; text: string }[] = [];
    let fail = true;
    tg.setSender(async (chatId, text) => {
      if (fail) throw new Error('tarmoq');
      sent.push({ chatId, text });
    });
    const pid = await product('G1', 5, 1000);
    await confirmed(pid, await customer());
    const ns = ctx.app.get(NotificationsService);
    await new Promise((r) => setTimeout(r, 50));
    await ns.dispatchTelegram();
    // Telegram ishlamadi — ilova ichidagi bildirishnoma bor, yuborilmagan
    const n = await ctx.prisma.notification.findFirstOrThrow({ where: { userId: uid.BUXGALTER } });
    expect(n.telegramSentAt).toBeNull();
    expect(n.telegramTries).toBeGreaterThan(0);
    fail = false;
    await ns.dispatchTelegram();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.chatId).toBe('111');
    expect(sent[0]!.text).toContain('avans');
    expect(
      (await ctx.prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).telegramSentAt,
    ).not.toBeNull();

    await http().delete('/telegram/link').set(as('BUXGALTER'));
    expect((await http().get('/auth/me').set(as('BUXGALTER'))).body.telegramLinked).toBe(false);
  });

  it('PDF: kirill va o`zbekcha apostrof, jadval', async () => {
    const pdf = await htmlToPdf(
      '<h1 class="center">Акт № 1</h1><p>Oʻzbekiston — o‘g‘il</p><table><tr><th>№</th><th>Наименование</th></tr><tr><td colspan="2">Итого</td></tr></table><ul><li>a</li></ul>',
      'AKT-1',
    );
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(5000);
  });
});
