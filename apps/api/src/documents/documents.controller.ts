import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  type DocumentCreateInput,
  documentCreateSchema,
  type DocumentDto,
  type DocumentTemplateDto,
  type DocumentType,
  DOCUMENT_SIGN_ROLES,
  DOCUMENT_TYPES,
  DOCUMENT_VIEW_ROLES,
  Role,
  type TemplateCreateInput,
  templateCreateSchema,
  type TemplatePreviewDto,
  type TemplatePreviewInput,
  templatePreviewSchema,
  type TemplateUpdateInput,
  templateUpdateSchema,
} from '@savdo/shared';
import type { Response } from 'express';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DocumentsService } from './documents.service.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Hujjat HTML'i ko'rilganda skript ishlamasin */
const HTML_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";

@Roles(...DOCUMENT_VIEW_ROLES)
@Controller()
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get('documents')
  list(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<DocumentDto[]> {
    return this.docs.list(user, {
      type: (DOCUMENT_TYPES as readonly string[]).includes(type ?? '')
        ? (type as DocumentType)
        : undefined,
      from: from && DATE_RE.test(from) ? from : undefined,
      to: to && DATE_RE.test(to) ? to : undefined,
    });
  }

  @Get('documents/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<DocumentDto> {
    return this.docs.get(user, id);
  }

  @Get('documents/:id/pdf')
  async pdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const { number, pdf } = await this.docs.pdf(user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${download === '1' ? 'attachment' : 'inline'}; filename="${number}.pdf"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(pdf);
  }

  @Get('documents/:id/html')
  async html(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { html } = await this.docs.html(user, id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', HTML_CSP);
    res.send(html);
  }

  @Roles(...DOCUMENT_SIGN_ROLES)
  @Post('documents/:id/sign')
  sign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentDto> {
    return this.docs.sign(user, id);
  }

  @Get('orders/:id/documents')
  forOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentDto[]> {
    return this.docs.listForOrder(user, id);
  }

  @Roles(...DOCUMENT_SIGN_ROLES)
  @Post('orders/:id/documents')
  regenerate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(documentCreateSchema)) body: DocumentCreateInput,
  ): Promise<DocumentDto> {
    return this.docs.regenerate(user, id, body.type);
  }
}

/** Shablonlar — faqat OWNER */
@Roles(Role.OWNER)
@Controller('document-templates')
export class TemplatesController {
  constructor(private readonly docs: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<DocumentTemplateDto[]> {
    return this.docs.listTemplates(user);
  }

  @Post('preview')
  async preview(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(templatePreviewSchema)) body: TemplatePreviewInput,
  ): Promise<TemplatePreviewDto> {
    return { html: await this.docs.preview(user, body) };
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentTemplateDto> {
    return this.docs.getTemplate(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(templateCreateSchema)) body: TemplateCreateInput,
  ): Promise<DocumentTemplateDto> {
    return this.docs.createTemplate(user, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(templateUpdateSchema)) body: TemplateUpdateInput,
  ): Promise<DocumentTemplateDto> {
    return this.docs.updateTemplate(user, id, body);
  }
}
