import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './common/jwt-auth.guard.js';
import { RolesGuard } from './common/roles.guard.js';
import { APP_CONFIG, type AppConfig } from './config.js';
import { OrganizationModule } from './organization/organization.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        {
          module: class ConfigModule {},
          global: true,
          providers: [{ provide: APP_CONFIG, useValue: config }],
          exports: [APP_CONFIG],
        },
        JwtModule.register({
          global: true,
          secret: config.jwtAccessSecret,
          signOptions: { expiresIn: config.accessTokenTtlSec },
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        OrganizationModule,
      ],
      providers: [
        // Tartib muhim: avval autentifikatsiya, keyin rol
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    };
  }
}
