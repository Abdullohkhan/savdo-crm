import {
  canSeeCost,
  COMPLETE_ROLES,
  ORDER_CANCEL_ROLES,
  type OrderDto,
  PAYMENT_CONFIRM_ROLES,
  PAYMENT_METHODS,
  PAYMENT_RECEIVE_ROLES,
  type PaymentDto,
  type PaymentMethod,
  PURCHASE_DRAFT_ROLES,
  Role,
  SALES_ROLES,
  WAREHOUSE_ROLES,
} from '@savdo/shared';
import { Pencil, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { Badge, ErrorText, PageHeader } from '@/components/common';
import { OrderStatusBadge, OrderStepper } from '@/components/OrderStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { formatDate, formatMoney, formatQty } from '@/lib/format';
import { useAppSelector } from '@/store';
import {
  useCancelOrderMutation,
  useCompleteOrderMutation,
  useConfirmPaymentMutation,
  useCreatePaymentMutation,
  useOrderActionMutation,
  useOrderQuery,
  useOrderShortagesQuery,
  usePickLineMutation,
  useRejectPaymentMutation,
  useShortagePurchaseMutation,
} from '@/store/api';

function has(role: Role | undefined, roles: readonly Role[]): boolean {
  return !!role && roles.includes(role);
}

export function OrderPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const { data: o, isLoading, error } = useOrderQuery(id);
  const [action, actionState] = useOrderActionMutation();

  if (isLoading) return <p className="text-muted-foreground">{t('app.loading')}</p>;
  if (!o) return <ErrorText error={error} />;

  const showCost = canSeeCost(role);
  const isDraft = o.status === 'QORALAMA';
  const canSell = has(role, SALES_ROLES);

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={t('orders.numberShort', { number: o.number })}
        actions={<OrderStatusBadge status={o.status} />}
      />

      <Card>
        <CardContent className="grid gap-1 pt-4 text-sm">
          <p>
            {t('orders.customer')}:{' '}
            {has(role, [Role.OWNER, Role.BUXGALTER, Role.SOTUVCHI]) ? (
              <Link className="underline" to={`/customers/${o.customerId}`}>
                {o.customerName}
              </Link>
            ) : (
              o.customerName
            )}
          </p>
          <p className="text-muted-foreground">
            {formatDate(o.createdAt)} · {t('orders.seller')}: {o.sellerName}
          </p>
          {o.note && <p>{o.note}</p>}
        </CardContent>
      </Card>

      {o.needsPriceApproval && (
        <Card className="border-amber-300 dark:border-amber-800">
          <CardContent className="flex flex-wrap items-center gap-3 pt-4 text-sm">
            <TriangleAlert className="size-5 text-amber-600 dark:text-amber-400" />
            <p className="flex-1">{t('orders.belowCostWarning')}</p>
            {role === Role.OWNER && (
              <Button
                size="sm"
                onClick={() => void action({ id: o.id, action: 'approve-price' })}
                disabled={actionState.isLoading}
              >
                {t('orders.approvePrice')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <LinesCard order={o} role={role} showCost={showCost} />

      {isDraft && canSell && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={`/orders/${o.id}/edit`}>
              <Pencil />
              {t('common.edit')}
            </Link>
          </Button>
          <Button
            onClick={() => void action({ id: o.id, action: 'confirm' })}
            disabled={actionState.isLoading || o.needsPriceApproval || o.lines.length === 0}
          >
            {t('orders.confirm')}
          </Button>
        </div>
      )}

      {o.status === 'YIGILMOQDA' && has(role, WAREHOUSE_ROLES) && (
        <ShipBox order={o} role={role} onShip={() => void action({ id: o.id, action: 'ship' })} />
      )}

      <ErrorText error={actionState.error} />

      <PaymentsCard order={o} role={role} />

      {o.status === 'JONATILDI' && has(role, COMPLETE_ROLES) && <CompleteBox order={o} />}

      <Card>
        <CardHeader>
          <CardTitle>{t('orders.stages')}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStepper status={o.status} history={o.history} />
        </CardContent>
      </Card>

      {o.status !== 'YAKUNLANDI' &&
        o.status !== 'BEKOR' &&
        has(role, ORDER_CANCEL_ROLES) &&
        (o.status !== 'JONATILDI' || role === Role.OWNER) && <CancelOrderBox orderId={o.id} />}
    </div>
  );
}

function LinesCard({
  order: o,
  role,
  showCost,
}: {
  order: OrderDto;
  role: Role | undefined;
  showCost: boolean;
}) {
  const { t } = useTranslation();
  const [pick, pickState] = usePickLineMutation();
  const picking = o.status === 'YIGILMOQDA' && has(role, WAREHOUSE_ROLES);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('purchases.lines')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {o.lines.map((l) => (
            <li key={l.id} className="flex items-start gap-3 py-2">
              {picking && (
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-[var(--primary)]"
                  aria-label={t('orders.picked', { name: l.productName })}
                  checked={l.picked}
                  onChange={(e) => void pick({ id: o.id, lineId: l.id, picked: e.target.checked })}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate">{l.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {l.sku}
                  {l.price < l.listPrice &&
                    ` · ${t('orders.listPrice')}: ${formatMoney(l.listPrice)}`}
                  {o.status === 'JONATILDI' || o.status === 'YAKUNLANDI'
                    ? ''
                    : l.picked && !picking
                      ? ` · ${t('orders.pickedShort')}`
                      : ''}
                </p>
                {l.belowCost && o.status === 'QORALAMA' && (
                  <Badge tone="warn">{t('orders.belowCost')}</Badge>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p>
                  {formatQty(l.quantity)} {t(`units.${l.unit}`)} × {formatMoney(l.price)}
                </p>
                <p className="font-medium">{formatMoney(l.total)}</p>
                {showCost && l.unitCost != null && (
                  <p className="text-xs text-muted-foreground">
                    {t('products.avgCost')}: {formatMoney(l.unitCost)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid gap-1 border-t pt-2 text-sm">
          <p className="flex justify-between font-semibold">
            <span>{t('purchases.total')}</span>
            <span data-testid="order-view-total">{formatMoney(o.total)}</span>
          </p>
          {showCost && o.profit != null && (
            <p className="flex justify-between text-muted-foreground">
              <span>{t('orders.profit')}</span>
              <span>{formatMoney(o.profit)}</span>
            </p>
          )}
        </div>
        <ErrorText error={pickState.error} />
      </CardContent>
    </Card>
  );
}

function ShipBox({
  order: o,
  role,
  onShip,
}: {
  order: OrderDto;
  role: Role | undefined;
  onShip: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: shortages = [] } = useOrderShortagesQuery(o.id);
  const [makePurchase, purchaseState] = useShortagePurchaseMutation();
  const allPicked = o.lines.every((l) => l.picked);
  return (
    <Card>
      <CardContent className="grid gap-3 pt-4 text-sm">
        {shortages.length > 0 && (
          <div className="grid gap-2" data-testid="shortages">
            <p className="font-medium text-destructive">{t('orders.shortagesTitle')}</p>
            <ul className="grid gap-1">
              {shortages.map((s) => (
                <li key={s.productId} className="flex justify-between gap-2">
                  <span className="truncate">{s.productName}</span>
                  <span className="shrink-0">
                    {t('orders.missing', {
                      missing: formatQty(s.missing),
                      available: formatQty(s.available),
                      unit: t(`units.${s.unit}`),
                    })}
                  </span>
                </li>
              ))}
            </ul>
            {has(role, PURCHASE_DRAFT_ROLES) && (
              <Button
                size="sm"
                variant="outline"
                className="justify-self-start"
                disabled={purchaseState.isLoading}
                onClick={async () => {
                  const r = await makePurchase(o.id);
                  if (r.data) navigate(`/purchases/${r.data.id}`);
                }}
              >
                {t('orders.createPurchase')}
              </Button>
            )}
            <ErrorText error={purchaseState.error} />
          </div>
        )}
        {!allPicked && <p className="text-muted-foreground">{t('orders.pickHint')}</p>}
        <Button
          className="justify-self-start"
          disabled={!allPicked || shortages.length > 0}
          onClick={onShip}
        >
          {t('orders.ship')}
        </Button>
      </CardContent>
    </Card>
  );
}

function PaymentsCard({ order: o, role }: { order: OrderDto; role: Role | undefined }) {
  const { t } = useTranslation();
  const due =
    o.status === 'YAKUNLANDI'
      ? o.debt && !o.debt.closedAt
        ? o.debt.remaining - o.paidPending
        : 0
      : o.total - o.paidConfirmed - o.paidPending;
  const canReceive =
    has(role, PAYMENT_RECEIVE_ROLES) && o.status !== 'QORALAMA' && o.status !== 'BEKOR' && due > 0;
  if (o.status === 'QORALAMA') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('payments.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          {o.advancePercent > 0 && (
            <p>
              <span className="block text-muted-foreground">
                {t('orders.advance', { percent: o.advancePercent })}
              </span>
              {formatMoney(o.advanceRequired)}
            </p>
          )}
          <p>
            <span className="block text-muted-foreground">{t('orders.paid')}</span>
            <span data-testid="paid-confirmed">{formatMoney(o.paidConfirmed)}</span>
            {o.paidPending > 0 && (
              <span className="block text-xs text-muted-foreground">
                {t('payments.pendingSum', { amount: formatMoney(o.paidPending) })}
              </span>
            )}
          </p>
          {o.debt && (
            <p>
              <span className="block text-muted-foreground">
                {t('debts.title')} · {t('debts.due')} {o.debt.dueDate}
              </span>
              <span className={o.debt.isOverdue ? 'text-destructive' : ''}>
                {formatMoney(o.debt.remaining)}
              </span>
            </p>
          )}
        </div>
        {o.payments.length > 0 && (
          <ul className="divide-y">
            {o.payments.map((p) => (
              <PaymentRow key={p.id} payment={p} canConfirm={has(role, PAYMENT_CONFIRM_ROLES)} />
            ))}
          </ul>
        )}
        {canReceive && <PaymentForm order={o} due={due} />}
      </CardContent>
    </Card>
  );
}

export function PaymentRow({
  payment: p,
  canConfirm,
  showOrder = false,
}: {
  payment: PaymentDto;
  canConfirm: boolean;
  showOrder?: boolean;
}) {
  const { t } = useTranslation();
  const [confirm, confirmState] = useConfirmPaymentMutation();
  const [reject, rejectState] = useRejectPaymentMutation();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const tone = p.status === 'TASDIQLANGAN' ? 'ok' : p.status === 'RAD_ETILGAN' ? 'danger' : 'warn';
  return (
    <li className="grid grid-cols-1 gap-2 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p>
            <span className="font-medium">{formatMoney(p.amount)}</span> ·{' '}
            {t(`paymentMethod.${p.method}`)}
            {p.isAdvance && ` · ${t('payments.advance')}`}{' '}
            <Badge tone={tone}>{t(`paymentStatus.${p.status}`)}</Badge>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {showOrder && (
              <>
                <Link className="underline" to={`/orders/${p.orderId}`}>
                  {t('orders.numberShort', { number: p.orderNumber })}
                </Link>{' '}
                · {p.customerName} ·{' '}
              </>
            )}
            {formatDate(p.createdAt)} · {p.receivedByName}
            {p.note && ` · ${p.note}`}
            {p.rejectReason && ` · ${p.rejectReason}`}
          </p>
        </div>
      </div>
      {canConfirm && p.status === 'KUTILMOQDA' && (
        <div className="flex flex-wrap items-center gap-2">
          {!rejecting ? (
            <>
              <Button
                size="sm"
                disabled={confirmState.isLoading}
                onClick={() => void confirm(p.id)}
              >
                {t('payments.confirm')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>
                {t('payments.reject')}
              </Button>
            </>
          ) : (
            <>
              <Input
                aria-label={t('common.reason')}
                placeholder={t('common.reason')}
                className="h-9 flex-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={reason.trim().length < 3 || rejectState.isLoading}
                onClick={() => void reject({ id: p.id, body: { reason: reason.trim() } })}
              >
                {t('payments.reject')}
              </Button>
            </>
          )}
          <ErrorText error={confirmState.error ?? rejectState.error} />
        </div>
      )}
    </li>
  );
}

function PaymentForm({ order: o, due }: { order: OrderDto; due: number }) {
  const { t } = useTranslation();
  const suggested =
    o.status === 'AVANS_KUTILMOQDA'
      ? Math.max(0, Math.min(due, o.advanceRequired - o.paidConfirmed - o.paidPending))
      : due;
  const [amount, setAmount] = useState(String(suggested || due));
  const [method, setMethod] = useState<PaymentMethod>('NAQD');
  const [create, { isLoading, error }] = useCreatePaymentMutation();
  const value = Number(amount);
  const valid = Number.isInteger(value) && value > 0 && value <= due;
  return (
    <form
      className="grid gap-2 rounded-md border p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        const r = await create({ orderId: o.id, method, amount: value });
        if (r.data) setAmount('');
      }}
    >
      <p className="font-medium">{t('payments.receive')}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label htmlFor="pay-amount">{t('purchases.expenseAmount')}</Label>
          <Input
            id="pay-amount"
            type="number"
            inputMode="numeric"
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="pay-method">{t('payments.method')}</Label>
          <Select
            id="pay-method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`paymentMethod.${m}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('payments.dueHint', { amount: formatMoney(due) })}
      </p>
      <ErrorText error={error} />
      <Button type="submit" className="justify-self-start" disabled={!valid || isLoading}>
        {t('payments.receive')}
      </Button>
    </form>
  );
}

function CompleteBox({ order: o }: { order: OrderDto }) {
  const { t } = useTranslation();
  const [dueDate, setDueDate] = useState('');
  const [complete, { isLoading, error }] = useCompleteOrderMutation();
  const remaining = o.total - o.paidConfirmed;
  return (
    <Card>
      <CardContent className="grid gap-2 pt-4 text-sm">
        {o.paidPending > 0 && <p className="text-muted-foreground">{t('orders.pendingFirst')}</p>}
        {remaining > 0 && (
          <>
            <p>{t('orders.debtHint', { amount: formatMoney(remaining) })}</p>
            <Label htmlFor="due-date">{t('debts.dueDate')}</Label>
            <Input
              id="due-date"
              type="date"
              className="sm:w-48"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </>
        )}
        <ErrorText error={error} />
        <Button
          className="justify-self-start"
          disabled={isLoading || o.paidPending > 0 || (remaining > 0 && !dueDate)}
          onClick={() => void complete({ id: o.id, body: remaining > 0 ? { dueDate } : {} })}
        >
          {remaining > 0 ? t('orders.completeWithDebt') : t('orders.complete')}
        </Button>
      </CardContent>
    </Card>
  );
}

function CancelOrderBox({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [cancel, { isLoading, error }] = useCancelOrderMutation();
  if (!open) {
    return (
      <Button
        variant="ghost"
        className="justify-self-start text-destructive"
        onClick={() => setOpen(true)}
      >
        {t('orders.cancel')}
      </Button>
    );
  }
  return (
    <Card>
      <CardContent className="grid gap-2 pt-4">
        <Label htmlFor="order-cancel-reason">{t('common.reason')}</Label>
        <Input
          id="order-cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <ErrorText error={error} />
        <div className="flex gap-2">
          <Button
            variant="destructive"
            disabled={isLoading || reason.trim().length < 3}
            onClick={() => void cancel({ id: orderId, body: { reason: reason.trim() } })}
          >
            {t('orders.cancel')}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('common.close')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
