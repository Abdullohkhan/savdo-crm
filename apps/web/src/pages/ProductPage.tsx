import { zodResolver } from '@hookform/resolvers/zod';
import {
  CATALOG_EDIT_ROLES,
  canSeeCost,
  type ProductDto,
  STOCKTAKE_ROLES,
  stockAdjustmentSchema,
} from '@savdo/shared';
import { Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import type { z } from 'zod';
import { Badge, ErrorText, PageHeader } from '@/components/common';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate, formatMoney, formatQty, optionalNumber } from '@/lib/format';
import { useAppSelector } from '@/store';
import {
  useAdjustStockMutation,
  useCategoriesQuery,
  useProductMovementsQuery,
  useProductQuery,
  useUpdateProductMutation,
} from '@/store/api';

export function ProductPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const { data: p, isLoading, error } = useProductQuery(id);
  const { data: categories = [] } = useCategoriesQuery();
  const [update, updateState] = useUpdateProductMutation();

  if (isLoading) return <p className="text-muted-foreground">{t('app.loading')}</p>;
  if (!p) return <ErrorText error={error} />;

  const showCost = canSeeCost(role);
  const canEdit = !!role && CATALOG_EDIT_ROLES.includes(role);
  const canCount = !!role && STOCKTAKE_ROLES.includes(role);
  const category = categories.find((c) => c.id === p.categoryId);
  const unit = t(`units.${p.unit}`);

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={p.name}
        actions={
          canEdit && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/products/${p.id}/edit`}>
                <Pencil />
                {t('common.edit')}
              </Link>
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm sm:grid-cols-3">
          <Info label={t('products.stock')}>
            <span className="text-lg font-semibold">
              {formatQty(p.stock)} {unit}
            </span>{' '}
            {p.isLow && <Badge tone="warn">{t('products.low')}</Badge>}
          </Info>
          <Info label={t('products.salePrice')}>
            <span className="text-lg font-semibold">{formatMoney(p.salePrice)}</span>{' '}
            <Badge>{p.priceManual ? t('products.priceManual') : t('products.priceAuto')}</Badge>
          </Info>
          {showCost && p.avgCost !== undefined && (
            <Info label={t('products.avgCost')}>{formatMoney(p.avgCost)}</Info>
          )}
          <Info label={t('products.sku')}>{p.sku}</Info>
          <Info label={t('products.barcode')}>{p.barcode || '—'}</Info>
          <Info label={t('products.category')}>{category?.name ?? '—'}</Info>
          <Info label={t('products.minStock')}>
            {formatQty(p.minStock)} {unit}
          </Info>
          <Info label={t('common.status')}>
            {p.isActive ? t('common.active') : <Badge>{t('common.inactive')}</Badge>}
          </Info>
        </CardContent>
        {canEdit && (
          <CardContent className="flex flex-wrap gap-2">
            {showCost && p.priceManual && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void update({ id: p.id, body: { priceManual: false } })}
              >
                {t('products.backToAuto')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void update({ id: p.id, body: { isActive: !p.isActive } })}
            >
              {p.isActive ? t('common.deactivate') : t('common.activate')}
            </Button>
            <ErrorText error={updateState.error} />
          </CardContent>
        )}
      </Card>

      {canCount && <StocktakeCard product={p} />}
      <MovementsCard productId={p.id} unit={unit} showCost={showCost} />
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">{label}</p>
      <div className="break-words">{children}</div>
    </div>
  );
}

type StocktakeValues = z.infer<typeof stockAdjustmentSchema>;

function StocktakeCard({ product }: { product: ProductDto }) {
  const { t } = useTranslation();
  const [adjust, { isLoading, error, isSuccess }] = useAdjustStockMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StocktakeValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: { productId: product.id, reason: '' },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('stock.stocktake')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('stock.stocktakeHint')}</p>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end"
          onSubmit={handleSubmit(async (v) => {
            const r = await adjust(v);
            if (!r.error) reset({ productId: product.id, reason: '' });
          })}
        >
          <Field id="st-qty" label={t('stock.actual')} error={errors.actualQuantity?.message}>
            <Input
              id="st-qty"
              type="number"
              inputMode="decimal"
              step="any"
              {...register('actualQuantity', { setValueAs: optionalNumber })}
            />
          </Field>
          <Field id="st-reason" label={t('common.reason')} error={errors.reason?.message}>
            <Input id="st-reason" {...register('reason')} />
          </Field>
          <Button type="submit" disabled={isLoading}>
            {t('common.save')}
          </Button>
        </form>
        <ErrorText error={error} />
        {isSuccess && <p className="mt-2 text-sm text-primary">{t('settings.saved')}</p>}
      </CardContent>
    </Card>
  );
}

function MovementsCard({
  productId,
  unit,
  showCost,
}: {
  productId: string;
  unit: string;
  showCost: boolean;
}) {
  const { t } = useTranslation();
  const { data = [] } = useProductMovementsQuery(productId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('stock.history')}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('stock.noMovements')}</p>
        ) : (
          <ul className="divide-y text-sm">
            {data.map((m) => (
              <li key={m.id} className="flex items-start gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p>
                    <Badge tone={m.quantity < 0 ? 'danger' : 'ok'}>{t(`movement.${m.type}`)}</Badge>{' '}
                    {m.purchaseId && (
                      <Link className="underline" to={`/purchases/${m.purchaseId}`}>
                        {t('purchases.numberShort', { number: m.purchaseNumber })}
                      </Link>
                    )}
                    {m.orderId && (
                      <Link className="underline" to={`/orders/${m.orderId}`}>
                        {t('orders.numberShort', { number: m.orderNumber })}
                      </Link>
                    )}
                  </p>
                  <p className="truncate text-muted-foreground">
                    {formatDate(m.createdAt)} · {m.userName}
                    {m.note && ` · ${m.note}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={m.quantity < 0 ? 'text-destructive' : ''}>
                    {m.quantity > 0 ? '+' : ''}
                    {formatQty(m.quantity)} {unit}
                  </p>
                  {showCost && m.unitCost !== undefined && (
                    <p className="text-muted-foreground">{formatMoney(m.unitCost)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
