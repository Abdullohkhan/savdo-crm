import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { CategoriesController, CategoriesService } from './categories.controller.js';
import { PricingService } from './pricing.service.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { SuppliersController } from './suppliers.controller.js';

@Module({
  imports: [StockModule],
  controllers: [CategoriesController, SuppliersController, ProductsController],
  providers: [PricingService, CategoriesService, ProductsService],
  exports: [PricingService],
})
export class CatalogModule {}
