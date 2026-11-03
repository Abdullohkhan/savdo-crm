import type { DebtDto, OrderListItemDto, PaymentDto } from '@savdo/shared';
import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney, formatQty } from '@/lib/format';
import { useAppSelector } from '@/store';
import { useDashboardQuery, useProductsQuery } from '@/store/api';

export function HomePage() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;
  return (
    <div className="grid grid-cols-1 gap-4">
      <WelcomeCard name={user.name} role={user.role} />
      <Tasks />
      <LowStockCard />
    </div>
  );
}

function WelcomeCard({ name, role }: { name: string; role: string }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.welcome', { name })}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('home.role', { role: t(`roles.${role}`) })}
        </p>
      </CardHeader>
    </Card>
  );
}

/** Rolga qarab bugungi ishlar */
function Tasks() {
  const { t } = useTranslation();
  const { data } = useDashboardQuery();
  if (!data) return null;
  const sections: ReactNode[] = [];
  const orderList = (key: string, title: string, items?: OrderListItemDto[], link?: string) => {
    if (!items || items.length === 0) return;
    sections.push(
      <TaskCard key={key} title={title} count={items.length} link={link}>
        {items.slice(0, 5).map((o) => (
          <li key={o.id}>
            <Link
              to={`/orders/${o.id}`}
              className="flex justify-between gap-2 py-2 hover:underline"
            >
              <span className="truncate">
                {t('orders.numberShort', { number: o.number })} · {o.customerName}
              </span>
              <span className="shrink-0 text-muted-foreground">{formatMoney(o.total)}</span>
            </Link>
          </li>
        ))}
      </TaskCard>,
    );
  };
  orderList('approve', t('home.priceApprovals'), data.priceApprovals);
  if (data.paymentsToConfirm?.length) {
    sections.push(
      <TaskCard
        key="pay"
        title={t('home.paymentsToConfirm')}
        count={data.paymentsToConfirm.length}
        link="/payments?status=KUTILMOQDA"
      >
        {data.paymentsToConfirm.slice(0, 5).map((p: PaymentDto) => (
          <li key={p.id}>
            <Link
              to={`/orders/${p.orderId}`}
              className="flex justify-between gap-2 py-2 hover:underline"
            >
              <span className="truncate">
                {t('orders.numberShort', { number: p.orderNumber })} · {p.customerName}
              </span>
              <span className="shrink-0">{formatMoney(p.amount)}</span>
            </Link>
          </li>
        ))}
      </TaskCard>,
    );
  }
  orderList('pick', t('home.toPick'), data.toPick, '/orders?status=YIGILMOQDA');
  orderList(
    'adv',
    t('home.awaitingAdvance'),
    data.awaitingAdvance,
    '/orders?status=AVANS_KUTILMOQDA',
  );
  orderList('done', t('home.toComplete'), data.toComplete, '/orders?status=JONATILDI');
  orderList('drafts', t('home.drafts'), data.drafts, '/orders?status=QORALAMA');
  if (data.debtsDue?.length) {
    sections.push(
      <TaskCard key="debts" title={t('home.debtsDue')} count={data.debtsDue.length}>
        {data.debtsDue.slice(0, 5).map((d: DebtDto) => (
          <li key={d.id}>
            <Link
              to={`/orders/${d.orderId}`}
              className="flex justify-between gap-2 py-2 hover:underline"
            >
              <span className="truncate">
                {d.customerName} · {d.dueDate}{' '}
                {d.isOverdue && <Badge tone="danger">{t('debts.overdue')}</Badge>}
              </span>
              <span className="shrink-0">{formatMoney(d.remaining)}</span>
            </Link>
          </li>
        ))}
      </TaskCard>,
    );
  }
  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('home.noTasks')}</p>;
  }
  return <>{sections}</>;
}

function TaskCard({
  title,
  count,
  link,
  children,
}: {
  title: string;
  count: number;
  link?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>{title}</span>
          <Badge>{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">{children}</ul>
        {link && count > 5 && (
          <Link to={link} className="mt-2 inline-block text-sm underline">
            {t('home.showAll')}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function LowStockCard() {
  const { t } = useTranslation();
  const { data = [] } = useProductsQuery({ low: true });
  if (data.length === 0) return null;
  return (
    <Card className="border-amber-300 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="size-5 text-amber-600 dark:text-amber-400" />
          {t('home.lowStock', { count: data.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {data.slice(0, 5).map((p) => (
            <li key={p.id}>
              <Link
                to={`/products/${p.id}`}
                className="flex justify-between gap-2 py-2 hover:underline"
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatQty(p.stock)} / {formatQty(p.minStock)} {t(`units.${p.unit}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {data.length > 5 && (
          <Link to="/products?low=1" className="mt-2 inline-block text-sm underline">
            {t('home.showAll')}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
