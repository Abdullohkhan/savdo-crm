import { ORDER_FLOW, type OrderStatus, type OrderStatusLogDto } from '@savdo/shared';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from './common';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const tone =
    status === 'YAKUNLANDI'
      ? 'ok'
      : status === 'BEKOR'
        ? 'danger'
        : status === 'AVANS_KUTILMOQDA'
          ? 'warn'
          : 'muted';
  return <Badge tone={tone}>{t(`orderStatus.${status}`)}</Badge>;
}

/** Bosqichlar chizig'i */
export function OrderStepper({
  status,
  history,
}: {
  status: OrderStatus;
  history: OrderStatusLogDto[];
}) {
  const { t } = useTranslation();
  const reached = new Map(history.map((h) => [h.to, h]));
  const cancelled = status === 'BEKOR';
  const currentIdx = ORDER_FLOW.indexOf(status);
  return (
    <ol className="grid gap-0" aria-label={t('orders.stages')}>
      {ORDER_FLOW.map((s, i) => {
        const log = reached.get(s);
        const done = !!log && (cancelled || i < currentIdx || s === 'YAKUNLANDI');
        const current = s === status;
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                  done && 'border-primary bg-primary text-primary-foreground',
                  current && !done && 'border-primary text-primary',
                  !done && !current && 'text-muted-foreground',
                )}
                aria-current={current ? 'step' : undefined}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              {i < ORDER_FLOW.length - 1 && <span className="h-4 w-px bg-border" />}
            </div>
            <div className="min-w-0 pb-1 text-sm">
              <p className={cn(current ? 'font-semibold' : !log && 'text-muted-foreground')}>
                {t(`orderStatus.${s}`)}
              </p>
              {log && (
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(log.createdAt)} · {log.userName}
                </p>
              )}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="mt-2 text-sm text-destructive">
          {t('orderStatus.BEKOR')}: {history.at(-1)?.reason}
        </li>
      )}
    </ol>
  );
}
