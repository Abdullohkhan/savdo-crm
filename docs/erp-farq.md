# ERP → Savdo CRM: farqlar va 1C'dan ko'chirish

Sana: 2026-11-04. Mijoz: **Atoyo** (kompyuter yig'ib sotadi, hozir 1C ishlatadi). Savdo CRM 1C o'rnini bosadi.

Qoida: ERP'dagi funksiyalar **g'oya** sifatida olinadi. ERP kodi, nomlari, ekranlari va dizayni ko'chirilmaydi —
rollar va jarayonlar savdo-crm spec'iga (`docs/spec.md`) moslab qayta ishlab chiqiladi.

> ⚠️ **Manba cheklovi.** `Abdullohkhan/erp` repo'si bu sessiyaga ulanmadi (`add_repo` ruxsati rad etildi), shuning uchun
> ERP kodi (README, `docs/`, `schema.prisma`, `backend/src`) o'qilmadi. Jadval topshiriqdagi ERP funksiyalari ro'yxati asosida tuzildi.
> ERP repo ochilgach, "Tekshirish" ustunidagi ✱ belgili qatorlar ERP kodi bilan solishtirilishi kerak (5-bosqich promptida birinchi qadam).

---

## 1. Funksiyalar jadvali

Holat: **bor** — savdo-crm'da tayyor; **qisman** — asosi bor, kengaytirish kerak; **yo'q** — yangi.

| # | ERP funksiyasi | Savdo CRM'da | Savdo CRM'da qanday bo'ladi (rol/jarayon farqi) | Bosqich |
|---|---|---|---|---|
| 1 | Zayavka — 14 bosqichli jarayon ✱ | qisman | 14 qat'iy bosqich o'rniga mavjud 6 bosqichli `SalesOrder` + **ixtiyoriy bosqichlar**: buyurtma turi `SAVDO` (tayyor tovar) yoki `YIGISH` (kompyuter yig'ish). `YIGISH` turida qo'shimcha: KOMPLEKTATSIYA → TA'MINOT (yetmasa) → YIG'ISH/SINOV → AKT → YETKAZISH. Keraksiz bosqich korxona sozlamasida o'chiriladi | 5 |
| 2 | Deklarant tannarxi (import, bojxona) ✱ | qisman | Alohida DEKLARANT roli yo'q. Kirimda `PurchaseExpense` ga **xarajat turi** qo'shiladi (bojxona to'lovi, deklarant xizmati, transport, sertifikat) — tannarxga mutanosib taqsimlanadi (2-bosqich mexanizmi). Deklarant bo'lsa — kirimga faqat xarajat kiritish huquqi (`TAMINOT` roli ichida) | 5 |
| 3 | Injener narx ko'rmaydi | qisman | Yangi rol **TEXNIK** (yig'uvchi/injener): faqat komplekt ro'yxati, seriya raqami, sinov natijasi. Sotuv narxi ham, tannarx ham API javobida yo'q (OMBORCHI qoidasining kuchliroq varianti) | 5 |
| 4 | Avans 30% | bor | Korxona sozlamasi, 0% bo'lsa bosqich o'tkaziladi. BUXGALTER tasdig'idan keyin ombor ishlaydi | — |
| 5 | Ta'minot (xarid so'rovi) ✱ | qisman | Hozir: yetishmayotganlar → kirim qoralamasi. Qo'shiladi: **`PurchaseRequest`** (so'rov → ta'minotchi tanlash → buyurtma berildi → keldi), yangi rol **TAMINOT** — ta'minotchi narxini ko'radi, sotuv foydasini ko'rmaydi. Buyurtma "ta'minot kutilmoqda" holatida turadi | 5 |
| 6 | Buxgalter tasdig'i | bor | To'lov KUTILMOQDA → TASDIQLANGAN/RAD; kirim tasdig'i. Qo'shiladi: ta'minotchiga to'lov tasdig'i (#13) | 5 |
| 7 | Ombor (qoldiq, kirim, chiqim) | bor | `StockMovement` asosida, o'rtacha tortilgan tannarx, manfiy qoldiq taqiqlangan. Bir nechta ombor — keyinroq | — |
| 8 | Yig'ish (komplektlash) ✱ | qisman | Hozir: qatorni "yig'ildi" belgilash. Qo'shiladi: `YIGISH` buyurtmada komplekt (CPU, RAM, ...) zaxiraga olinadi (`ZAXIRA`), TEXNIK yig'adi, har butlovchining **seriya raqami** va sinov natijasi yoziladi; tayyor kompyuter bitta qator bo'lib jo'natiladi | 5 |
| 9 | Akt (topshirish-qabul) | yo'q | 4-bosqichda akt PDF; YAKUNLANDI uchun "akt imzolangan" belgisi (skan/foto yuklash ixtiyoriy) | 4 |
| 10 | Yetkazish ✱ | qisman | JO'NATILDI bor. Qo'shiladi: yetkazish ma'lumoti (manzil, sana, kim olib bordi), ixtiyoriy rol **KURER** — faqat o'ziga biriktirilgan yetkazishlar, narxsiz; mijoz qabul qildi → akt | 5 |
| 11 | Shartnoma shablonlari | yo'q | `DocumentTemplate` (HTML + o'zgaruvchilar: mijoz, qatorlar, summa so'z bilan), OWNER tahrirlaydi; shartnoma TASDIQLANGAN da avtomatik, keyin AVANS_KUTILMOQDA. Hisob-faktura, yuk xati, akt ham | 4 |
| 12 | Bildirishnomalar | yo'q | `Notification` (ilova ichida) + Telegram bot (grammY): status o'zgarsa keyingi mas'ul rolga, nasiya muddati (3 kun oldin / o'tdi), kam qoldiq | 4 |
| 13 | Ta'minotchi bilan hisob-kitob ✱ | yo'q | `SupplierPayment` + ta'minotchi qarzi (kirim summasi − to'lovlar); BUXGALTER tasdiqlaydi. 1C'dan ko'chirishda kerak | 5 |
| 14 | Rollar va ruxsatlar ✱ | qisman | Hozir 4 qat'iy rol. Qo'shiladi: TEXNIK, TAMINOT, KURER + **ruxsat to'plami** (rol → standart ruxsatlar, OWNER xodimga alohida yoqib/o'chiradi). Tannarx/foyda qoidasi o'zgarmaydi: faqat OWNER/BUXGALTER | 5 |
| 15 | Kafolat / seriya raqami ✱ | yo'q | Seriya raqami yig'ishda yoziladi; kafolat muddati tovarda; mijoz kartochkasida "kafolatdagi qurilmalar". Servis (ta'mir) — keyinroq | 5 |
| 16 | Hisobotlar | yo'q | Savdo, foyda (OWNER/BUXGALTER), qoldiq, qarzdorlar, ta'minotchi qarzlari, TEXNIK ish hajmi | 6 |
| 17 | Audit (kim nimani o'zgartirdi) | bor | `AuditLog` — narx, status, to'lov, kirim | — |
| 18 | Hujjat raqamlash ✱ | qisman | Buyurtma raqami bor; shartnoma/akt raqami korxona sozlamasidagi prefiks bilan (masalan `SH-2026-0001`) | 4 |

✱ — ERP kodi bilan tekshirish kerak (bosqichlar soni, maydonlar, kim nimani ko'radi).

### Eng muhim farqlar (qisqa)
1. 14 bosqich emas — 6 asosiy + `YIGISH` turi uchun ixtiyoriy bosqichlar (sozlamada yoqiladi).
2. Deklarant — rol emas, kirimdagi xarajat turi (tannarxga avtomatik taqsimlanadi).
3. Injener → TEXNIK: na sotuv narxi, na tannarx (API darajasida).
4. Ta'minot — alohida `PurchaseRequest` jarayoni va TAMINOT roli.
5. Yig'ishda komplekt zaxiraga olinadi va seriya raqamlari yoziladi.
6. Rollar qat'iy emas: rol + OWNER sozlaydigan ruxsatlar.
7. Ta'minotchi qarzi va to'lovlari (1C'dagi "Взаиморасчеты с поставщиками" o'rniga).
8. Shartnoma/akt — HTML shablon → PDF, OWNER o'zi tahrirlaydi.

---

## 2. 1C'dan ko'chirish rejasi

Maqsad: Atoyo 1C'dan to'liq chiqadi. Tarixiy savdolar ko'chirilmaydi — faqat **ma'lumotnomalar** va **kesim sanasidagi qoldiqlar**.

### 2.1. Nimalar ko'chiriladi
| Ma'lumot | 1C'dan eksport (taxminiy) | Savdo CRM'ga | Izoh |
|---|---|---|---|
| Tovarlar | Справочник «Номенклатура» → Excel | `Product` (sku, nom, birlik, toifa, shtrix-kod) | SKU yo'q bo'lsa — 1C kodi (`Код`) olinadi |
| Toifalar | «Номенклатура» guruhlari | `Category` (daraxt) | Guruh yo'li `Kompyuter/Protsessor` ko'rinishida |
| Narxlar | «Прайс-лист» / «Цены номенклатуры» | `Product.salePrice` (`priceManual=true`) | Butun so'mga yaxlitlanadi |
| Qoldiqlar + tannarx | «Ведомость по товарам на складах» (miqdor + summa) | `StockMovement` yangi turi `BOSHLANGICH` | tannarx = summa ÷ miqdor → `avgCost` |
| Mijozlar | «Контрагенты» (покупатели) | `Customer` (turi, nom, telefon, INN, manzil) | INN bo'lsa — YURIDIK |
| Ta'minotchilar | «Контрагенты» (поставщики) | `Supplier` | Ikkalasi bo'lsa — ikkala ro'yxatga |
| Mijoz qarzlari | «Взаиморасчеты с клиентами» / акт сверки | `Debt` (buyurtmasiz, `source=IMPORT`, muddat) | Hozir `Debt.orderId` majburiy — ixtiyoriy qilinadi |
| Ta'minotchiga qarzlar | «Взаиморасчеты с поставщиками» | `SupplierDebt` (5-bosqichdagi #13) | 5-bosqichdan keyin |

### 2.2. Format
- 1C'dan **Excel (.xlsx)** yoki **CSV (UTF-8, `;` ajratgich)**. Savdo CRM har bir tur uchun **tayyor shablon** beradi (ustun nomlari o'zbekcha, ruscha sinonimlar ham qabul qilinadi).
- Import ekrani (faqat OWNER): fayl yuklash → ustunlarni moslash → **sinov (dry-run)** → xatolar ro'yxati → tasdiqlash.
- Tartib: toifalar → tovarlar → narxlar → ta'minotchilar → mijozlar → qoldiqlar → qarzlar (oldingilar bo'lmasa keyingisi import qilinmaydi).
- Takroriy import xavfsiz: tovar `sku`, mijoz/ta'minotchi `INN` yoki telefon bo'yicha topiladi va yangilanadi (ikki marta yaratilmaydi). Qoldiq va qarz importi faqat bir marta (qayta — avval bekor qilinadi).

### 2.3. Tekshiruv
- Dry-run hisoboti: qatorlar soni, yangi/yangilanadigan, xatolar (bo'sh nom, manfiy miqdor, takror SKU, noto'g'ri INN/telefon, kasr so'm).
- **Yig'indilar solishtiriladi** (1C hisobotiga qarshi): tovar turlari soni, qoldiq miqdori jami, qoldiq qiymati (tannarx bo'yicha) jami, mijozlar qarzi jami, ta'minotchilarga qarz jami. Farq 0 bo'lishi kerak (yaxlitlash ≤ 1 so'm/qator).
- Tasodifiy 20 ta tovar va 10 ta mijozni OWNER 1C bilan qo'lda solishtiradi.
- Import `AuditLog` ga yoziladi (kim, qachon, fayl, qatorlar soni).

### 2.4. O'tish (cutover)
1. Sinov serverida 1C'ning eski eksporti bilan to'liq mashq.
2. Kesim sanasi tanlanadi (masalan, oy boshi, dam olish kuni). O'sha kuni 1C'da hujjat kiritish to'xtatiladi.
3. Yangi eksport → import → yig'indilar tekshiruvi → OWNER tasdig'i.
4. 1–2 hafta 1C faqat o'qish uchun saqlanadi (yangi hujjatlar faqat Savdo CRM'da).
