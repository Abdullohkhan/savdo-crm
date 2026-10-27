# 1-bosqich — Skelet, auth, rollar, tema, til

Ishlatish: yangi Claude Code sessiyasi → repo `Abdullohkhan/savdo-crm` → yozing:
**`docs/prompts/1-skelet.md` ni bajar**

---

Avval `CLAUDE.md`, `docs/spec.md`, `docs/HOLAT.md` ni o'qi. Hamma paketlarning oxirgi barqaror versiyasini ol (taxmin qilma, tekshir).

## 1. Monorepo
- pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`.
- Root skriptlar: `dev`, `build`, `typecheck`, `lint`, `test`.
- ESLint + Prettier, TS strict. `.env.example` (sirlar repoga tushmaydi).
- `docker-compose.yml` — faqat lokal PostgreSQL uchun.

## 2. `packages/shared`
- Enum: `Role` = OWNER | BUXGALTER | SOTUVCHI | OMBORCHI; `Locale` = uz | en | ru; `Theme` = light | dark | system.
- Zod sxemalar: login, xodim yaratish/tahrirlash, korxona sozlamalari. Web va api ikkalasi shu yerdan import qiladi.

## 3. `apps/api` (NestJS + Prisma + PostgreSQL)
- Prisma modellari: `Organization` (nom, INN, manzil, `markupPercent` = 10, `advancePercent` = 30),
  `User` (organizationId, ism, telefon — korxona ichida unique, passwordHash (argon2), role, isActive, locale),
  `RefreshToken` (hash, userId, expiresAt, revokedAt).
- Auth: telefon + parol bilan kirish. Access JWT (15 daqiqa) + refresh token httpOnly cookie'da, har yangilanishda almashadi (rotation), logout bekor qiladi.
- `RolesGuard` + `@Roles()` dekoratori. Har so'rov `organizationId` bo'yicha cheklanadi (boshqa korxona ma'lumoti ko'rinmaydi).
- Endpointlar: `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`;
  `/users` CRUD (faqat OWNER; o'chirish yo'q — faqat `isActive=false`); `GET/PATCH /organization` (PATCH faqat OWNER).
- `PATCH /users/me` — o'z tili (locale) va parolini o'zgartirish.
- Seed: "Atoyo" korxonasi + OWNER (telefon va parol env'dan).
- Pul maydonlari keyingi bosqichlarda ham integer (so'm).

## 4. `apps/web` (React + Vite + TS)
- **Tailwind CSS** + **shadcn/ui**. MUI qo'shma.
- **Tema:** Light / Dark / System. Tailwind `dark` klassi `<html>` da. Tanlov localStorage'da (try/catch bilan),
  `index.html` dagi kichik inline skript sahifa chizilishidan oldin klassni qo'yadi — miltillash yo'q.
  Ranglar CSS o'zgaruvchilari orqali (shadcn tokenlari), ikkala rejimda kontrast yetarli.
- **State:** Redux Toolkit — `authSlice` (access token xotirada, localStorage'da EMAS), `uiSlice` (tema, til).
  **RTK Query** — `baseQuery` 401 olsa avtomatik `/auth/refresh` qilib so'rovni qaytaradi, bo'lmasa login'ga.
- **i18n:** react-i18next, `locales/uz.json` (standart), `en.json`, `ru.json`. Kodda qattiq yozilgan matn yo'q.
  Til tanlovi foydalanuvchiga saqlanadi (`PATCH /users/me`).
- React Router + himoyalangan yo'llar (rolga qarab).
- React Hook Form + Zod (`packages/shared` sxemalari).
- **Layout (mobile-first, 360 px dan):** telefonda pastki navigatsiya, kompyuterda yon panel. Yuqorida tema va til almashtirgich.
- Sahifalar:
  1. Kirish (telefon + parol)
  2. Bosh sahifa — "Xush kelibsiz, {ism}" + rol (keyingi bosqichlar uchun bo'sh joy)
  3. Xodimlar (faqat OWNER) — ro'yxat, qo'shish, tahrirlash, faolsizlantirish
  4. Sozlamalar — profil (til, parol), tema, korxona (faqat OWNER: nom, INN, ustama %, avans %)
  5. 404 va "ruxsat yo'q" sahifalari
- Dizayn minimal, kam element.

## 5. Testlar va CI
- api (Vitest yoki Jest): to'g'ri/noto'g'ri parol, faolsiz foydalanuvchi kira olmaydi, refresh rotation (eski token qayta ishlamaydi),
  SOTUVCHI xodim yarata olmaydi, A korxona B korxona xodimlarini ko'rmaydi.
- web (Vitest + Testing Library): tema almashishi `dark` klassini qo'yadi/olib tashlaydi, til almashganda matn o'zgaradi,
  OWNER bo'lmagan foydalanuvchi "Xodimlar" menyusini ko'rmaydi.
- GitHub Actions: install → typecheck → lint → test → build (PostgreSQL service bilan).
- PostgreSQL sessiyada bo'lmasa: o'rnatib ko'r (apt), bo'lmasa DB testlarini CI'ga qoldir va buni hisobotda ayt.

## 6. Yakun
- `README.md`: loyiha nima, lokal ishga tushirish (qisqa).
- `docs/HOLAT.md` ni yangila: nima qilindi, nima qoldi, keyingi bosqich (2 — tovar va ombor).
- Har katta qismdan keyin commit, oxirida `main` ga push.
- Hisobot 5 qatordan oshmasin: nima tayyor, testlar natijasi, ochiq savollar.

## Qoidalar
- Begona "Ombor CRM" kodi, nomi, dizayni ishlatilmaydi.
- Sirlar faqat env'da. Token/parolni chatga chiqarma.
- Spec'da yo'q narsani o'zingdan qo'shma; noaniq joy bo'lsa — HOLAT.md ga "SAVOL:" qilib yoz va davom et.
