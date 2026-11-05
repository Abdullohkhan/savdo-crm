import type { Locale, NotificationType } from '@savdo/shared';

/** Telegram xabarlari matni (ilova ichida — web i18n `notifications.<type>`) */
type Params = Record<string, string | number>;

const T: Record<Locale, Record<NotificationType, string>> = {
  uz: {
    ORDER_AWAITING_ADVANCE:
      'Buyurtma #{orderNumber} ({customerName}) avans kutmoqda: {advance} so‘m.',
    ORDER_TO_PICK: 'Buyurtma #{orderNumber} ({customerName}) yig‘ishga tayyor.',
    ORDER_SHIPPED:
      'Buyurtma #{orderNumber} ({customerName}) jo‘natildi. Aktni imzolatib, yakunlang.',
    PAYMENT_TO_CONFIRM: 'Buyurtma #{orderNumber} bo‘yicha {amount} so‘m to‘lov tasdiq kutmoqda.',
    PAYMENT_REJECTED: 'Buyurtma #{orderNumber} bo‘yicha {amount} so‘m to‘lov rad etildi: {reason}',
    PRICE_APPROVAL: 'Buyurtma #{orderNumber} ({sellerName}): tannarxdan past narxga ruxsat kerak.',
    DEBT_DUE_SOON:
      'Nasiya muddati yaqin: {customerName}, buyurtma #{orderNumber}, qarz {remaining} so‘m, muddat {dueDate}.',
    DEBT_OVERDUE:
      'Nasiya muddati o‘tdi: {customerName}, buyurtma #{orderNumber}, qarz {remaining} so‘m, muddat {dueDate}.',
    LOW_STOCK: 'Kam qolgan tovarlar: {count} ta.',
  },
  en: {
    ORDER_AWAITING_ADVANCE: 'Order #{orderNumber} ({customerName}) awaits advance: {advance} UZS.',
    ORDER_TO_PICK: 'Order #{orderNumber} ({customerName}) is ready for picking.',
    ORDER_SHIPPED:
      'Order #{orderNumber} ({customerName}) shipped. Get the act signed and complete it.',
    PAYMENT_TO_CONFIRM: 'Payment of {amount} UZS for order #{orderNumber} awaits confirmation.',
    PAYMENT_REJECTED: 'Payment of {amount} UZS for order #{orderNumber} was rejected: {reason}',
    PRICE_APPROVAL: 'Order #{orderNumber} ({sellerName}): below-cost price needs approval.',
    DEBT_DUE_SOON:
      'Credit due soon: {customerName}, order #{orderNumber}, debt {remaining} UZS, due {dueDate}.',
    DEBT_OVERDUE:
      'Credit overdue: {customerName}, order #{orderNumber}, debt {remaining} UZS, due {dueDate}.',
    LOW_STOCK: 'Low stock products: {count}.',
  },
  ru: {
    ORDER_AWAITING_ADVANCE: 'Заказ #{orderNumber} ({customerName}) ожидает аванс: {advance} сум.',
    ORDER_TO_PICK: 'Заказ #{orderNumber} ({customerName}) готов к сборке.',
    ORDER_SHIPPED:
      'Заказ #{orderNumber} ({customerName}) отгружен. Подпишите акт и завершите заказ.',
    PAYMENT_TO_CONFIRM: 'Оплата {amount} сум по заказу #{orderNumber} ждёт подтверждения.',
    PAYMENT_REJECTED: 'Оплата {amount} сум по заказу #{orderNumber} отклонена: {reason}',
    PRICE_APPROVAL:
      'Заказ #{orderNumber} ({sellerName}): нужна санкция на цену ниже себестоимости.',
    DEBT_DUE_SOON:
      'Скоро срок долга: {customerName}, заказ #{orderNumber}, долг {remaining} сум, срок {dueDate}.',
    DEBT_OVERDUE:
      'Долг просрочен: {customerName}, заказ #{orderNumber}, долг {remaining} сум, срок {dueDate}.',
    LOW_STOCK: 'Товаров с низким остатком: {count}.',
  },
};

export function formatMessage(locale: Locale, type: NotificationType, params: Params): string {
  return T[locale][type].replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''));
}

export const LINK_TEXT: Record<
  Locale,
  Record<'linked' | 'invalid' | 'expired' | 'help', string>
> = {
  uz: {
    linked: 'Telegram ulandi. Endi bildirishnomalar shu yerga keladi.',
    invalid: 'Kod noto‘g‘ri. Ilovada Sozlamalar → “Telegram’ni ulash” dan yangi kod oling.',
    expired: 'Kod muddati o‘tgan. Ilovadan yangi kod oling.',
    help: 'Ulash uchun ilovadagi kodni yuboring: /start KOD',
  },
  en: {
    linked: 'Telegram linked. Notifications will arrive here.',
    invalid: 'Invalid code. Get a new one in the app: Settings → “Link Telegram”.',
    expired: 'The code has expired. Get a new one in the app.',
    help: 'To link, send the code from the app: /start CODE',
  },
  ru: {
    linked: 'Telegram подключён. Уведомления будут приходить сюда.',
    invalid: 'Неверный код. Получите новый в приложении: Настройки → «Подключить Telegram».',
    expired: 'Срок действия кода истёк. Получите новый в приложении.',
    help: 'Чтобы подключить, отправьте код из приложения: /start КОД',
  },
};

export const OPEN_TEXT: Record<Locale, string> = { uz: 'Ochish', en: 'Open', ru: 'Открыть' };
