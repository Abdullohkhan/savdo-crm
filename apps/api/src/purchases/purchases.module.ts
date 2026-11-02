import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { StockModule } from '../stock/stock.module.js';
import { PurchasesController } from './purchases.controller.js';
import { PurchasesService } from './purchases.service.js';

@Module({
  imports: [CatalogModule, StockModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
