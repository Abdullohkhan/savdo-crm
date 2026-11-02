import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CATALOG_EDIT_ROLES,
  type CategoryCreateInput,
  categoryCreateSchema,
  type CategoryDto,
  type CategoryUpdateInput,
  categoryUpdateSchema,
  canSeeCost,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { audit } from '../common/db.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { Category } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PricingService } from './pricing.service.js';

function toDto(c: Category): CategoryDto {
  return {
    id: c.id,
    name: c.name,
    parentId: c.parentId,
    markupPercent: c.markupPercent,
    isActive: c.isActive,
  };
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async list(actor: AuthUser): Promise<CategoryDto[]> {
    const rows = await this.prisma.category.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { name: 'asc' },
    });
    return rows.map(toDto);
  }

  async create(actor: AuthUser, input: CategoryCreateInput): Promise<CategoryDto> {
    if (
      input.markupPercent !== undefined &&
      input.markupPercent !== null &&
      !canSeeCost(actor.role)
    ) {
      throw new ForbiddenException('catalog.markupForbidden');
    }
    if (input.parentId) await this.assertInOrg(actor, input.parentId);
    const c = await this.prisma.category.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        parentId: input.parentId ?? null,
        markupPercent: input.markupPercent ?? null,
      },
    });
    return toDto(c);
  }

  async update(actor: AuthUser, id: string, input: CategoryUpdateInput): Promise<CategoryDto> {
    const current = await this.assertInOrg(actor, id);
    if (input.markupPercent !== undefined && !canSeeCost(actor.role)) {
      throw new ForbiddenException('catalog.markupForbidden');
    }
    if (input.parentId) {
      await this.assertInOrg(actor, input.parentId);
      await this.assertNoCycle(actor, id, input.parentId);
    }
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.category.update({ where: { id }, data: input });
      const markupChanged =
        input.markupPercent !== undefined && input.markupPercent !== current.markupPercent;
      const parentChanged = input.parentId !== undefined && input.parentId !== current.parentId;
      if (markupChanged) {
        await audit(tx, actor, 'Category', id, 'markup.update', {
          from: current.markupPercent,
          to: c.markupPercent,
        });
      }
      // Ustama ota-toifadan meros olinadi — butun korxona bo'yicha qayta hisoblaymiz
      if (markupChanged || parentChanged) await this.pricing.recompute(tx, actor);
      return toDto(c);
    });
  }

  private async assertInOrg(actor: AuthUser, id: string): Promise<Category> {
    const c = await this.prisma.category.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!c) throw new NotFoundException('catalog.categoryNotFound');
    return c;
  }

  /** Toifa o'zining avlodiga ota qilib qo'yilmasin */
  private async assertNoCycle(actor: AuthUser, id: string, parentId: string): Promise<void> {
    const all = await this.prisma.category.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, parentId: true },
    });
    const parentOf = new Map(all.map((c) => [c.id, c.parentId]));
    let cur: string | null | undefined = parentId;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      if (cur === id) throw new BadRequestException('catalog.categoryCycle');
      seen.add(cur);
      cur = parentOf.get(cur);
    }
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<CategoryDto[]> {
    return this.categories.list(user);
  }

  @Roles(...CATALOG_EDIT_ROLES)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(categoryCreateSchema)) body: CategoryCreateInput,
  ): Promise<CategoryDto> {
    return this.categories.create(user, body);
  }

  @Roles(...CATALOG_EDIT_ROLES)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(categoryUpdateSchema)) body: CategoryUpdateInput,
  ): Promise<CategoryDto> {
    return this.categories.update(user, id, body);
  }
}
