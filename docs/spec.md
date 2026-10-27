# Savdo CRM — spetsifikatsiya (v1.0)

Ishchi nom: **Savdo CRM**. Kichik va o'rta savdo (do'kon, ulgurji, distribyutor) uchun ombor + savdo + to'lov hisobi.
Telefonga mos veb-ilova (mobile-first), kompyuterda ham ishlaydi.
Holat: spec tasdiqlangan (2026-10-27), kod yo'q. Qarorlar — 8-bo'lim.

Birinchi mijoz: **Atoyo** — uning ish jarayoniga moslab boshlanadi, keyin umumiy SaaS.

Ilhom manbai: ko'rilgan "Ombor CRM" tanishtiruv videosidagi ish jarayoni (rollar, bosqichli buyurtma, avans, tannarx yashirish).
Ularning kodi, nomi va dizayni ishlatilmaydi.

---

## 1. Kimlar ishlatadi

Mijoz: 1–20 xodimli savdo korxonasi. Bitta korxona = bitta `Organization` (keyinchalik SaaS uchun multi-tenancy).

| Rol | Nima qiladi | Tannarxni ko'radimi |
|---|---|---|
| **OWNER** (egasi) | Hamma narsa, sozlamalar, xodimlar, hisobotlar | ✅ |
| **BUXGALTER** | To'lovlarni tasdiqlaydi, kirim xarajatlarini kiritadi, hisobotlar | ✅ |
| **SOTUVCHI** | Mijoz, buyurtma, narx taklifi, to'lov qabul qilish | ❌ faqat sotuv narxi |
| **OMBORCHI** | Kirim qabul qilish, yig'ish, jo'natish, inventarizatsiya | ❌ |

Qoida: tannarx, ustama va foyda faqat OWNER va BUXGALTER'ga ko'rinadi — API darajasida ham yashiriladi, faqat UI'da emas.

---

## 2. Asosiy ob'ektlar (entity)

- **Organization** — korxona: nom, INN, manzil, valyuta, sozlamalar (ustama %, avans %).
- **User** — xodim: ism, telefon, rol, faol/faol emas.
- **Category** — tovar toifasi (daraxt ko'rinishida bo'lishi mumkin).
- **Product** — tovar: SKU, shtrix-kod, nom, birlik (dona/kg/m/quti), toifa, sotuv narxi, minimal qoldiq, rasm.
- **Warehouse** — ombor (MVP'da bitta, keyin bir nechta).
- **Supplier** — ta'minotchi: nom, telefon, INN.
- **Customer** — mijoz: jismoniy yoki yuridik shaxs, telefon, INN, qarzdorlik (hisoblanadi), nasiya limiti.
- **Purchase** (kirim) — ta'minotchidan tovar keldi: qatorlar (tovar, miqdor, **tannarx** — kirimda qo'lda kiritiladi). Ixtiyoriy qo'shimcha xarajatlar (logistika, yuk tushirish) bo'lsa — qatorlarga taqsimlanib tannarxga qo'shiladi.
- **Debt** (nasiya) — nasiyaga sotilgan buyurtma: summa, to'lov muddati, qolgan qarz; muddat yaqinlashsa va o'tsa eslatma.
- **StockMovement** — har bir harakat: KIRIM / CHIQIM / QAYTARISH / TUZATISH (inventarizatsiya) / KO'CHIRISH. Qoldiq faqat shu harakatlardan hisoblanadi, qo'lda o'zgartirilmaydi.
- **SalesOrder** (buyurtma) — mijoz, qatorlar (tovar, miqdor, narx, chegirma), status, mas'ul sotuvchi.
- **Payment** — to'lov: buyurtmaga bog'langan, turi (naqd / karta / o'tkazma), summa, avansmi, kim qabul qildi, BUXGALTER tasdig'i.
- **Document** — hujjat: shartnoma, hisob-faktura, yuk xati, akt. HTML shablondan PDF.
- **Notification** — kimning statusiga ish kelsa, o'shanga xabar (ilova ichida + Telegram bot).
- **AuditLog** — kim, qachon, nimani o'zgartirdi (narx, status, to'lov — majburiy).

---

## 3. Buyurtma bosqichlari (status)

```
QORALAMA → TASDIQLANGAN → AVANS_KUTILMOQDA → YIG'ILMOQDA → JO'NATILDI → YAKUNLANDI
                                    ↘ BEKOR (istalgan bosqichda, sabab bilan)
```

| Status | Kim o'tkazadi | Shart |
|---|---|---|
| QORALAMA → TASDIQLANGAN | SOTUVCHI | Mijoz narxga rozi |
| TASDIQLANGAN → AVANS_KUTILMOQDA | avtomatik | Shartnoma yaratildi |
| AVANS_KUTILMOQDA → YIG'ILMOQDA | BUXGALTER | Avans (standart **30%**) tasdiqlangan. Ungacha ombor ish boshlamaydi |
| YIG'ILMOQDA → JO'NATILDI | OMBORCHI | Hamma qator yig'ilgan, qoldiqdan chiqim qilingan |
| JO'NATILDI → YAKUNLANDI | SOTUVCHI / BUXGALTER | To'liq to'langan yoki qarz rasmiylashtirilgan, akt imzolangan |

Har status o'zgarishida keyingi mas'ul rolga bildirishnoma boradi.

---

## 4. Biznes qoidalari

