# 2-bosqich — Tovar va ombor

Ishlatish: yangi Claude Code sessiyasi → repo `Abdullohkhan/savdo-crm` → yozing:
**`docs/prompts/2-tovar-ombor.md` ni bajar**

---

Avval `CLAUDE.md`, `docs/spec.md`, `docs/HOLAT.md` ni o'qi. 1-bosqich tuzilmasi va uslubini davom ettir.

## 1. Ma'lumotlar (Prisma)
- `Warehouse` — korxonada bitta "Asosiy ombor" (MVP), avtomatik yaratiladi.
- `Category` — nom, `parentId` (daraxt), `markupPercent` (ixtiyoriy; bo'sh bo'lsa korxona ustamasi), `isActive`.
- `Product` — SKU (korxona ichida unique), shtrix-kod (ixtiyoriy, unique), nom, birlik (`dona | kg | m | quti`),
  toifa, `salePrice`, `priceManual`, `avgCost` (o'rtacha tortilgan tannarx), `minStock`, `imageUrl` (fayl yuklash keyinroq), `isActive`.
- `Supplier` — nom, telefon, INN, `isActive`.
- `Purchase` (kirim) — ta'minotchi, status `QORALAMA → TASDIQLANGAN`, istalganda `BEKOR` (sabab bilan), izoh.
  `PurchaseLine` — tovar, miqdor, xarid narxi; tasdiqlashda: taqsimlangan xarajat, to'liq summa, birlik tannarxi.
  `PurchaseExpense` — nom (logistika, yuk tushirish…), summa.
- `StockMovement` — `KIRIM | CHIQIM | QAYTARISH | TUZATISH | KOCHIRISH`, ishorali miqdor, birlik tannarxi, manba (kirim), kim, qachon.
  Qoldiq faqat harakatlar yig'indisi. `CHIQIM`/`QAYTARISH` — 3-bosqichda, `KOCHIRISH` — bir nechta ombor bilan.
- `AuditLog` — kim, qachon, nima (narx o'zgarishi, kirim statusi, inventarizatsiya — majburiy).
- Miqdor `Decimal(14,3)` (kg/m uchun), pul butun so'm: birlik narxlari `Int`, summalar `BigInt`. Hech qayerda float yo'q.

## 2. Qoidalar
- Kirim tasdiqlanganda: xarajatlar qatorlarga **qiymatiga mutanosib** taqsimlanadi (qoldiq so'm eng katta qatorga),
  har tovarning `avgCost` i o'rtacha tortilgan usulda yangilanadi (10 × 100 000 + 10 × 120 000 → 110 000), `KIRIM` harakati yoziladi.
- `priceManual = false` bo'lsa, sotuv narxi avtomatik: `avgCost × (1 + ustama)`, ustama = toifaniki yoki korxonaniki.
  Narxni qo'lda o'zgartirish (OWNER/BUXGALTER) `priceManual = true` qiladi.
- Tasdiqlangan kirimni bekor qilish: qoldiq yetsa teskari harakat yoziladi va `avgCost` qayta hisoblanadi; yetmasa — rad.
- Inventarizatsiya: haqiqiy miqdor kiritiladi → farq `TUZATISH` harakati. Manfiy qoldiq taqiqlangan.
- O'chirish yo'q: tovar/toifa/ta'minotchi — `isActive=false`, kirim — `BEKOR`.
- Parallel tasdiqlashda qoldiq va tannarx buzilmasin (tranzaksiya + qatorni qulflash).

## 3. Rollar
| Amal | OWNER | BUXGALTER | OMBORCHI | SOTUVCHI |
|---|---|---|---|---|
| Tovar/qoldiq ko'rish | ✅ | ✅ | ✅ | ✅ |
| Tovar, toifa, ta'minotchi qo'shish/tahrirlash | ✅ | ✅ | ✅ | ❌ |
| Sotuv narxini qo'lda, toifa ustamasini o'zgartirish | ✅ | ✅ | ❌ | ❌ |
| Kirim qoralamasi (tovar, miqdor) | ✅ | ✅ | ✅ | ❌ |
| Xarid narxi, xarajatlar, tasdiqlash, bekor qilish | ✅ | ✅ | ❌ | ❌ |
| Inventarizatsiya | ✅ | ❌ | ✅ | ❌ |

Tannarx, xarid narxi, xarajatlar — faqat OWNER va BUXGALTER javobida (API darajasida olib tashlanadi).

## 4. Web
- Menyu: Bosh sahifa, Tovarlar, Kirim (SOTUVCHI'ga yo'q), Xodimlar (OWNER), Sozlamalar. Telefonda 5 tadan ko'p emas — "Chiqish" Sozlamalarga.
- Tovarlar: ro'yxat (qidiruv: nom/SKU/shtrix-kod, toifa filtri, "kam qolgan"), kartochka (qoldiq, narx, tannarx — rolga qarab, harakatlar tarixi, inventarizatsiya), qo'shish/tahrirlash. Toifalar boshqaruvi.
- Kirim: ro'yxat (status filtri), yangi/tahrirlash (ta'minotchi, qatorlar, xarajatlar, tannarx hisobi oldindan ko'rinadi), tasdiqlash, bekor qilish. Ta'minotchilar boshqaruvi.
- Bosh sahifa: kam qolgan tovarlar ogohlantirishi.
- Hamma matn uz/en/ru.

## 5. Testlar
- Birlik: xarajat taqsimoti (yaxlitlash qoldig'i), o'rtacha tortilgan tannarx (spec misoli), sotuv narxi.
- API: kirim tasdiqlash → qoldiq, `avgCost`, sotuv narxi; ikkinchi kirim o'rtachalashadi; OMBORCHI tasdiqlay olmaydi;
  SOTUVCHI/OMBORCHI javobida tannarx yo'q; manfiy inventarizatsiya rad; bekor qilish qoldiqni qaytaradi;
  boshqa korxona tovari ko'rinmaydi; SKU takrorlanmaydi.
- Web: SOTUVCHI "Kirim" menyusini va tannarxni ko'rmaydi; kirim formasida tannarx hisobi to'g'ri.

## 6. Yakun
- typecheck + lint + test + build, `docs/HOLAT.md` yangilanadi, commit, push. Hisobot qisqa.

## Qoidalar
- Spec'da yo'q narsani qo'shma; noaniq joy — HOLAT.md ga "SAVOL:" qilib yoz va davom et.
