# Holat

## 2026-11-02 — 1-bosqich (skelet) ✅
- ✅ pnpm monorepo: `apps/web`, `apps/api`, `packages/shared`; ESLint + Prettier, TS strict, `.env.example`, `docker-compose.yml` (faqat PostgreSQL).
- ✅ `packages/shared`: `Role`, `Locale`, `Theme` enumlari; Zod sxemalar (login, xodim yaratish/tahrirlash, `PATCH /users/me`, korxona sozlamalari).
- ✅ `apps/api` (NestJS 12 + Prisma 7 + PostgreSQL): `Organization`, `User`, `RefreshToken` modellari va migratsiya.
  Auth: telefon + parol, access JWT 15 daqiqa, refresh httpOnly cookie, rotation, logout. `RolesGuard` + `@Roles()`, har so'rov `organizationId` bilan cheklangan.
  Endpointlar: `/auth/login|refresh|logout|me`, `/users` (faqat OWNER, o'chirish yo'q), `PATCH /users/me`, `GET/PATCH /organization`. Seed: "Atoyo" + OWNER (env'dan).
- ✅ `apps/web`: Tailwind 4 + shadcn uslubidagi komponentlar, Light/Dark/System (miltillamaydi), Redux (`authSlice` — token faqat xotirada, `uiSlice`), RTK Query (401 → refresh → qayta so'rov), i18n uz/en/ru (til serverga saqlanadi), himoyalangan yo'llar, RHF + Zod.
  Sahifalar: Kirish, Bosh sahifa, Xodimlar (OWNER), Sozlamalar (profil, tema, korxona — OWNER), 404, "Ruxsat yo'q". Telefonda pastki menyu, kompyuterda yon panel.
- ✅ Testlar: api 13 (PostgreSQL bilan, sessiyada o'rnatildi), web 9, shared 3 — hammasi o'tdi. Typecheck, lint, build — toza. Playwright bilan 360 px'da qo'lda tekshirildi.
- ✅ GitHub Actions: install → typecheck → lint → test → build (PostgreSQL service).

### Versiyalar bo'yicha izoh
- Prisma: npm'da `latest` = 8.0.0-rc (release candidate) — barqaror **7.10.1** olindi.
- TypeScript: 7.0 chiqqan, lekin `typescript-eslint` hozircha `<6.1` ni qo'llaydi — **6.0.3** olindi.

### Spec'dan tashqari kichik qarorlar
- OWNER o'zini faolsizlantira va o'z rolini o'zgartira olmaydi (korxona egasiz qolmasligi uchun).
- Ishlatilgan (bekor qilingan) refresh token qayta kelsa — o'sha foydalanuvchining hamma sessiyalari yopiladi.
- Xodim faolsizlantirilsa yoki paroli o'zgartirilsa — uning sessiyalari yopiladi.

### SAVOL
- SAVOL: Telefon korxona ichida unique. Bitta telefon bir nechta korxonada bo'lsa, kirishda paroli mos kelgan korxona tanlanadi. SaaS bosqichida kirish sahifasiga "korxona" maydoni kerakmi?
- SAVOL: Prod'da web va API bitta domenda (`/api` orqali, Caddy) bo'ladi deb qabul qilindi — 6-bosqichda tasdiqlash kerak.

### Keyingi
- 2-bosqich — tovar va ombor: `Product`, `Category`, `Purchase` + xarajatlar, `StockMovement`, qoldiq (o'rtacha tortilgan tannarx). Prompt: `docs/prompts/2-...` yozilishi kerak.

## 2026-10-27
- ✅ `docs/spec.md` v0.1 qoralamasi yozildi (rollar, ob'ektlar, buyurtma bosqichlari, qoidalar, ekranlar, bosqichlar).
- ✅ 8 ta savolga javob olindi → spec v1.0 (birinchi mijoz Atoyo, so'm, QQS yo'q, nasiya bor, i18n uz/en/ru, shtrix-kod oxirida).
- ✅ Repo: Abdullohkhan akkauntida.
- ✅ Stack tasdiqlandi: React + Tailwind + shadcn/ui, Redux Toolkit + RTK Query, dark/light/system, i18n.
