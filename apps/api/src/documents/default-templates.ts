import type { DocLocale, DocumentType } from '@savdo/shared';

/**
 * Standart shablonlar (Savdo CRM'ning o'z matni). OWNER keyin tahrirlaydi.
 * Qo'llab-quvvatlanadigan HTML: h1–h3, p, div, b/strong, i/em, u, br, hr, table (colspan, width), ul/ol/li.
 * Tekislash: style="text-align:right|center" yoki class="right|center". Ramkasiz jadval: class="plain".
 */

const header = (title: string, numberLabel: string, dateLabel: string) => `
<h1 class="center">${title} № {{document.number}}</h1>
<table class="plain">
  <tr><td>${numberLabel}</td><td class="right">${dateLabel}: {{document.date}}</td></tr>
</table>`;

const partiesUz = `
<table class="plain">
  <tr>
    <td width="50%"><b>Sotuvchi:</b> {{org.name}}<br>
      {{#if org.inn}}STIR: {{org.inn}}<br>{{/if}}
      {{#if org.address}}Manzil: {{org.address}}<br>{{/if}}
      {{#if org.phone}}Tel.: {{org.phone}}<br>{{/if}}
      {{#if org.bankAccount}}H/r: {{org.bankAccount}}, {{org.bankName}}, MFO {{org.bankMfo}}{{/if}}</td>
    <td width="50%"><b>Xaridor:</b> {{customer.name}}<br>
      {{#if customer.inn}}STIR: {{customer.inn}}<br>{{/if}}
      {{#if customer.address}}Manzil: {{customer.address}}<br>{{/if}}
      {{#if customer.phone}}Tel.: {{customer.phone}}{{/if}}</td>
  </tr>
</table>`;

const partiesRu = `
<table class="plain">
  <tr>
    <td width="50%"><b>Продавец:</b> {{org.name}}<br>
      {{#if org.inn}}ИНН: {{org.inn}}<br>{{/if}}
      {{#if org.address}}Адрес: {{org.address}}<br>{{/if}}
      {{#if org.phone}}Тел.: {{org.phone}}<br>{{/if}}
      {{#if org.bankAccount}}Р/с: {{org.bankAccount}}, {{org.bankName}}, МФО {{org.bankMfo}}{{/if}}</td>
    <td width="50%"><b>Покупатель:</b> {{customer.name}}<br>
      {{#if customer.inn}}ИНН: {{customer.inn}}<br>{{/if}}
      {{#if customer.address}}Адрес: {{customer.address}}<br>{{/if}}
      {{#if customer.phone}}Тел.: {{customer.phone}}{{/if}}</td>
  </tr>
</table>`;

const linesTable = (h: [string, string, string, string, string, string], totalLabel: string) => `
<table>
  <thead>
    <tr><th width="6%">${h[0]}</th><th>${h[1]}</th><th width="10%">${h[2]}</th><th width="12%" class="right">${h[3]}</th><th width="16%" class="right">${h[4]}</th><th width="18%" class="right">${h[5]}</th></tr>
  </thead>
  <tbody>
    {{#each lines}}
    <tr><td>{{n}}</td><td>{{name}}</td><td>{{unit}}</td><td class="right">{{quantity}}</td><td class="right">{{price}}</td><td class="right">{{total}}</td></tr>
    {{/each}}
    <tr><td colspan="5" class="right"><b>${totalLabel}</b></td><td class="right"><b>{{total}}</b></td></tr>
  </tbody>
</table>`;

const LINES_UZ: [string, string, string, string, string, string] = [
  '№',
  'Tovar nomi',
  'Birlik',
  'Miqdor',
  'Narx',
  'Summa',
];
const LINES_RU: [string, string, string, string, string, string] = [
  '№',
  'Наименование',
  'Ед.',
  'Кол-во',
  'Цена',
  'Сумма',
];

