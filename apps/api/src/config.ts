function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Muhit o'zgaruvchisi topilmadi: ${name}`);
  return v;
}

export interface AppConfig {
  databaseUrl: string;
  jwtAccessSecret: string;
  accessTokenTtlSec: number;
  refreshTokenDays: number;
  port: number;
  webOrigin: string;
  cookieSecure: boolean;
}

export function loadConfig(): AppConfig {
  return {
    databaseUrl: required('DATABASE_URL'),
    jwtAccessSecret: required('JWT_ACCESS_SECRET'),
    accessTokenTtlSec: 15 * 60,
    refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS ?? 30),
    port: Number(process.env.PORT ?? 3000),
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
