import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadConfig } from './config.js';
import { setupApp } from './setup-app.js';

try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {
  // .env yo'q — muhit o'zgaruvchilari tashqaridan
}

const config = loadConfig();
const app = await NestFactory.create(AppModule.forRoot(config));
setupApp(app, config);
await app.listen(config.port);
