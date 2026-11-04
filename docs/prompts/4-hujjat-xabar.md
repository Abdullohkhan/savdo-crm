# 4-bosqich — Hujjat va xabar: PDF shablonlar, bildirishnomalar, Telegram

Ishlatish: yangi Claude Code sessiyasi → repo `Abdullohkhan/savdo-crm` → yozing:
**`docs/prompts/4-hujjat-xabar.md` ni bajar**

---

Avval `CLAUDE.md`, `docs/spec.md`, `docs/HOLAT.md`, `docs/erp-farq.md` ni o'qi. 1–3-bosqich tuzilmasi va uslubini davom ettir.
ERP faqat g'oya manbai — uning kodi, nomi, shablon matnlari ko'chirilmaydi.

## 1. Ma'lumotlar (Prisma)
- `DocumentTemplate` — korxona, turi (`SHARTNOMA | HISOB_FAKTURA | YUK_XATI | AKT`), til (uz/ru), nom, HTML matn, `isDefault`, versiya.
  Seed: har tur uchun o'zbekcha va ruscha standart shablon (o'zimiz yozamiz, oddiy va toza).
- `Document` — korxona, turi, raqam (korxona sozlamasidagi prefiks + yil + tartib, masalan `SH-2026-0001`, tranzaksiyada band qilinadi),
  buyurtma, shablon versiyasi, tayyor HTML nusxasi (keyin shablon o'zgarsa ham hujjat o'zgarmaydi), status `YARATILDI | IMZOLANDI | BEKOR`, imzolangan vaqt, kim.
- `Notification` — korxona, kimga (`userId`), turi, sarlavha/matn kaliti + parametrlar (i18n), havola (buyurtma/to'lov/tovar), `readAt`, Telegram'ga yuborildimi.
- `User.telegramChatId` (ixtiyoriy) + bog'lash kodi (bir martalik, 10 daqiqa).

## 2. Hujjatlar
- O'zgaruvchilar: korxona (nom, INN, manzil, bank), mijoz, buyurtma raqami/sanasi, qatorlar jadvali, jami, **summa so'z bilan** (uz/ru), avans summasi, sotuvchi.
  Shablon xavfsiz render qilinadi (Handlebars yoki shunga o'xshash, HTML escape; skript taqiqlangan).
- PDF: HTML → PDF serverda (Playwright/Chromium yoki yengil muqobil — tanlovni HOLAT'ga yoz). Sahifa A4, shrift kirill va lotinni qo'llaydi.
- **Tannarx va foyda hech qaysi hujjatga chiqmaydi.**
- Oqim: TASDIQLANGAN bo'lganda shartnoma avtomatik yaratiladi → AVANS_KUTILMOQDA (avans 0% bo'lsa ham shartnoma yaratiladi).
  JO'NATILDI da yuk xati va hisob-faktura; YAKUNLANDI uchun akt `IMZOLANDI` bo'lishi shart (belgilaydi: SOTUVCHI/BUXGALTER/OWNER).
- Bekor qilingan buyurtma hujjatlari `BEKOR` bo'ladi (o'chirilmaydi). Hujjat qayta yaratilsa — yangi raqam, eskisi BEKOR.
- Shablon muharriri (faqat OWNER): HTML matn, o'zgaruvchilar ro'yxati, namunaviy buyurtma bilan oldindan ko'rish.

## 3. Bildirishnomalar
- Status o'zgarsa keyingi mas'ul rolga (spec 3-bo'lim): TASDIQLANGAN/AVANS → BUXGALTER, YIG'ILMOQDA → OMBORCHI, JO'NATILDI → mas'ul sotuvchi,
  to'lov rad etildi → qabul qilgan xodim, narxga ruxsat kerak → OWNER.
- Nasiya: muddatdan 3 kun oldin va muddat o'tgan kuni (keyin har 3 kunda) — mas'ul sotuvchi va OWNER. Kam qoldiq — kuniga bir marta OMBORCHI va OWNER.
  Rejalashtirish: `@nestjs/schedule`, Toshkent vaqti 09:00, takror yuborilmasin (idempotent).
- Ilova ichida: yuqorida qo'ng'iroqcha + o'qilmaganlar soni, ro'yxat, "hammasini o'qildi". Har 30 s so'rov (polling) yetarli.
- Telegram (grammY): Sozlamalar → "Telegram'ni ulash" → bog'lash kodi → botga `/start <kod>`. Bot tokeni `.env` da. Xabar foydalanuvchi tilida, havola bilan.
  Telegram ishlamasa — ilova ichidagi bildirishnoma baribir saqlanadi.

## 4. Web
- Buyurtma sahifasida "Hujjatlar" bloki: ro'yxat, PDF ko'rish/yuklab olish, aktni "imzolandi" belgilash.
- Hujjatlar sahifasi: barcha hujjatlar (tur/sana filtri), Shablonlar (OWNER).
- Sozlamalar: hujjat prefikslari, bank rekvizitlari (OWNER), Telegram ulash (har xodim).

## 5. Testlar
- API: raqamlash parallel so'rovlarda takrorlanmaydi, shablon o'zgarsa eski hujjat o'zgarmaydi, akt imzolanmaguncha YAKUNLANDI yo'q,
  summa so'z bilan (uz/ru, chegaraviy sonlar), hujjatda tannarx yo'q, bildirishnoma to'g'ri rolga boradi, nasiya eslatmasi bir kunda bir marta,
  boshqa korxona hujjati/bildirishnomasi ko'rinmaydi, Telegram bog'lash kodi muddati.
- Web: qo'ng'iroqcha hisoblagichi, hujjatlar bloki rolga qarab.
- Playwright 360 px: buyurtma → shartnoma PDF → avans → … → akt imzolandi → yakunlandi; 3 tilda toshish yo'q.

Oxirida: typecheck + lint + test + build, `docs/HOLAT.md` ga natija va SAVOL'lar, commit.
