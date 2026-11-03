import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Badge, ErrorText, PageHeader } from '@/components/common';
import { OrderStatusBadge } from '@/components/OrderStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatMoney } from '@/lib/format';
import { useAppSelector } from '@/store';
import {
  useCustomerQuery,
  useDebtsQuery,
  useOrdersQuery,
  useUpdateCustomerMutation,
} from '@/store/api';
import { SALES_ROLES } from '@savdo/shared';
import { CustomerForm } from './CustomersPage';

export function CustomerPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const { data: c, isLoading, error } = useCustomerQuery(id);
  const { data: orders = [] } = useOrdersQuery({ customerId: id });
  const { data: debts = [] } = useDebtsQuery({ customerId: id, filter: 'open' });
  const [editing, setEditing] = useState(false);
  const [update] = useUpdateCustomerMutation();

  if (isLoading) return <p className="text-muted-foreground">{t('app.loading')}</p>;
  if (!c) return <ErrorText error={error} />;

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={c.name}
        actions={
          <>
            {role && SALES_ROLES.includes(role) && c.isActive && (
              <Button asChild size="sm">
                <Link to={`/orders/new?customer=${c.id}`}>
                  <Plus />
                  {t('orders.new')}
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
              <Pencil />
              {t('common.edit')}
            </Button>
          </>
        }
      />
      {editing && <CustomerForm customer={c} onDone={() => setEditing(false)} />}

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t('customers.debt')}</p>
            <p className={c.hasOverdue ? 'font-semibold text-destructive' : 'font-semibold'}>
              {formatMoney(c.debt)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('customers.creditLimit')}</p>
            <p>{formatMoney(c.creditLimit)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('customers.type')}</p>
            <p>{t(`customerType.${c.type}`)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('customers.phone')}</p>
            <p>{c.phone || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('settings.inn')}</p>
            <p>{c.inn || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('settings.address')}</p>
            <p className="break-words">{c.address || '—'}</p>
          </div>
        </CardContent>
        <CardContent>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void update({ id: c.id, body: { isActive: !c.isActive } })}
          >
            {c.isActive ? t('common.deactivate') : t('common.activate')}
          </Button>
        </CardContent>
      </Card>

      {debts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('debts.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {debts.map((d) => (
                <li key={d.id}>
                  <Link to={`/orders/${d.orderId}`} className="flex justify-between gap-2 py-2">
                    <span>
                      {t('orders.numberShort', { number: d.orderNumber })} · {t('debts.due')}{' '}
                      {d.dueDate} {d.isOverdue && <Badge tone="danger">{t('debts.overdue')}</Badge>}
                    </span>
                    <span className="font-medium">{formatMoney(d.remaining)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('orders.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('orders.empty')}</p>
          ) : (
            <ul className="divide-y text-sm">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/orders/${o.id}`}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <span className="min-w-0">
                      {t('orders.numberShort', { number: o.number })}{' '}
                      <OrderStatusBadge status={o.status} />
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(o.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium">{formatMoney(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