const signsUz = `
<table class="plain">
  <tr>
    <td width="50%"><b>Sotuvchi</b><br>{{org.director}}<br><br>____________________ (imzo)</td>
    <td width="50%"><b>Xaridor</b><br>{{customer.name}}<br><br>____________________ (imzo)</td>
  </tr>
</table>`;

const signsRu = `
<table class="plain">
  <tr>
    <td width="50%"><b>Продавец</b><br>{{org.director}}<br><br>____________________ (подпись)</td>
    <td width="50%"><b>Покупатель</b><br>{{customer.name}}<br><br>____________________ (подпись)</td>
  </tr>
</table>`;

const UZ: Record<DocumentType, { name: string; html: string }> = {
  SHARTNOMA: {
    name: 'Oldi-sotdi shartnomasi',
    html: `${header('OLDI-SOTDI SHARTNOMASI', 'Toshkent sh.', 'Sana')}
${partiesUz}
<h3>1. Shartnoma predmeti</h3>
<p>Sotuvchi quyidagi tovarlarni Xaridorga sotadi, Xaridor ularni qabul qilib, haqini to‘laydi (buyurtma № {{order.number}}, {{order.date}}):</p>
${linesTable(LINES_UZ, 'Jami:')}
<p>Shartnoma summasi: <b>{{total}} so‘m</b> ({{totalWords}}). QQS hisoblanmaydi.</p>
<h3>2. To‘lov tartibi</h3>
{{#if advancePercent}}
<p>Xaridor oldindan {{advancePercent}}% avans to‘laydi: <b>{{advance}} so‘m</b> ({{advanceWords}}). Qolgan summa tovar topshirilganda yoki kelishilgan muddatda to‘lanadi.</p>
{{else}}
<p>To‘lov tovar topshirilganda yoki kelishilgan muddatda amalga oshiriladi.</p>
{{/if}}
<h3>3. Tovarni topshirish</h3>
<p>Tovar avans to‘langandan keyin tayyorlanadi va yuk xati hamda topshirish-qabul qilish dalolatnomasi bilan topshiriladi.</p>
<h3>4. Boshqa shartlar</h3>
<p>Nizolar muzokara yo‘li bilan, kelishilmasa — O‘zbekiston Respublikasi qonunchiligiga muvofiq hal qilinadi. Shartnoma imzolangan kundan kuchga kiradi.</p>
<p>Mas’ul xodim: {{seller.name}}</p>
${signsUz}`,
  },
  HISOB_FAKTURA: {
    name: 'Hisob-faktura',
    html: `${header('HISOB-FAKTURA', '{{#if contract.number}}Shartnoma № {{contract.number}}, {{contract.date}}{{/if}}', 'Sana')}
${partiesUz}
${linesTable(LINES_UZ, 'Jami:')}
<p>Jami to‘lov uchun: <b>{{total}} so‘m</b> ({{totalWords}}). QQS hisoblanmaydi.</p>
<p>To‘langan: {{paid}} so‘m. Qoldiq: {{remaining}} so‘m.</p>
${signsUz}`,
  },
  YUK_XATI: {
    name: 'Yuk xati',
    html: `${header('YUK XATI', 'Buyurtma № {{order.number}}', 'Sana')}
${partiesUz}
${linesTable(LINES_UZ, 'Jami:')}
<p>Jami: <b>{{total}} so‘m</b> ({{totalWords}}).</p>
<table class="plain">
  <tr>
    <td width="50%"><b>Topshirdi</b><br>{{org.name}}<br><br>____________________ (imzo)</td>
    <td width="50%"><b>Qabul qildi</b><br>{{customer.name}}<br><br>____________________ (imzo)</td>
  </tr>
</table>`,
  },
  AKT: {
    name: 'Topshirish-qabul qilish dalolatnomasi',
    html: `${header('TOPSHIRISH-QABUL QILISH DALOLATNOMASI', '{{#if contract.number}}Shartnoma № {{contract.number}}, {{contract.date}}{{/if}}', 'Sana')}
${partiesUz}
<p>Biz, quyida imzo chekuvchilar, Sotuvchi quyidagi tovarlarni topshirganini, Xaridor esa ularni to‘liq, butun va sifatli holda qabul qilganini tasdiqlaymiz:</p>
${linesTable(LINES_UZ, 'Jami:')}
<p>Jami: <b>{{total}} so‘m</b> ({{totalWords}}). Tomonlarning bir-biriga sifat va miqdor bo‘yicha e’tirozi yo‘q.</p>
${signsUz}`,
  },
};

