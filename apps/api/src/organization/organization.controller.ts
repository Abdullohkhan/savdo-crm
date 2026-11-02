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
import { PrismaService } from '../prisma/prisma.service.js';

function toDto(o: Organization): OrganizationDto {
  return {
    id: o.id,
    name: o.name,
    inn: o.inn,
    address: o.address,
    markupPercent: o.markupPercent,
    advancePercent: o.advancePercent,
  };
}

@Controller('organization')
export class OrganizationController {
  constructor(private readonly prisma: PrismaService) {}

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
    const o = await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: body,
    });
    return toDto(o);
  }
}
