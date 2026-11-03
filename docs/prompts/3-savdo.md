# 3-bosqich — Savdo: mijoz, buyurtma, to'lov, nasiya

Ishlatish: yangi Claude Code sessiyasi → repo `Abdullohkhan/savdo-crm` → yozing:
**`docs/prompts/3-savdo.md` ni bajar**

---

Avval `CLAUDE.md`, `docs/spec.md`, `docs/HOLAT.md` ni o'qi. 1–2-bosqich tuzilmasi va uslubini davom ettir.

## 1. Ma'lumotlar (Prisma)
- `Customer` — turi (`JISMONIY | YURIDIK`), nom, telefon, INN, manzil, `creditLimit` (so'm, 0 — nasiya yo'q), `isActive`.
  Qarzdorlik saqlanmaydi — ochiq `Debt` lardan hisoblanadi.
- `SalesOrder` — korxona ichida raqam, mijoz, mas'ul sotuvchi, status, izoh, `advancePercent` (tasdiqlash paytidagi nusxa),
  `priceApprovedById` (tannarxdan past narxga OWNER ruxsati), vaqtlar, bekor qilish sababi.
  `SalesOrderLine` — tovar, miqdor, `listPrice` (o'sha paytdagi sotuv narxi), `price` (chegirmadan keyingi birlik narxi),
  `picked`, `unitCost` (jo'natishda tannarx nusxasi — faqat OWNER/BUXGALTER).
  `OrderStatusLog` — from → to, kim, qachon, sabab.
- `Payment` — buyurtmaga bog'liq; usul (`NAQD | KARTA | OTKAZMA`), summa, `isAdvance`, kim qabul qildi,
  status `KUTILMOQDA → TASDIQLANGAN | RAD_ETILGAN` (BUXGALTER/OWNER, rad etish sabab bilan). O'chirish yo'q.
- `Debt` — buyurtma (bittaga bitta), mijoz, summa, qolgan qarz, to'lov muddati, yopilgan vaqt.
- Pul — butun so'm (`Int` birlik narxlari, `BigInt` summalar).

## 2. Buyurtma bosqichlari (spec 3-bo'lim)
```
QORALAMA → TASDIQLANGAN → AVANS_KUTILMOQDA → YIG'ILMOQDA → JO'NATILDI → YAKUNLANDI
                                    ↘ BEKOR (sabab bilan)
```
- QORALAMA → TASDIQLANGAN: SOTUVCHI/OWNER. Tannarxdan past narxli qator bo'lsa — avval OWNER tasdig'i.
- TASDIQLANGAN → AVANS_KUTILMOQDA: avtomatik (shartnoma PDF — 4-bosqich). Avans 0% bo'lsa — to'g'ri YIG'ILMOQDA.
- AVANS_KUTILMOQDA → YIG'ILMOQDA: BUXGALTER avans to'lov(lar)ini tasdiqlab, jami ≥ talab qilingan avans bo'lganda avtomatik.
- YIG'ILMOQDA → JO'NATILDI: OMBORCHI; hamma qator yig'ilgan (`picked`), qoldiq yetadi → `CHIQIM` harakatlari.
  Yetmasa — "yetishmayotgan tovarlar" ro'yxati va undan kirim qoralamasi yaratish.
- JO'NATILDI → YAKUNLANDI: SOTUVCHI/BUXGALTER/OWNER. To'liq to'langan yoki qolgani `Debt` (muddat bilan, mijoz limiti doirasida).
  Tasdiqlanmagan to'lov bo'lsa — avval tasdiqlanadi. Akt PDF — 4-bosqich.
- BEKOR: istalgan bosqichda (YAKUNLANDI dan tashqari), sabab bilan. Jo'natilgan bo'lsa — faqat OWNER, tovar `QAYTARISH` bilan omborga qaytadi.
- Har o'tish `OrderStatusLog` va `AuditLog` ga yoziladi. Bildirishnomalar — 4-bosqich; hozircha bosh sahifada "bugungi ishlarim".

## 3. Qoidalar
- Chegirma: sotuvchi narxni sotuv narxidan pastga tushirishi mumkin; tannarxdan past bo'lsa — ogohlantirish (tannarx raqami ko'rsatilmaydi) va OWNER tasdig'i.
- Avans summasi = jami × avans% (yuqoriga yaxlitlanadi).
- To'lov qolgan summadan oshmasin (kutilayotganlar ham hisobga olinadi). Nasiyaga to'lov `Debt` qoldig'ini kamaytiradi, 0 bo'lsa yopiladi.
- Ko'rinish: SOTUVCHI faqat o'z buyurtmalarini, OMBORCHI YIG'ILMOQDA va undan keyingilarini ko'radi; OWNER/BUXGALTER — hammasini.
- Tannarx, foyda — faqat OWNER/BUXGALTER javobida.
- Parallel o'tishlar va jo'natishda qoldiq buzilmasin (tranzaksiya + qulflash).

## 4. Web
- Menyu: telefonda pastki 4 ta asosiy + "Menyu" (qolganlari). Kompyuterda yon panelda hammasi.
- Mijozlar: ro'yxat, qidiruv, kartochka (buyurtmalar, qarzdorlik), qo'shish/tahrirlash.
- Buyurtmalar: ro'yxat (status filtri), yangi buyurtma (mijoz, tovarlar, narx/chegirma, jami), buyurtma sahifasi
  (bosqichlar chizig'i, rolga qarab amallar: tasdiqlash, narxga ruxsat, to'lov qabul qilish, yig'ish, yetishmayotganlar → kirim, jo'natish, yakunlash, bekor qilish).
- To'lovlar: tasdiqlash navbati (BUXGALTER), ro'yxat.
- Bosh sahifa: rolga qarab bugungi ishlar (kutilayotgan avanslar, tasdiqlanadigan to'lovlar, yig'iladigan buyurtmalar, muddati o'tgan nasiyalar).

## 5. Testlar
- API: to'liq oqim (qoralama → … → yakunlandi), avans 0% bo'lsa bosqich o'tkaziladi, avans yetmasa ombor ishlay olmaydi,
  tannarxdan past narx OWNER tasdig'isiz tasdiqlanmaydi, qoldiq yetmasa jo'natilmaydi va kirim qoralamasi yaratiladi,
  nasiya limiti, ortiqcha to'lov rad etiladi, nasiyaga to'lov qarzni yopadi, jo'natilgandan keyin bekor — qoldiq qaytadi,
  SOTUVCHI boshqa sotuvchi buyurtmasini ko'rmaydi, tannarx yashirin, boshqa korxona ma'lumoti ko'rinmaydi.
- Web: rolga qarab amal tugmalari, buyurtma jami va chegirma hisobi, menyu.

## 6. Yakun
- typecheck + lint + test + build, `docs/HOLAT.md`, commit, push. Hisobot qisqa.

## Qoidalar
- Spec'da yo'q narsani qo'shma; noaniq joy — HOLAT.md ga "SAVOL:" qilib yoz va davom et.