const RU: Record<DocumentType, { name: string; html: string }> = {
  SHARTNOMA: {
    name: 'Договор купли-продажи',
    html: `${header('ДОГОВОР КУПЛИ-ПРОДАЖИ', 'г. Ташкент', 'Дата')}
${partiesRu}
<h3>1. Предмет договора</h3>
<p>Продавец продаёт, а Покупатель принимает и оплачивает следующие товары (заказ № {{order.number}} от {{order.date}}):</p>
${linesTable(LINES_RU, 'Итого:')}
<p>Сумма договора: <b>{{total}} сум</b> ({{totalWords}}). Без НДС.</p>
<h3>2. Порядок оплаты</h3>
{{#if advancePercent}}
<p>Покупатель вносит предоплату {{advancePercent}}%: <b>{{advance}} сум</b> ({{advanceWords}}). Остаток оплачивается при передаче товара или в согласованный срок.</p>
{{else}}
<p>Оплата производится при передаче товара или в согласованный срок.</p>
{{/if}}
<h3>3. Передача товара</h3>
<p>Товар готовится после поступления предоплаты и передаётся по накладной и акту приёма-передачи.</p>
<h3>4. Прочие условия</h3>
<p>Споры решаются путём переговоров, при недостижении согласия — в соответствии с законодательством Республики Узбекистан. Договор вступает в силу с момента подписания.</p>
<p>Ответственный сотрудник: {{seller.name}}</p>
${signsRu}`,
  },
  HISOB_FAKTURA: {
    name: 'Счёт-фактура',
    html: `${header('СЧЁТ-ФАКТУРА', '{{#if contract.number}}Договор № {{contract.number}} от {{contract.date}}{{/if}}', 'Дата')}
${partiesRu}
${linesTable(LINES_RU, 'Итого:')}
<p>Всего к оплате: <b>{{total}} сум</b> ({{totalWords}}). Без НДС.</p>
<p>Оплачено: {{paid}} сум. Остаток: {{remaining}} сум.</p>
${signsRu}`,
  },
  YUK_XATI: {
    name: 'Накладная',
    html: `${header('НАКЛАДНАЯ', 'Заказ № {{order.number}}', 'Дата')}
${partiesRu}
${linesTable(LINES_RU, 'Итого:')}
<p>Итого: <b>{{total}} сум</b> ({{totalWords}}).</p>
<table class="plain">
  <tr>
    <td width="50%"><b>Отпустил</b><br>{{org.name}}<br><br>____________________ (подпись)</td>
    <td width="50%"><b>Получил</b><br>{{customer.name}}<br><br>____________________ (подпись)</td>
  </tr>
</table>`,
  },
  AKT: {
    name: 'Акт приёма-передачи',
    html: `${header('АКТ ПРИЁМА-ПЕРЕДАЧИ', '{{#if contract.number}}Договор № {{contract.number}} от {{contract.date}}{{/if}}', 'Дата')}
${partiesRu}
<p>Мы, нижеподписавшиеся, подтверждаем, что Продавец передал, а Покупатель принял следующие товары в полном объёме, целостности и надлежащем качестве:</p>
${linesTable(LINES_RU, 'Итого:')}
<p>Итого: <b>{{total}} сум</b> ({{totalWords}}). Стороны претензий по качеству и количеству не имеют.</p>
${signsRu}`,
  },
};

export const DEFAULT_TEMPLATES: Record<
  DocLocale,
  Record<DocumentType, { name: string; html: string }>
> = { uz: UZ, ru: RU };
