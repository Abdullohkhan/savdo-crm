import { ORDER_STATUSES, type OrderStatus, SALES_ROLES } from '@savdo/shared';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { Badge, PageHeader } from '@/components/common';
import { OrderStatusBadge } from '@/components/OrderStatus';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { formatDate, formatMoney } from '@/lib/format';
import { useAppSelector } from '@/store';
import { useOrdersQuery } from '@/store/api';

export function OrdersPage() {
  const { t } = useTranslation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const [params, setParams] = useSearchParams();
  const raw = params.get('status') ?? '';
  const status = (ORDER_STATUSES as readonly string[]).includes(raw)
    ? (raw as OrderStatus)
    : undefined;
  const { data = [], isFetching } = useOrdersQuery({ status });

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={t('orders.title')}
        actions={
          role &&
          SALES_ROLES.includes(role) && (
            <Button asChild size="sm">
              <Link to="/orders/new">
                <Plus />
                {t('orders.new')}
              </Link>
            </Button>
          )
        }
      />
      <Select
        aria-label={t('common.status')}
        className="sm:w-64"
        value={status ?? ''}
        onChange={(e) =>
          setParams(e.target.value ? { status: e.target.value } : {}, { replace: true })
        }
      >
        <option value="">{t('orders.allStatuses')}</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`orderStatus.${s}`)}
          </option>
        ))}
      </Select>
      {data.length === 0 ? (
        <p className="text-muted-foreground">{isFetching ? t('app.loading') : t('orders.empty')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {data.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`} className="flex items-center gap-3 p-3 hover:bg-accent">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {t('orders.numberShort', { number: o.number })}{' '}
                    <OrderStatusBadge status={o.status} />{' '}
                    {o.needsPriceApproval && <Badge tone="warn">{t('orders.needsApproval')}</Badge>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {o.customerName} · {formatDate(o.createdAt)} · {o.sellerName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium">{formatMoney(o.total)}</p>
                  {o.paidConfirmed > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t('orders.paid')}: {formatMoney(o.paidConfirmed)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
