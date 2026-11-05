# Holat

## 2026-11-05 — 4-bosqich (hujjat va xabar) ✅
Prompt: `docs/prompts/4-hujjat-xabar.md`.
- ✅ Prisma: `DocumentTemplate` (tur × uz/ru, `isDefault`, versiya), `Document` (raqam, tayyor HTML nusxasi, shablon versiyasi, `YARATILDI | IMZOLANDI | BEKOR`),
  `DocumentCounter` (korxona + tur + yil), `Notification` (i18n kalit + parametrlar, havola, `readAt`, `telegramSentAt`, `dedupeKey`),
  `User.telegramChatId` + bir martalik bog'lash kodi (sha256, 10 daqiqa). Korxona: telefon, rahbar, bank rekvizitlari, hujjat tili, 4 ta prefiks.
- ✅ Hujjatlar: Handlebars (alohida muhit, faqat ichki helperlar, HTML escape; `{{{ }}}`, partial, skript, `on*`, `javascript:` taqiqlangan).
  O'zgaruvchilar: korxona, mijoz, buyurtma, qatorlar, jami, **summa so'z bilan** (uz/ru, `packages/shared/words.ts`), avans, to'langan/qoldiq, shartnoma raqami.
  Kontekstda tannarx/foyda maydonlari umuman yo'q (test bilan tekshirilgan).
- ✅ Raqam `SH-2026-0001`: `INSERT … ON CONFLICT DO UPDATE … RETURNING` — tranzaksiyada band qilinadi, parallel so'rovlarda takrorlanmaydi.
- ✅ Oqim: TASDIQLANGAN → shartnoma avtomatik (avans 0% bo'lsa ham) → AVANS_KUTILMOQDA; JO'NATILDI → yuk xati, hisob-faktura, akt;
  YAKUNLANDI faqat akt `IMZOLANDI` bo'lsa (belgilaydi: SOTUVCHI/BUXGALTER/OWNER). Bekor buyurtma hujjatlari `BEKOR` (o'chirilmaydi).
  Qayta yaratish — yangi raqam, eskisi `BEKOR`; shablon o'zgarsa eski hujjat o'zgarmaydi.