- **Sotuv narxi** = tannarx × (1 + ustama). Standart ustama **10%**, korxona va toifa darajasida sozlanadi. Sotuvchi chegirma bersa, tannarxdan pastga tushsa — ogohlantirish va OWNER tasdig'i.
- **Avans** standart 30%, korxona sozlamasida o'zgartiriladi. 0% bo'lsa, bosqich o'tkazib yuboriladi.
- **Tannarx** kirimda tovar bilan birga kiritiladi. Bir tovar har xil narxda kelsa, ombordagi qoldiq tannarxi avtomatik **o'rtacha tortilgan** usulda yangilanadi (masalan: 10 dona × 100 000 + 10 dona × 120 000 → 110 000). Foydalanuvchi qo'shimcha hisob qilmaydi.
- **Manfiy qoldiq** taqiqlangan: yig'ishda tovar yetmasa — "yetishmayotgan tovarlar" ro'yxati chiqadi va undan kirim buyurtmasi (Purchase) yaratish mumkin.
- **Pul** faqat UZS'da, butun so'mda saqlanadi (float emas). Valyuta kursi yo'q.
- **QQS hisoblanmaydi.**
- **Nasiya** bor: mijozga limit qo'yiladi; buyurtma qisman to'lov bilan yakunlanishi mumkin, qolgani Debt bo'ladi; muddatdan 3 kun oldin va muddat o'tganda sotuvchi va OWNER'ga eslatma.
- O'chirish yo'q: hujjat va to'lovlar faqat bekor qilinadi (sabab bilan), AuditLog'da qoladi.

---

## 5. Ekranlar (mobile-first)

1. Kirish (telefon + parol)
2. Bosh sahifa: bugungi ishlarim (rolga qarab), ogohlantirishlar (kam qolgan tovarlar, kutilayotgan avanslar)
3. Tovarlar: ro'yxat, qidiruv, kartochka (qoldiq, harakatlar tarixi)
4. Kirim: yangi kirim, xarajatlar, tannarx hisobi
5. Buyurtmalar: ro'yxat (status bo'yicha filtr), yangi buyurtma, buyurtma sahifasi (bosqichlar chizig'i)
6. Mijozlar: ro'yxat, kartochka (buyurtmalar, qarzdorlik)
7. To'lovlar: qabul qilish, tasdiqlash navbati (BUXGALTER)
8. Hujjatlar: shablonlar, PDF ko'rish/yuklab olish
9. Hisobotlar: savdo, foyda (faqat OWNER/BUXGALTER), qoldiq, qarzdorlar
10. Sozlamalar: korxona, xodimlar va rollar, ustama/avans

Dizayn: minimal, kam element. 360 px kenglikda ishlaydi, asosiy amallar bir qo'l bilan bajariladi.

Til: standart **o'zbekcha (lotin)**, sozlamada **inglizcha** va **ruscha**ga almashtiriladi (har foydalanuvchi o'zi tanlaydi). Hamma matn tarjima fayllarida (i18n), kodda qattiq yozilmaydi.

---

## 6. Taklif qilingan stack

- Frontend: React + Vite + TypeScript, MUI, TanStack Query.
- Backend: NestJS 11 + Prisma + PostgreSQL (sizning boshqa loyihalaringizdagi stack).
- Bildirishnoma: grammY Telegram bot.
- PDF: HTML shablon → PDF.
- Deploy: Docker Compose + Caddy (VPS'da).

Mahalliy kompyuter kuchsiz (4 GB), shuning uchun ishlab chiqish asosan bulutdagi Claude Code sessiyalarida (GitHub repo orqali), sinov esa telefondan brauzerda bo'ladi.

---

## 7. Bosqichlar

| # | Bosqich | Natija |
|---|---|---|
| 0 | Spec (shu fayl) | SAVOLlarga javob, v1.0 |
| 1 | Skelet | Monorepo, auth, rollar, Organization/User, CI |
| 2 | Tovar va ombor | Product, Category, Purchase + xarajatlar, StockMovement, qoldiq |
| 3 | Savdo | Customer, SalesOrder bosqichlari, Payment, avans qoidasi |
| 4 | Hujjat va xabar | PDF shablonlar, Telegram bildirishnomalar |
| 5 | Hisobotlar | Savdo, foyda, qoldiq, qarzdorlar |
| 6 | Deploy | Docker, Caddy, zaxira nusxa |
| 7 | Shtrix-kod | Telefon kamerasi bilan skanerlash (kirim, yig'ish, qidiruv) — qolgan hamma bosqich tayyor bo'lgach |

MVP'ga kirmaydi: 1C bilan integratsiya, Soliq e-faktura (my.soliq), bir nechta filial va ombor, onlayn do'kon, valyuta, QQS.

---

## 8. Qarorlar (2026-10-27)

1. Birinchi mijoz — **Atoyo**.
2. Tannarx kirimda tovar bilan birga kiritiladi; har xil narxdagi kirimlar o'rtacha tortilgan usulda avtomatik birlashtiriladi.
3. Faqat so'm.
4. QQS yo'q.
5. Nasiya bor (limit, muddat, eslatma).
6. Shtrix-kod — bor, lekin oxirgi (7-) bosqichda.
7. Til: o'zbekcha standart, inglizcha va ruscha almashtiriladi.
8. Repo — **Abdullohkhan** GitHub akkauntida. Bu akkaunt keyinchalik tozalanadigan bo'lsa, repo avval Abdulmajidkhan007 ga Transfer qilinadi.
