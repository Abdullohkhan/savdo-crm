import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { OrganizationController } from './organization.controller.js';

@Module({ imports: [CatalogModule], controllers: [OrganizationController] })
export class OrganizationModule {}