- ✅ PDF: **pdfmake + Roboto** (Chromium/puppeteer yo'q, yengil): HTML'ning hujjat uchun yetarli qismi (h1–h3, p, b/i/u, br, hr, jadval colspan/width, ro'yxat),
  A4, lotin + kirill; `ʻ ʼ` → `‘ ’` (shriftda bor). Tashqi URL/fayl o'qish taqiqlangan.
- ✅ Bildirishnomalar: AVANS_KUTILMOQDA → BUXGALTER, YIG'ILMOQDA → OMBORCHI, JO'NATILDI → mas'ul sotuvchi, yangi to'lov → BUXGALTER,
  to'lov rad → qabul qilgan xodim, tannarxdan past narx → OWNER. Amalni bajargan xodimning o'ziga yuborilmaydi.
- ✅ Kunlik eslatmalar (`@nestjs/schedule`, 09:00 Toshkent, idempotent `dedupeKey`): nasiya — muddatdan 3 kun oldin, muddat o'tgan kuni va keyin har 3 kunda
  (sotuvchi + OWNER); kam qoldiq — kuniga bir marta (OMBORCHI + OWNER).
- ✅ Telegram (grammY): Sozlamalar → kod → botga `/start <kod>`; xabar foydalanuvchi tilida, havola bilan. Outbox: Telegram ishlamasa ilova ichidagisi saqlanadi,
  30 s da qayta urinish (3 marta, 24 soat). `TELEGRAM_BOT_TOKEN` bo'sh bo'lsa bot o'chiq.
- ✅ Web: buyurtmada "Hujjatlar" bloki (PDF ko'rish/yuklab olish, akt "imzolandi", qayta yaratish), Hujjatlar sahifasi (tur/sana filtri) + Shablonlar (OWNER):
  HTML muharrir, o'zgaruvchilar ro'yxati, namunaviy buyurtma bilan oldindan ko'rish (`sandbox` iframe). Yuqorida qo'ng'iroqcha (30 s polling), bildirishnomalar sahifasi,
  "hammasini o'qildi". Sozlamalar: rekvizitlar, prefikslar, hujjat tili (OWNER), Telegram ulash (har xodim). uz/en/ru.
- ✅ Testlar: api 49 (yangi 12), web 29 (yangi 6), shared 54 (summa so'z bilan — 40 ta chegaraviy son). Typecheck, lint, build toza.
  Playwright 360 px: buyurtma → tasdiq (shartnoma PDF) → avans → BUXGALTER tasdig'i (qo'ng'iroqcha) → yig'ish → jo'natish (OMBORCHI faqat yuk xatini ko'radi)
  → to'lov → akt imzolandi → yakunlandi; 3 tilda 6 sahifada gorizontal toshish yo'q (sarlavha toshishi topilib tuzatildi).

### Qabul qilingan qarorlar (xavfsiz standart; SAVOL'larga javob kelsa o'zgartiriladi)
- PDF kutubxonasi — pdfmake (HTML → pdfmake konverter o'zimizniki). Murakkab CSS qo'llanmaydi; shablon shu cheklangan HTML'da yoziladi.
- Hujjat tili — korxona sozlamasi (`docLocale`, standart uz), mijoz bo'yicha emas.
- Akt jo'natishda avtomatik yaratiladi; skan/foto yuklash yo'q (fayl saqlash joyi 7-bosqichda hal bo'ladi). Imzolangan hujjatni qayta yaratib bo'lmaydi.
- OMBORCHI faqat yuk xatini ko'radi (shartnoma/faktura/akt — yo'q). Yangi rollar (TEXNIK/TAMINOT/KURER) qo'shilmadi — SAVOL javobsiz, 5-bosqich.
- Bekor buyurtmada hujjatlar BEKOR bo'ladi, avans qaytarish (refund) hujjati yo'q — oldingi SAVOL javobsiz.
- Avans/to'lov xabarlari faqat BUXGALTER'ga (OWNER'ga emas). Raqamlash yili — Toshkent vaqti, har tur alohida, har yil 0001 dan.
- Summa so'z bilan: "Bir yuz ...", "Bir ming ..." uslubida; ruscha "сум/сума/сумов".
- Telegram — long polling (webhook emas); prod'da (7-bosqich) webhook'ga o'tish mumkin. Bot `/start` xabari bitta instansda ishlashi kerak.
- Standart shablon matnlari o'zimizniki (ERP/1C matni ishlatilmadi), yuridik tekshiruvdan o'tmagan.

### SAVOL
- SAVOL: Atoyo o'z shartnoma namunasini beradimi? Standart matnni yurist tekshirishi kerakmi?
- SAVOL: Hujjat tili mijozga qarab tanlanishi kerakmi (masalan, rus tilidagi yuridik mijozlar)?
- SAVOL: Imzolangan akt skanini/fotosini yuklash shartmi?
- SAVOL: BUXGALTER bo'lmagan korxonada avans/to'lov xabarlari OWNER'ga borsinmi?
- SAVOL: Telegram botni kim yaratadi (@BotFather → token va nom `.env` ga)? Bitta bot hamma korxonaga umumiymi?
- SAVOL: Hisob-faktura — oddiy hujjat (my.soliq e-faktura emas, spec'da MVP'dan tashqari). To'g'rimi?
- Oldingi SAVOL'lar (pastda) hali javobsiz.

### Keyingi
- 5-bosqich — ERP'dan qo'shiladiganlar (`YIGISH` turi, `PurchaseRequest`, ta'minotchi qarzi, yangi rollar). Prompt yozilishi kerak; avval ERP repo ✱ qatorlari.

## 2026-11-04 — Yangi reja (ERP g'oyalari + 1C o'rnini bosish)
Tahlil: `docs/erp-farq.md` (ERP funksiyalari jadvali + 1C'dan ko'chirish rejasi). Mijoz Atoyo 1C'dan to'liq chiqadi.
⚠️ `Abdullohkhan/erp` repo'si bu sessiyaga ulanmadi — jadval topshiriqdagi funksiyalar ro'yxatidan tuzildi, ✱ qatorlar ERP kodi bilan tekshiriladi.

### Qolgan bosqichlar
- ✅ **4 — Hujjat va xabar** (`docs/prompts/4-hujjat-xabar.md`) — 2026-11-05 bajarildi: shartnoma/hisob-faktura/yuk xati/akt — HTML shablon → PDF, OWNER shablonni tahrirlaydi, hujjat raqamlash.
  `Notification` (ilova ichida) + Telegram bot, nasiya eslatmalari; TASDIQLANGAN → AVANS_KUTILMOQDA shartnoma bilan, YAKUNLANDI akt bilan.
- **5 — ERP'dan qo'shiladiganlar**: buyurtma turi `YIGISH` (komplekt zaxirasi, TEXNIK yig'adi, seriya raqami, sinov, akt, yetkazish),
  `PurchaseRequest` (ta'minot), kirim xarajat turlari (bojxona/deklarant), ta'minotchi to'lovi va qarzi, rollar TEXNIK/TAMINOT/KURER + ruxsatlar. Avval ERP kodi bilan ✱ qatorlarni solishtirish.
- **6 — Hisobotlar**: savdo, foyda (OWNER/BUXGALTER), qoldiq, qarzdorlar, ta'minotchi qarzlari; Excel eksport.
- **7 — Production deploy**: Docker Compose + Caddy (bitta domen, `/api`), PostgreSQL zaxira nusxa (kunlik, tashqariga), monitoring, fayl saqlash joyi.
- **8 — 1C'dan ko'chirish**: import ekrani (xlsx/csv shablonlar, dry-run, yig'indilarni solishtirish), `BOSHLANGICH` qoldiq, buyurtmasiz `Debt`; sinov serverida mashq → kesim sanasi → prodga import.
- **9 — Shtrix-kod**: telefon kamerasi (kirim, yig'ish, qidiruv).
- Eslatma: spec 7-bo'limidagi bosqichlar jadvali shu rejaga moslab yangilanishi kerak (5 Hisobot → 6, 6 Deploy → 7, 7 Shtrix-kod → 9).

### SAVOL (yangi)
- SAVOL: ERP repo'sini keyingi sessiyaga ulash mumkinmi (✱ qatorlarni tekshirish uchun)?
- SAVOL: Atoyo'da yangi rollar kerakmi — TEXNIK (injener/yig'uvchi), TAMINOT (xarid), KURER? Deklarant xodimmi yoki tashqi xizmat (faqat xarajat)?
- SAVOL: Atoyo qaysi 1C ishlatadi (Управление торговлей / Бухгалтерия / УНФ, versiya)? Ta'minotchiga qarzlar ham 1C'da yuritiladimi?
- SAVOL: Seriya raqami va kafolat hisobi kerakmi? Servis (ta'mir) jarayoni ham kerakmi?
- Oldingi bosqichlardagi SAVOL'lar (pastda) hali javobsiz.

## 2026-11-03 — 3-bosqich (savdo) ✅
Prompt: `docs/prompts/3-savdo.md` (spec asosida shu sessiyada yozildi).
- ✅ Prisma: `Customer` (jismoniy/yuridik, nasiya limiti), `SalesOrder` + `SalesOrderLine` + `OrderStatusLog`, `Payment`, `Debt`.
- ✅ Buyurtma bosqichlari spec bo'yicha: QORALAMA → TASDIQLANGAN → AVANS_KUTILMOQDA → YIG'ILMOQDA → JO'NATILDI → YAKUNLANDI, BEKOR (sabab bilan).
  Avans 0% bo'lsa — bosqich o'tkaziladi; avans tasdiqlanmaguncha ombor ishlay olmaydi.
- ✅ Chegirma: tannarxdan past narx — ogohlantirish (tannarx raqami sotuvchiga ko'rsatilmaydi) va OWNER ruxsati.
- ✅ Jo'natishda `CHIQIM`, qoldiq yetmasa — yetishmayotganlar ro'yxati va bir tugma bilan kirim qoralamasi.
  Jo'natilgandan keyin bekor (faqat OWNER) — `QAYTARISH`, tannarx qayta hisoblanadi.
- ✅ To'lov: qabul qilish (SOTUVCHI/BUXGALTER/OWNER) → tasdiqlash yoki rad (BUXGALTER/OWNER). Ortiqcha to'lov rad etiladi (parallel so'rovlarda ham).
- ✅ Nasiya: yakunlashda qolgan summa `Debt` ga (muddat, mijoz limiti doirasida), to'lovlar qarzni kamaytiradi va yopadi; muddati o'tgan/3 kun qolgan nasiyalar bosh sahifada.
- ✅ Ko'rinish: SOTUVCHI — faqat o'z buyurtmalari, OMBORCHI — YIG'ILMOQDA dan boshlab, OWNER/BUXGALTER — hammasi. Foyda va tannarx faqat OWNER/BUXGALTER'ga.
- ✅ Web: Mijozlar (ro'yxat, kartochka, qarzdorlik), Buyurtmalar (ro'yxat, muharrir, bosqichlar chizig'i, rolga qarab amallar), To'lovlar (tasdiqlash navbati),
  bosh sahifada rolga qarab "bugungi ishlar". Telefonda pastki menyu 4 ta + "Menyu".
- ✅ Testlar: api 37, web 23, shared 14 — hammasi o'tdi. Typecheck, lint, build toza.
  Playwright: 4 ta rol bilan to'liq oqim 360 px'da (mijoz → buyurtma → avans → tasdiq → yig'ish → jo'natish → limit xatosi → OWNER limit → nasiya bilan yakunlash), 3 tilda toshish yo'q.

### Qabul qilingan qarorlar (spec'da aniq emas edi)
- TASDIQLANGAN → AVANS_KUTILMOQDA hozircha darhol (shartnoma PDF 4-bosqichda qo'shiladi). Akt imzosi ham 4-bosqichda.
- Avans yetarli bo'lgach YIG'ILMOQDA ga o'tish — BUXGALTER to'lovni tasdiqlagan paytda avtomatik.
- Chegirma = sotuvchi narxni sotuv narxidan pastga qo'yadi (qator bo'yicha birlik narxi). Qatorlar o'zgarsa OWNER ruxsati bekor bo'ladi.
- Nasiya limiti 0 — nasiya berilmaydi. Limitni faqat OWNER o'zgartiradi. Sana — Toshkent vaqti bo'yicha.
- Yig'ish — har qatorni "yig'ildi" deb belgilash; qoldiq zaxiraga olinmaydi, jo'natishda tekshiriladi.
- Bildirishnomalar (ilova ichida + Telegram) — 4-bosqich; hozircha bosh sahifadagi vazifalar.

### SAVOL
- SAVOL: Bekor qilingan buyurtmadagi tasdiqlangan to'lovlar (avans) — qaytarish (refund) jarayoni kerakmi? Hozir to'lovlar o'z holicha qoladi.
- SAVOL: SOTUVCHI faqat o'z buyurtmalarini ko'radi, mijozlar esa hammaga umumiy. To'g'rimi?
- SAVOL: OWNER narxga ruxsat berishi kerak bo'lgan holatlar uchun limit (masalan, 5% gacha chegirma ruxsatsiz) kerakmi?
- (2-bosqichdan) kirim ikki qadamli, inventarizatsiya OWNER/OMBORCHI, tovar rasmi — javob kutilmoqda.

### Keyingi
- 4-bosqich — hujjat va xabar: shartnoma/hisob-faktura/yuk xati/akt PDF (HTML shablon), `Notification` + Telegram bot (grammY), nasiya eslatmalari. Prompt yozilishi kerak.

## 2026-11-02 — 2-bosqich (tovar va ombor) ✅
Prompt: `docs/prompts/2-tovar-ombor.md` (shu sessiyada spec asosida yozildi).
- ✅ Prisma: `Warehouse` (bitta "Asosiy ombor"), `Category` (daraxt, ixtiyoriy ustama), `Product`, `Supplier`,
  `Purchase` + `PurchaseLine` + `PurchaseExpense`, `StockMovement`, `AuditLog`. Miqdor `Decimal(14,3)`, pul butun so'm (`Int`/`BigInt`).
- ✅ Kirim: qoralama → tasdiqlash. Xarajatlar qatorlarga qiymatiga mutanosib taqsimlanadi (yaxlitlash qoldig'i yo'qolmaydi),
  `avgCost` o'rtacha tortilgan usulda yangilanadi (spec misoli testda), `KIRIM` harakati yoziladi, sotuv narxi avtomatik.
- ✅ Tasdiqlangan kirimni bekor qilish (sabab bilan): qoldiq yetsa teskari harakat + tannarx qayta hisobi, yetmasa rad.
- ✅ Inventarizatsiya (`TUZATISH`), manfiy qoldiq taqiqlangan. Tranzaksiya + qatorlarni qulflash — parallel tasdiqlash testi bor.
- ✅ Tannarx, xarid narxi, xarajatlar faqat OWNER/BUXGALTER javobida (API darajasida). AuditLog: narx, tannarx, kirim statusi, inventarizatsiya, ustama.
- ✅ Web: Tovarlar (qidiruv, toifa filtri, kam qolganlar, kartochka, harakatlar tarixi, inventarizatsiya), Toifalar, Ta'minotchilar,
  Kirim (ro'yxat, muharrir — tannarx hisobi oldindan ko'rinadi, tasdiqlash, bekor qilish), bosh sahifada kam qolganlar. uz/en/ru.
  Telefonda pastki menyu 5 ta; "Chiqish" Sozlamalarga ko'chdi.
- ✅ Testlar: api 28, web 17, shared 12 — hammasi o'tdi. Typecheck, lint, build toza. Playwright bilan 360 px'da to'liq oqim
  (toifa → tovar → ta'minotchi → kirim → tasdiqlash → inventarizatsiya) va 3 tilda gorizontal toshish yo'qligi tekshirildi.

### Qabul qilingan qarorlar (spec'da aniq emas edi)
- Ustama: tovar toifasi → eng yaqin ota-toifa → korxona. Korxona/toifa ustamasi o'zgarsa avtomatik narxlar qayta hisoblanadi.
- Sotuv narxi qo'lda qo'yilsa (`priceManual`) kirimda o'zgarmaydi; "Avtomatik narxga qaytarish" tugmasi bor.
- Tasdiqlangan kirim bekor qilinganda teskari harakat `KIRIM` turida manfiy miqdor bilan yoziladi (kirimga bog'langan).
- "Kam qoldi": `minStock > 0` va qoldiq ≤ `minStock`.
- Ro'yxatlar sahifalanmagan (tovar 1000, kirim 200 tagacha) — hajm oshsa sahifalash qo'shiladi.

### SAVOL
- SAVOL: OMBORCHI tannarxni ko'rmaydi, shuning uchun kirim ikki qadamli: OMBORCHI qoralama (tovar + miqdor) tuzadi,
  BUXGALTER/OWNER xarid narxi va xarajatlarni kiritib tasdiqlaydi — qoldiq shundan keyin oshadi. Atoyo'da shunday ishlaydimi?
- SAVOL: Inventarizatsiyani OWNER va OMBORCHI qiladi (BUXGALTER — yo'q). To'g'rimi?
- SAVOL: Tovar rasmi — hozircha faqat maydon (`imageUrl`), fayl yuklash yo'q. Qayerda saqlash (server diski / S3) — 6-bosqichda hal qilamizmi?

### Keyingi
- 3-bosqich — savdo: `Customer`, `SalesOrder` bosqichlari, `Payment`, avans qoidasi, `CHIQIM`/`QAYTARISH` harakatlari. Prompt yozilishi kerak.

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
