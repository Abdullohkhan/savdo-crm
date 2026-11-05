import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common';
import {
  type OrganizationDto,
  type OrganizationSettingsInput,
  organizationSettingsSchema,
  Role,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { Organization } from '../generated/prisma/client.js';
import { PricingService } from '../catalog/pricing.service.js';
import { audit } from '../common/db.js';
import { PrismaService } from '../prisma/prisma.service.js';

function toDto(o: Organization): OrganizationDto {
  return {
    id: o.id,
    name: o.name,
    inn: o.inn,
    address: o.address,
    markupPercent: o.markupPercent,
    advancePercent: o.advancePercent,
    phone: o.phone,
    director: o.director,
    bankName: o.bankName,
    bankAccount: o.bankAccount,
    bankMfo: o.bankMfo,
    docLocale: o.docLocale,
    shartnomaPrefix: o.shartnomaPrefix,
    hisobFakturaPrefix: o.hisobFakturaPrefix,
    yukXatiPrefix: o.yukXatiPrefix,
    aktPrefix: o.aktPrefix,
  };
}

@Controller('organization')
export class OrganizationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthUser): Promise<OrganizationDto> {
    const o = await this.prisma.organization.findUnique({ where: { id: user.organizationId } });
    if (!o) throw new NotFoundException();
    return toDto(o);
  }

  @Roles(Role.OWNER)
  @Patch()
  async update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(organizationSettingsSchema)) body: OrganizationSettingsInput,
  ): Promise<OrganizationDto> {
    const o = await this.prisma.$transaction(async (tx) => {
      const before = await tx.organization.findUniqueOrThrow({
        where: { id: user.organizationId },
      });
      const after = await tx.organization.update({
        where: { id: user.organizationId },
        data: body,
      });
      if (after.markupPercent !== before.markupPercent) {
        await audit(tx, user, 'Organization', after.id, 'markup.update', {
          from: before.markupPercent,
          to: after.markupPercent,
        });
        await this.pricing.recompute(tx, user);
      }
      return after;
    });
    return toDto(o);
  }
}
