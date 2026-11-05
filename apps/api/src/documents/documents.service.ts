import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  advanceRequired,
  canSeeDocumentType,
  type DocLocale,
  type DocumentDto,
  type DocumentTemplateDto,
  type DocumentType,
  DOC_LOCALES,
  DOCUMENT_TYPES,
  OrderStatus,
  Role,
  type TemplateCreateInput,
  type TemplatePreviewInput,
  type TemplateUpdateInput,
} from '@savdo/shared';
import type { AuthUser } from '../common/auth-user.js';
import { audit, lockRow, qty, todayIso, type Tx } from '../common/db.js';
import type { Organization, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { lineValue } from '../stock/costing.js';
import { visibleOrdersWhere } from '../sales/visibility.js';
import { DEFAULT_TEMPLATES } from './default-templates.js';
import { htmlToPdf } from './pdf.js';
import {
  buildContext,
  type ContextSource,
  type DocContext,
  renderTemplate,
  sampleSource,
  TemplateError,
  validateTemplate,
} from './render.js';

const docInclude = {
  order: { select: { number: true, customer: { select: { name: true } } } },
  createdBy: { select: { name: true } },
  signedBy: { select: { name: true } },
} satisfies Prisma.DocumentInclude;
type DocFull = Prisma.DocumentGetPayload<{ include: typeof docInclude }>;

/** Hujjat yaratish uchun buyurtma ma'lumoti — tannarx maydonlari olinmaydi */
const orderForDoc = {
  customer: { select: { name: true, inn: true, address: true, phone: true } },
  seller: { select: { name: true } },
  lines: {
    select: {
      quantity: true,
      price: true,
      product: { select: { name: true, sku: true, unit: true } },
    },
    orderBy: { id: 'asc' },
  },
  payments: { where: { status: 'TASDIQLANGAN' }, select: { amount: true } },
} satisfies Prisma.SalesOrderInclude;

function toDto(d: DocFull): DocumentDto {
  return {
    id: d.id,
    type: d.type,
    number: d.number,
    status: d.status,
    locale: d.locale,
    orderId: d.orderId,
    orderNumber: d.order.number,
    customerName: d.order.customer.name,
    templateVersion: d.templateVersion,
    createdByName: d.createdBy.name,
    createdAt: d.createdAt.toISOString(),
    signedAt: d.signedAt?.toISOString() ?? null,
    signedByName: d.signedBy?.name ?? null,
  };
}

function toTemplateDto(t: {
  id: string;
  type: DocumentType;
  locale: DocLocale;
  name: string;
  html: string;
  isDefault: boolean;
  version: number;
  updatedAt: Date;
}): DocumentTemplateDto {
  return {
    id: t.id,
    type: t.type,
    locale: t.locale,
    name: t.name,
    html: t.html,
    isDefault: t.isDefault,
    version: t.version,
    updatedAt: t.updatedAt.toISOString(),
  };
}

function prefixOf(org: Organization, type: DocumentType): string {
  switch (type) {
    case 'SHARTNOMA':
      return org.shartnomaPrefix;
    case 'HISOB_FAKTURA':
      return org.hisobFakturaPrefix;
    case 'YUK_XATI':
      return org.yukXatiPrefix;
    case 'AKT':
      return org.aktPrefix;
  }
}

function orgContext(org: Organization): DocContext['org'] {
  return {
    name: org.name,
    inn: org.inn,
    address: org.address,
    phone: org.phone,
    director: org.director,
    bankName: org.bankName,
    bankAccount: org.bankAccount,
    bankMfo: org.bankMfo,
  };
}

function templateBadRequest(e: unknown): never {
  if (e instanceof TemplateError) {
    throw new BadRequestException({ message: e.message, detail: e.detail ?? null });
  }
  throw e;
}

/** Qaysi bosqichda qaysi hujjatni yaratish mumkin */
const ALLOWED_STATUS: Record<DocumentType, OrderStatus[]> = {
  SHARTNOMA: ['TASDIQLANGAN', 'AVANS_KUTILMOQDA', 'YIGILMOQDA', 'JONATILDI'],
  HISOB_FAKTURA: ['JONATILDI', 'YAKUNLANDI'],
  YUK_XATI: ['JONATILDI'],
  AKT: ['JONATILDI'],
};

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- raqamlash ----------

  /** Tartib raqami tranzaksiyada band qilinadi (ON CONFLICT — parallel so'rovlarda ham takrorlanmaydi) */
  async nextNumber(tx: Tx, org: Organization, type: DocumentType, now = new Date()) {
    const year = Number(todayIso(now).slice(0, 4));
    const rows = await tx.$queryRaw<{ last: number }[]>`
      INSERT INTO "DocumentCounter" ("organizationId", "type", "year", "last")
      VALUES (${org.id}, ${type}::"DocumentType", ${year}, 1)
      ON CONFLICT ("organizationId", "type", "year")
      DO UPDATE SET "last" = "DocumentCounter"."last" + 1
      RETURNING "last"`;
    const seq = rows[0]!.last;
    return `${prefixOf(org, type)}-${year}-${String(seq).padStart(4, '0')}`;
  }

  // ---------- shablonlar ----------

  /** Korxonada standart shablonlar yo'q bo'lsa yaratadi (har tur × uz/ru) */
  async ensureTemplates(tx: Tx | PrismaService, organizationId: string): Promise<void> {
    const existing = await tx.documentTemplate.findMany({
      where: { organizationId },
      select: { type: true, locale: true },
    });
    const have = new Set(existing.map((t) => `${t.type}:${t.locale}`));
    const data: Prisma.DocumentTemplateCreateManyInput[] = [];
    for (const locale of DOC_LOCALES) {
      for (const type of DOCUMENT_TYPES) {
        if (have.has(`${type}:${locale}`)) continue;
        const d = DEFAULT_TEMPLATES[locale][type];
        data.push({ organizationId, type, locale, name: d.name, html: d.html, isDefault: true });
      }
    }
    if (data.length > 0) await tx.documentTemplate.createMany({ data });
  }

  async listTemplates(actor: AuthUser): Promise<DocumentTemplateDto[]> {
    await this.ensureTemplates(this.prisma, actor.organizationId);
    const rows = await this.prisma.documentTemplate.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: [{ type: 'asc' }, { locale: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toTemplateDto);
  }

  async getTemplate(actor: AuthUser, id: string): Promise<DocumentTemplateDto> {
    const t = await this.prisma.documentTemplate.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!t) throw new NotFoundException();
    return toTemplateDto(t);
  }

  async createTemplate(actor: AuthUser, input: TemplateCreateInput): Promise<DocumentTemplateDto> {
    try {
      validateTemplate(input.html);
    } catch (e) {
      templateBadRequest(e);
    }
    const t = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault)
        await this.clearDefault(tx, actor.organizationId, input.type, input.locale);
      const t = await tx.documentTemplate.create({
        data: {
          organizationId: actor.organizationId,
          type: input.type,
          locale: input.locale,
          name: input.name,
          html: input.html,
          isDefault: input.isDefault ?? false,
        },
      });
      await audit(tx, actor, 'DocumentTemplate', t.id, 'create', {
        type: t.type,
        locale: t.locale,
      });
      return t;
    });
    return toTemplateDto(t);
  }

  async updateTemplate(
    actor: AuthUser,
    id: string,
    input: TemplateUpdateInput,
  ): Promise<DocumentTemplateDto> {
    if (input.html !== undefined) {
      try {
        validateTemplate(input.html);
      } catch (e) {
        templateBadRequest(e);
      }
    }
    const t = await this.prisma.$transaction(async (tx) => {
      const cur = await tx.documentTemplate.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      if (!cur) throw new NotFoundException();
      if (input.isDefault === false && cur.isDefault) {
        throw new BadRequestException('templates.defaultRequired');
      }
      if (input.isDefault) await this.clearDefault(tx, actor.organizationId, cur.type, cur.locale);
      const htmlChanged = input.html !== undefined && input.html !== cur.html;
      const t = await tx.documentTemplate.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          ...(htmlChanged ? { html: input.html, version: { increment: 1 } } : {}),
        },
      });
      await audit(tx, actor, 'DocumentTemplate', id, 'update', {
        version: t.version,
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      });
      return t;
    });
    return toTemplateDto(t);
  }

  private async clearDefault(
    tx: Tx,
    organizationId: string,
    type: DocumentType,
    locale: DocLocale,
  ) {
    await tx.documentTemplate.updateMany({
      where: { organizationId, type, locale, isDefault: true },
      data: { isDefault: false },
    });
  }

  /** Shablonni namunaviy (yoki berilgan) buyurtma bilan render qiladi */
  async preview(actor: AuthUser, input: TemplatePreviewInput): Promise<string> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
    });
    let src: ContextSource;
    if (input.orderId) {
      const o = await this.prisma.salesOrder.findFirst({
        where: { ...visibleOrdersWhere(actor), id: input.orderId },
        include: orderForDoc,
      });
      if (!o) throw new NotFoundException();
      src = await this.contextSource(this.prisma, org, o, input.locale, {
        number: `${prefixOf(org, input.type)}-${todayIso().slice(0, 4)}-0000`,
        createdAt: new Date(),
      });
    } else {
      src = sampleSource(input.locale, orgContext(org));
    }
    try {
      return renderTemplate(input.html, buildContext(src));
    } catch (e) {
      templateBadRequest(e);
    }
  }

  // ---------- hujjatlar ----------

  private async contextSource(
    db: Tx | PrismaService,
    org: Organization,
    o: Prisma.SalesOrderGetPayload<{ include: typeof orderForDoc }>,
    locale: DocLocale,
    doc: { number: string; createdAt: Date },
  ): Promise<ContextSource> {
    const contract = await db.document.findFirst({
      where: { orderId: o.id, type: 'SHARTNOMA', status: { not: 'BEKOR' } },
      orderBy: { createdAt: 'desc' },
      select: { number: true, createdAt: true },
    });
    const lines = o.lines.map((l) => ({
      name: l.product.name,
      sku: l.product.sku,
      unit: l.product.unit,
      quantity: qty(l.quantity),
      price: l.price,
      total: lineValue(l.quantity, l.price),
    }));
    const total = lines.reduce((a, l) => a + l.total, 0n);
    return {
      locale,
      org: orgContext(org),
      customer: o.customer,
      document: doc,
      order: { number: o.number, createdAt: o.createdAt },
      contract,
      sellerName: o.seller.name,
      lines,
      total,
      advancePercent: o.advancePercent,
      advance: advanceRequired(Number(total), o.advancePercent),
      paid: o.payments.reduce((a, p) => a + p.amount, 0n),
    };
  }

  /**
   * Buyurtma uchun hujjat yaratadi (chaqiruvchi tranzaksiyasida).
   * Shu turdagi avvalgi faol hujjat BEKOR bo'ladi — yangi raqam beriladi.
   */
  async createForOrder(
    tx: Tx,
    actor: AuthUser,
    orderId: string,
    type: DocumentType,
  ): Promise<string> {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
    const o = await tx.salesOrder.findFirstOrThrow({
      where: { id: orderId, organizationId: actor.organizationId },
      include: orderForDoc,
    });
    await this.ensureTemplates(tx, org.id);
    const tpl =
      (await tx.documentTemplate.findFirst({
        where: { organizationId: org.id, type, locale: org.docLocale, isDefault: true },
      })) ??
      (await tx.documentTemplate.findFirstOrThrow({
        where: { organizationId: org.id, type, locale: org.docLocale },
        orderBy: { createdAt: 'asc' },
      }));

    const prev = await tx.document.findMany({
      where: { orderId, type, status: { not: 'BEKOR' } },
    });
    if (prev.some((d) => d.status === 'IMZOLANDI')) {
      throw new BadRequestException('documents.alreadySigned');
    }
    if (prev.length > 0) {
      await tx.document.updateMany({
        where: { id: { in: prev.map((d) => d.id) } },
        data: { status: 'BEKOR', cancelledAt: new Date() },
      });
    }

    const now = new Date();
    const number = await this.nextNumber(tx, org, type, now);
    const src = await this.contextSource(tx, org, o, tpl.locale, { number, createdAt: now });
    let html: string;
    try {
      html = renderTemplate(tpl.html, buildContext(src));
    } catch (e) {
      templateBadRequest(e);
    }
    const d = await tx.document.create({
      data: {
        organizationId: org.id,
        type,
        number,
        orderId,
        locale: tpl.locale,
        templateId: tpl.id,
        templateVersion: tpl.version,
        html,
        createdById: actor.id,
        createdAt: now,
      },
    });
    await audit(tx, actor, 'Document', d.id, 'create', {
      type,
      number,
      orderId,
      ...(prev.length ? { replaced: prev.map((p) => p.number) } : {}),
    });
    return d.id;
  }

  /** Buyurtma bekor qilinganda — hamma hujjatlari BEKOR (o'chirilmaydi) */
  async cancelForOrder(tx: Tx, actor: AuthUser, orderId: string): Promise<void> {
    const docs = await tx.document.findMany({
      where: { orderId, status: { not: 'BEKOR' } },
      select: { id: true, number: true },
    });
    if (docs.length === 0) return;
    await tx.document.updateMany({
      where: { id: { in: docs.map((d) => d.id) } },
      data: { status: 'BEKOR', cancelledAt: new Date() },
    });
    await audit(tx, actor, 'SalesOrder', orderId, 'documents.cancel', {
      numbers: docs.map((d) => d.number),
    });
  }

  /** Akt imzolanganmi (YAKUNLANDI sharti) */
  async isActSigned(tx: Tx, orderId: string): Promise<boolean> {
    const n = await tx.document.count({ where: { orderId, type: 'AKT', status: 'IMZOLANDI' } });
    return n > 0;
  }

  private visibleWhere(actor: AuthUser): Prisma.DocumentWhereInput {
    return {
      organizationId: actor.organizationId,
      order: visibleOrdersWhere(actor),
      ...(actor.role === Role.OMBORCHI ? { type: 'YUK_XATI' } : {}),
    };
  }

  async list(
    actor: AuthUser,
    filter: { type?: DocumentType; from?: string; to?: string; orderId?: string },
  ): Promise<DocumentDto[]> {
    const createdAt: Prisma.DateTimeFilter = {};
    // Sana Toshkent vaqti bo'yicha (UTC+5)
    if (filter.from) createdAt.gte = new Date(`${filter.from}T00:00:00+05:00`);
    if (filter.to)
      createdAt.lt = new Date(new Date(`${filter.to}T00:00:00+05:00`).getTime() + 86_400_000);
    const rows = await this.prisma.document.findMany({
      where: {
        ...this.visibleWhere(actor),
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
        ...(filter.from || filter.to ? { createdAt } : {}),
      },
      include: docInclude,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return rows.map(toDto);
  }

  async listForOrder(actor: AuthUser, orderId: string): Promise<DocumentDto[]> {
    const o = await this.prisma.salesOrder.findFirst({
      where: { ...visibleOrdersWhere(actor), id: orderId },
      select: { id: true },
    });
    if (!o) throw new NotFoundException();
    return this.list(actor, { orderId });
  }

  private async findVisible(actor: AuthUser, id: string): Promise<DocFull> {
    const d = await this.prisma.document.findFirst({
      where: { ...this.visibleWhere(actor), id },
      include: docInclude,
    });
    if (!d || !canSeeDocumentType(actor.role, d.type)) throw new NotFoundException();
    return d;
  }

  async get(actor: AuthUser, id: string): Promise<DocumentDto> {
    return toDto(await this.findVisible(actor, id));
  }

  async html(actor: AuthUser, id: string): Promise<{ number: string; html: string }> {
    const d = await this.findVisible(actor, id);
    return { number: d.number, html: d.html };
  }

  async pdf(actor: AuthUser, id: string): Promise<{ number: string; pdf: Buffer }> {
    const d = await this.findVisible(actor, id);
    return { number: d.number, pdf: await htmlToPdf(d.html, d.number) };
  }

  /** Qo'lda (qayta) yaratish */
  async regenerate(actor: AuthUser, orderId: string, type: DocumentType): Promise<DocumentDto> {
    const id = await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'SalesOrder', orderId);
      const o = await tx.salesOrder.findFirst({
        where: { ...visibleOrdersWhere(actor), id: orderId },
      });
      if (!o) throw new NotFoundException();
      if (!ALLOWED_STATUS[type].includes(o.status)) {
        throw new BadRequestException({ message: 'orders.wrongStatus', status: o.status });
      }
      return this.createForOrder(tx, actor, orderId, type);
    });
    return this.get(actor, id);
  }

  /** Hujjatni "imzolandi" deb belgilash (akt — YAKUNLANDI uchun shart) */
  async sign(actor: AuthUser, id: string): Promise<DocumentDto> {
    await this.prisma.$transaction(async (tx) => {
      const d = await this.findVisible(actor, id);
      await lockRow(tx, 'SalesOrder', d.orderId);
      const fresh = await tx.document.findUniqueOrThrow({ where: { id } });
      if (fresh.status !== 'YARATILDI') {
        throw new BadRequestException({ message: 'documents.wrongStatus', status: fresh.status });
      }
      await tx.document.update({
        where: { id },
        data: { status: 'IMZOLANDI', signedAt: new Date(), signedById: actor.id },
      });
      await audit(tx, actor, 'Document', id, 'sign', { number: d.number });
    });
    return this.get(actor, id);
  }
}
