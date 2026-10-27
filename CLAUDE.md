# Savdo CRM

Kichik/o'rta savdo uchun ombor + savdo + to'lov CRM. Mobile-first veb-ilova.
Spec: `docs/spec.md`. Holat: `docs/HOLAT.md` — yangi sessiya shu ikkisini o'qib boshlaydi.

## Stack
React + Vite + TS, Tailwind + shadcn/ui (MUI faqat kelishib), Redux Toolkit + RTK Query, react-i18next (uz/en/ru),
dark/light/system. Backend: NestJS + Prisma + PostgreSQL. pnpm monorepo: `apps/web`, `apps/api`, `packages/shared`.
Batafsil: `docs/spec.md` 6-bo'lim. Bosqich promptlari: `docs/prompts/`.

## Qoidalar
- Til: o'zbekcha; texnik atamalar inglizcha.
- Foydalanuvchi telefondan ishlaydi: javob qisqa (natija + keyingi qadam), kod va jadval faylga.
- Mahalliy kompyuter 4 GB RAM — og'ir buyruqlarni (Docker, to'liq build) bu yerda ishga tushirma.
- Sirlar faqat `.env` da, repoga faqat `.env.example`.
- Tannarx/foyda faqat OWNER va BUXGALTER'ga — API darajasida tekshiriladi.
- Pul butun so'mda (integer), float emas.
- Begona "Ombor CRM" loyihasining kodi, nomi, dizayni ishlatilmaydi.
- Har bosqich oxirida typecheck + lint + test, keyin commit.
