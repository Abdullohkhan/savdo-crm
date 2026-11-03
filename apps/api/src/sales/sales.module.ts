import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { PurchasesModule } from '../purchases/purchases.module.js';
import { StockModule } from '../stock/stock.module.js';
import { CustomersController } from './customers.controller.js';
import { DashboardController } from './dashboard.controller.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [CatalogModule, StockModule, PurchasesModule],
  controllers: [CustomersController, OrdersController, PaymentsController, DashboardController],
  providers: [OrdersService, PaymentsService],
})
export class SalesModule {}
