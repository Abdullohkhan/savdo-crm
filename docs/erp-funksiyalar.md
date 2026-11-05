# ERP funksiyalari — tavsif (manba: Abdullohkhan/erp, branch `ccr-49198ce7-lv8rh1`, commit `7683ed5`)

ERP repo boshqa akkauntga o'tkaziladi, shuning uchun uning funksiyalari shu yerda **tavsif** sifatida saqlanadi.
Kod, nom va dizayn ko'chirilmaydi — savdo-crm o'z spec'i va rollari bilan qayta yozadi (`docs/erp-farq.md`).

## Rollar (10)
| Rol | Vazifa | Narx/tannarx |
|---|---|---|
| Owner | barcha ruxsat, rollar/ruxsatlarni boshqaradi, yangi rol yaratadi | ko'radi |
| Admin | foydalanuvchilar, kataloglar, sozlamalar (rollarni emas) | — |
| Direktor | hammasini ko'radi, ustama/narxni tasdiqlaydi, bekor qiladi | ko'radi |
| Sotuvchi | zayavka ochadi, mijoz tasdig'i, shartnoma, akt | sotuv narxi |
| Injener | konfiguratsiya, ombordan olib yig'ish | **ko'rmaydi** (server javobida yo'q) |
| Deklarant | TN VED, boj, QQS, aksiz, sertifikat → tannarx; katalogga mahsulot qo'shadi | ko'radi |
| Ta'minotchi | yetkazuvchi, haqiqiy narx, logistika; yetkazishni rejalaydi | ko'radi |
| Buxgalter | to'lovlar, avans va ta'minot xarajatini tasdiqlaydi | ko'radi |
| Omborchi | qabul, ko'chirish, hisobdan chiqarish | — |
| Haydovchi | faqat o'ziga biriktirilgan yetkazishlar, yo'l varaqasi, holat | **ko'rmaydi** |

Qoidalar: ruxsatlar bazada, Owner o'zgartiradi, UI 30 s ichida yangilanadi; kamida bitta faol Owner; tizim rollari o'chmaydi.

## Zayavka jarayoni (13 bosqich + bekor)
Turi: o'zgartirish / butlovchilardan yig'ish / buyurtma.
1. NEW → injener ishga oladi (sotuvchi va direktorga "Injener ishlamoqda").
2. CONFIGURATION — qismlar ro'yxati; katalogda yo'q → qizil; nomi/kodi aynan teng bo'lsa avtomatik bog'lanadi; yuborilganda ombordagi qoldiq **band qilinadi**.
3. PRICING (sotib olinadigan bo'lsa) — deklarant: katalogga bog'lash (bir xil nomlilar birga), TN VED, boj %, QQS %, aksiz %, bojxona yig'imi, sertifikat, laboratoriya, xizmat haqi, logistika.
4. REVIEW — direktor: ustama % yoki qo'lda narx.
5. CUSTOMER_APPROVAL — sotuvchi: mijoz tasdiq/rad (rad → REVIEW).
6. CONTRACT — shablondan shartnoma (PDF), imzolash yoki imzolangan skan yuklash → mijoz qarzi yoziladi.
7. ADVANCE_PAYMENT — buxgalter: to'lov ≥ avans (standart 30%); ungacha ish boshlanmaydi.
8. PROCUREMENT — ta'minotchi: faol yetkazuvchi, haqiqiy narx > 0, logistika, boshqa xarajat.
9. PROCUREMENT_APPROVAL — buxgalter: tasdiq / qaytarish.
10. RECEIVING — omborchi: kirim (xarid hujjati, yetkazuvchi qarzi, faktura); kelgan tovar ham band.
11. ASSEMBLY — injener: ombordan olish (band → chiqim) / qaytarish (qayta band), yig'ish tugadi.
12. ACT — dalolatnoma (PDF; skan → "imzolangan").
13. DELIVERY — yetkazish (pastda) → "Yetkazildi" → COMPLETED.
- Bekor (direktor, istalgan bosqich): band yechiladi, olingan qismlar omborga qaytadi, qarz qaytariladi.

## Tannarx
Dona: `narx + boj + aksiz + QQS + (bojxona yig'imi + sertifikat + laboratoriya + xizmat + logistika) / soni`;
boj = narx×boj%, aksiz = (narx+boj)×aksiz%, QQS = (narx+boj+aksiz)×QQS%. Sotuv = tannarx × (1 + ustama%).
Ombordagi qism tannarxi = o'rtacha tannarx. Yetkazish xarajati zayavka tannarxiga qo'shiladi. Hammasi butun so'm.

## Yetkazish
Haydovchi (foydalanuvchi yoki ism/telefon), transport raqami, manzil, reja/haqiqiy sana, xarajat, izoh.
Holat: Rejada → Yo'lda → Yetkazildi (kim qabul qilgani majburiy) / Qaytdi (sabab majburiy, qayta rejalash mumkin).
Bir zayavkada bitta ochiq yetkazish. Yo'l varaqasi HTML/PDF, narxsiz.

## Hujjatlar
- Shartnoma shablonlari `{{maydon}}` bilan; noma'lum maydon yoki `{{itemsTable}}` yo'q → xato. Tekshiruv: narxsiz qator, yuridik mijozda INN, muddat ≤ 730 kun.
- Server PDF (brauzersiz): shartnoma, akt, to'lov hisobi, yo'l varaqasi; A4, jadval sarlavhasi har sahifada; kirill + lotin shrift.
- Summa so'z bilan: o'zbekcha (lotin) va ruscha.
- Imzolangan skan: PDF/JPG/PNG, tur fayl mazmunidan, hajm limiti, diskda, yuklab olish ruxsat bilan.
- Hujjat raqamlash hisoblagich bilan.

## Ombor va moliya
- Kataloglar: mahsulot, mijoz, yetkazuvchi, xodim, ombor.
- Qoldiq, harakatlar (ko'chirish, hisobdan chiqarish), o'rtacha tannarx; har o'zgarish tranzaksiyada, qatorlar bloklanadi.
- Zaxira: mavjud = qoldiq − band; savdo / hisobdan chiqarish / boshqa zayavka faqat mavjuddan oladi.
- Savdo va xarid buyurtmalari (tasdiqlash/bekor), faktura, to'lovlar (mijoz va yetkazuvchi, FIFO taqsimot, zayavka to'lovi).

## Tizim
Bildirishnomalar (bosqich mas'ul roliga), sozlamalar (kompaniya, avans %, ustama %, muddat, QQS %), audit jurnali,
JWT (access 15 daq, refresh 7 kun, rotatsiya), login cheklovi (5 xato → 5 daq), uz/ru/en, dark/light.
