import { zodResolver } from '@hookform/resolvers/zod';
import {
  discountPercent,
  type OrderDraftInput,
  orderDraftSchema,
  type OrderDto,
  orderLineTotal,
} from '@savdo/shared';
import { Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { type Resolver, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ErrorText, PageHeader } from '@/components/common';
import { ProductPicker } from '@/components/ProductPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { formatMoney, formatQty } from '@/lib/format';
import {
  useCreateOrderMutation,
  useCustomersQuery,
  useOrderQuery,
  useProductsQuery,
  useUpdateOrderMutation,
} from '@/store/api';

export function OrderEditorPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data, isLoading, error } = useOrderQuery(id ?? '', { skip: !id });
  if (id && isLoading) return <p className="text-muted-foreground">{t('app.loading')}</p>;
  if (id && !data) return <ErrorText error={error} />;
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={data ? t('orders.numberShort', { number: data.number }) : t('orders.new')}
      />
      <OrderForm key={data?.id ?? 'new'} order={data} />
    </div>
  );
}

type FormValues = {
  customerId: string;
  note: string;
  lines: { productId: string; quantity: number; price: number }[];
};

function OrderForm({ order }: { order?: OrderDto }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: customers = [] } = useCustomersQuery();
  const { data: products = [] } = useProductsQuery();
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const listPrice = (productId: string) =>
    order?.lines.find((l) => l.productId === productId)?.listPrice ??
    productById.get(productId)?.salePrice ??
    0;

  const [create, createState] = useCreateOrderMutation();
  const [update, updateState] = useUpdateOrderMutation();
  const { control, register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(orderDraftSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      customerId: order?.customerId ?? params.get('customer') ?? '',
      note: order?.note ?? '',
      lines:
        order?.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          price: l.price,
        })) ?? [],
    },
  });
  const lines = useFieldArray({ control, name: 'lines' });
  const watched = useWatch({ control, name: 'lines' });
  const total = watched.reduce(
    (a, l) =>
      a + (l.quantity > 0 && Number.isFinite(l.price) ? orderLineTotal(l.quantity, l.price) : 0),
    0,
  );
  const used = new Set(watched.map((l) => l.productId));
  const lineErrors = formState.errors.lines;

  const onSubmit = handleSubmit(async (v) => {
    const body: OrderDraftInput = {
      customerId: v.customerId,
      note: v.note,
      lines: v.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, price: l.price })),
    };
    const r = order ? await update({ id: order.id, body }) : await create(body);
    if (r.data) navigate(`/orders/${r.data.id}`, { replace: true });
  });

  return (
    <form noValidate className="grid gap-4" onSubmit={onSubmit}>
      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="o-customer">{t('orders.customer')}</Label>
            <Select id="o-customer" {...register('customerId')}>
              <option value="">{t('orders.chooseCustomer')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {formState.errors.customerId && (
              <p className="text-sm text-destructive">{t('validation.required')}</p>
            )}
            <Link to="/customers" className="text-xs text-muted-foreground underline">
              {t('orders.newCustomerHint')}
            </Link>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="o-note">{t('purchases.note')}</Label>
            <Input id="o-note" {...register('note')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('purchases.lines')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {lines.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('purchases.noLines')}</p>
          )}
          {lines.fields.map((f, i) => {
            const p = productById.get(f.productId);
            const w = watched[i];
            const list = listPrice(f.productId);
            const disc = w ? discountPercent(list, w.price) : 0;
            const err = Array.isArray(lineErrors) ? lineErrors[i] : undefined;
            return (
              <div key={f.id} className="grid gap-2 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-medium">
                    {p?.name ?? order?.lines.find((l) => l.productId === f.productId)?.productName}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {t('orders.listPrice')}: {formatMoney(list)}
                      {p &&
                        ` · ${t('products.stock')}: ${formatQty(p.stock)} ${t(`units.${p.unit}`)}`}
                    </span>
                  </p>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('common.remove')}
                    onClick={() => lines.remove(i)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor={`ol-q-${i}`}>{t('purchases.quantity')}</Label>
                    <Input
                      id={`ol-q-${i}`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      {...register(`lines.${i}.quantity`, { valueAsNumber: true })}
                    />
                    {err?.quantity?.message && (
                      <p className="text-xs text-destructive">{t(err.quantity.message)}</p>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`ol-p-${i}`}>{t('orders.price')}</Label>
                    <Input
                      id={`ol-p-${i}`}
                      type="number"
                      inputMode="numeric"
                      step={1}
                      {...register(`lines.${i}.price`, { valueAsNumber: true })}
                    />
                    {err?.price?.message && (
                      <p className="text-xs text-destructive">{t(err.price.message)}</p>
                    )}
                  </div>
                </div>
                {w && w.quantity > 0 && Number.isFinite(w.price) && (
                  <p className="text-xs text-muted-foreground" data-testid={`order-line-${i}`}>
                    {t('orders.lineTotal')}: {formatMoney(orderLineTotal(w.quantity, w.price))}
                    {disc > 0 && ` · ${t('orders.discount', { percent: disc })}`}
                  </p>
                )}
              </div>
            );
          })}
          <ProductPicker
            showPrice
            products={products.filter((p) => !used.has(p.id))}
            onPick={(p) => lines.append({ productId: p.id, quantity: 1, price: p.salePrice })}
          />
          {lineErrors && !Array.isArray(lineErrors) && lineErrors.message && (
            <p className="text-sm text-destructive">{t(lineErrors.message)}</p>
          )}
        </CardContent>
      </Card>

      <p className="text-right text-lg font-semibold" data-testid="order-total">
        {t('purchases.total')}: {formatMoney(total)}
      </p>
      <ErrorText error={createState.error ?? updateState.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={createState.isLoading || updateState.isLoading}>
          {t('common.save')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
