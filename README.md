# Savdo CRM

Kichik va o'rta savdo korxonalari uchun ombor + savdo + to'lov hisobi. Mobile-first veb-ilova (uz/en/ru, yorug'/qorong'i tema).
Spec: [`docs/spec.md`](docs/spec.md) · Holat: [`docs/HOLAT.md`](docs/HOLAT.md)

## Tuzilma

| Papka             | Nima                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| `apps/web`        | React + Vite + TS, Tailwind + shadcn/ui, Redux Toolkit + RTK Query, i18next   |
| `apps/api`        | NestJS + Prisma + PostgreSQL, JWT (access) + httpOnly refresh cookie, argon2 |
| `packages/shared` | Enumlar va Zod sxemalar (web va api uchun bitta manba)                       |

## Lokal ishga tushirish

Talab: Node 22.12+, pnpm 10, PostgreSQL 16 (yoki Docker).

```bash
pnpm install
cp .env.example .env          # JWT_ACCESS_SECRET va SEED_OWNER_* ni o'zgartiring
pnpm db:up                    # Docker'da PostgreSQL (o'zingizniki bo'lsa — shart emas)
pnpm --filter @savdo/api db:deploy   # migratsiyalar
pnpm --filter @savdo/api db:seed     # "Atoyo" korxonasi + OWNER
pnpm dev                      # web: http://localhost:5173, api: http://localhost:3000
```

Web dev-serveri `/api` ni API'ga proxy qiladi — telefondan `http://<kompyuter-IP>:5173` orqali sinash mumkin.

## Tekshiruvlar

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

API testlari `TEST_DATABASE_URL` bazasini ishlatadi (har testda tozalanadi).
