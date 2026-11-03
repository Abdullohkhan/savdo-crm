import { PAYMENT_CONFIRM_ROLES, PAYMENT_STATUSES, type PaymentStatus } from '@savdo/shared';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { PageHeader } from '@/components/common';
import { Select } from '@/components/ui/select';
import { useAppSelector } from '@/store';
import { usePaymentsQuery } from '@/store/api';
import { PaymentRow } from './OrderPage';

export function PaymentsPage() {
  const { t } = useTranslation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const canConfirm = !!role && PAYMENT_CONFIRM_ROLES.includes(role);
  const [params, setParams] = useSearchParams();
  // Buxgalter uchun standart — tasdiqlash navbati
  const raw = params.get('status') ?? (canConfirm ? 'KUTILMOQDA' : '');
  const status = (PAYMENT_STATUSES as readonly string[]).includes(raw)
    ? (raw as PaymentStatus)
    : undefined;
  const { data = [], isFetching } = usePaymentsQuery({ status });

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title={t('payments.title')} />
      <Select
        aria-label={t('common.status')}
        className="sm:w-64"
        value={status ?? 'all'}
        onChange={(e) => setParams({ status: e.target.value }, { replace: true })}
      >
        <option value="all">{t('payments.all')}</option>
        {PAYMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`paymentStatus.${s}`)}
          </option>
        ))}
      </Select>
      {data.length === 0 ? (
        <p className="text-muted-foreground">
          {isFetching ? t('app.loading') : t('payments.empty')}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border px-3 text-sm">
          {data.map((p) => (
            <PaymentRow key={p.id} payment={p} canConfirm={canConfirm} showOrder />
          ))}
        </ul>
      )}
    </div>
  );
}
