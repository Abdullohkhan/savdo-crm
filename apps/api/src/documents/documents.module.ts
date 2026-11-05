import { Module } from '@nestjs/common';
import { DocumentsController, TemplatesController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  controllers: [DocumentsController, TemplatesController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
