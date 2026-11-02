import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { AppConfig } from './config.js';

export function setupApp(app: INestApplication, config: AppConfig): void {
  app.use(cookieParser());
  app.enableCors({ origin: config.webOrigin, credentials: true });
}
