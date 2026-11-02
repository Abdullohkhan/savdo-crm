import { canSeeCost, PURCHASE_STATUSES, type PurchaseStatus } from '@savdo/shared';
import { Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/common';
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { formatDate, formatMoney } from '@/lib/format';
import { useAppSelector } from '@/store';
import { usePurchasesQuery } from '@/store/api';

export function PurchasesPage() {
  const { t } = useTranslation();
  const showCost = canSeeCost(useAppSelector((s) => s.auth.user?.role));
  const [params, setParams] = useSearchParams();
  const raw = params.get('status') ?? '';
  const status = (PURCHASE_STATUSES as readonly string[]).includes(raw)
    ? (raw as PurchaseStatus)
    : undefined;
  const { data = [], isFetching } = usePurchasesQuery(status);

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={t('purchases.title')}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link to="/suppliers">
                <Users />
                {t('suppliers.title')}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/purchases/new">
                <Plus />
                {t('purchases.new')}
              </Link>
            </Button>
          </>
        }
      />
      <Select
        aria-label={t('common.status')}
        className="sm:w-60"
        value={status ?? ''}
        onChange={(e) =>
          setParams(e.target.value ? { status: e.target.value } : {}, { replace: true })
        }
      >
        <option value="">{t('purchases.allStatuses')}</option>
        {PURCHASE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`purchaseStatus.${s}`)}
          </option>
        ))}
      </Select>
      {data.length === 0 ? (
        <p className="text-muted-foreground">
          {isFetching ? t('app.loading') : t('purchases.empty')}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {data.map((p) => (
            <li key={p.id}>
              <Link
                to={`/purchases/${p.id}`}
                className="flex items-center gap-3 p-3 hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {t('purchases.numberShort', { number: p.number })}{' '}
                    <PurchaseStatusBadge status={p.status} />
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {formatDate(p.createdAt)} · {p.supplierName ?? t('purchases.noSupplier')} ·{' '}
                    {t('purchases.lineCount', { count: p.lineCount })}
                  </p>
                </div>
                {showCost && p.total !== undefined && (
                  <p className="shrink-0 font-medium">{formatMoney(p.total)}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
