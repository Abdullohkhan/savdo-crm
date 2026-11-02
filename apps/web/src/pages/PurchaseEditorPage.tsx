import { zodResolver } from '@hookform/resolvers/zod';
import {
  canSeeCost,
  computeLandedCosts,
  COST_VISIBLE_ROLES,
  type ProductDto,
  type PurchaseDraftInput,
  purchaseDraftSchema,
  type PurchaseDto,
} from '@savdo/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type Resolver, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorText, PageHeader } from '@/components/common';
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { formatDate, formatMoney, formatQty, nullableNumber } from '@/lib/format';
import { useAppSelector } from '@/store';
import {
  useCancelPurchaseMutation,
  useConfirmPurchaseMutation,
  useCreatePurchaseMutation,
  useProductsQuery,
  usePurchaseQuery,
  useSuppliersQuery,
  useUpdatePurchaseMutation,
} from '@/store/api';

export function PurchaseEditorPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data, isLoading, error } = usePurchaseQuery(id ?? '', { skip: !id });

  if (id && isLoading) return <p className="text-muted-foreground">{t('app.loading')}</p>;
  if (id && !data) return <ErrorText error={error} />;

  const title = data ? t('purchases.numberShort', { number: data.number }) : t('purchases.new');
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title={title} actions={data && <PurchaseStatusBadge status={data.status} />} />
      {data && data.status !== 'QORALAMA' ? (
        <PurchaseView purchase={data} />
      ) : (
        <DraftEditor key={data?.id ?? 'new'} purchase={data} />
      )}
    </div>
  );
}

type FormValues = {
  supplierId: string | null;
  note: string;
  lines: { productId: string; quantity: number; price: number | null }[];
  expenses: { title: string; amount: number }[];
};

function DraftEditor({ purchase }: { purchase?: PurchaseDto }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.user?.role);
  const showCost = canSeeCost(role);
  const { data: suppliers = [] } = useSuppliersQuery();
  const { data: products = [] } = useProductsQuery();
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [create, createState] = useCreatePurchaseMutation();
  const [update, updateState] = useUpdatePurchaseMutation();
  const [confirm, confirmState] = useConfirmPurchaseMutation();

  const { control, register, handleSubmit, formState } = useForm<FormValues>({
    // Forma qiymatlari sxema bilan bir xil shaklda (bo'sh maydonlar null/[])
    resolver: zodResolver(purchaseDraftSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      supplierId: purchase?.supplierId ?? null,
      note: purchase?.note ?? '',
      lines:
        purchase?.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          price: l.price ?? null,
        })) ?? [],
      expenses: purchase?.expenses?.map((e) => ({ title: e.title, amount: e.amount })) ?? [],
    },
  });
  const lines = useFieldArray({ control, name: 'lines' });
  const expenses = useFieldArray({ control, name: 'expenses' });
  const watchedLines = useWatch({ control, name: 'lines' });
  const watchedExpenses = useWatch({ control, name: 'expenses' });

  const preview = useMemo(() => {
    if (!showCost || watchedLines.length === 0) return null;
    if (watchedLines.some((l) => !(l.quantity > 0) || l.price === null || Number.isNaN(l.price)))
      return null;
    const exp = watchedExpenses.reduce((a, e) => a + (Number.isFinite(e.amount) ? e.amount : 0), 0);
    try {
      return computeLandedCosts(
        watchedLines.map((l) => ({ quantity: l.quantity, price: l.price! })),
        exp,
      );
    } catch {
      return null;
    }
  }, [showCost, watchedLines, watchedExpenses]);

  const toBody = (v: FormValues): PurchaseDraftInput => ({
    supplierId: v.supplierId || null,
    note: v.note,
    lines: v.lines.map((l) =>
      showCost
        ? { productId: l.productId, quantity: l.quantity, price: l.price }
        : { productId: l.productId, quantity: l.quantity },
    ),
    ...(showCost ? { expenses: v.expenses } : {}),
  });

  const save = async (v: FormValues): Promise<string | null> => {
    const body = toBody(v);
    const r = purchase ? await update({ id: purchase.id, body }) : await create(body);
    if (!r.data) return null;
    if (!purchase) navigate(`/purchases/${r.data.id}`, { replace: true });
    return r.data.id;
  };

  const onConfirm = handleSubmit(async (v) => {
    const savedId = await save(v);
    if (savedId) await confirm(savedId);
  });

  const usedIds = new Set(watchedLines.map((l) => l.productId));
  const lineErrors = formState.errors.lines;

  return (
    <form
      noValidate
      className="grid grid-cols-1 gap-4"
      onSubmit={handleSubmit(async (v) => void (await save(v)))}
    >
      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="pu-supplier">{t('purchases.supplier')}</Label>
            <Select
              id="pu-supplier"
              {...register('supplierId', { setValueAs: (v) => (v ? v : null) })}
            >
              <option value="">{t('purchases.noSupplier')}</option>
              {suppliers
                .filter((s) => s.isActive || s.id === purchase?.supplierId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pu-note">{t('purchases.note')}</Label>
            <Input id="pu-note" {...register('note')} />
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
            const unit = p ? t(`units.${p.unit}`) : '';
            const err = Array.isArray(lineErrors) ? lineErrors[i] : undefined;
            return (
              <div key={f.id} className="grid gap-2 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-medium">
                    {p?.name ??
                      purchase?.lines.find((l) => l.productId === f.productId)?.productName}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {p?.sku}
                      {showCost && p?.avgCost !== undefined && p.avgCost > 0 && (
                        <>
                          {' '}
                          · {t('products.avgCost')}: {formatMoney(p.avgCost)}
                        </>
                      )}
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
                    <Label htmlFor={`l-q-${i}`}>
                      {t('purchases.quantity')} {unit && `(${unit})`}
                    </Label>
                    <Input
                      id={`l-q-${i}`}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      {...register(`lines.${i}.quantity`, { valueAsNumber: true })}
                    />
                    {err?.quantity?.message && (
                      <p className="text-xs text-destructive">{t(err.quantity.message)}</p>
                    )}
                  </div>
                  {showCost && (
                    <div className="grid gap-1">
                      <Label htmlFor={`l-p-${i}`}>{t('purchases.price')}</Label>
                      <Input
                        id={`l-p-${i}`}
                        type="number"
                        inputMode="numeric"
                        step={1}
                        {...register(`lines.${i}.price`, { setValueAs: nullableNumber })}
                      />
                      {err?.price?.message && (
                        <p className="text-xs text-destructive">{t(err.price.message)}</p>
                      )}
                    </div>
                  )}
                </div>
                {preview?.[i] && (
                  <p className="text-xs text-muted-foreground" data-testid={`landed-${i}`}>
                    {t('purchases.landedPreview', {
                      expense: formatMoney(preview[i].allocatedExpense),
                      unitCost: formatMoney(preview[i].unitCost),
                    })}
                  </p>
                )}
              </div>
            );
          })}
          <ProductPicker
            products={products.filter((p) => !usedIds.has(p.id))}
            onPick={(p) => lines.append({ productId: p.id, quantity: 1, price: null })}
          />
          {lineErrors && !Array.isArray(lineErrors) && lineErrors.message && (
            <p className="text-sm text-destructive">{t(lineErrors.message)}</p>
          )}
        </CardContent>
      </Card>

      {showCost && (
        <Card>
          <CardHeader>
            <CardTitle>{t('purchases.expenses')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('purchases.expensesHint')}</p>
          </CardHeader>
          <CardContent className="grid gap-2">
            {expenses.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_120px_auto] gap-2">
                <Input
                  aria-label={t('purchases.expenseTitle')}
                  placeholder={t('purchases.expenseTitle')}
                  {...register(`expenses.${i}.title`)}
                />
                <Input
                  aria-label={t('purchases.expenseAmount')}
                  type="number"
                  inputMode="numeric"
                  step={1}
                  {...register(`expenses.${i}.amount`, { valueAsNumber: true })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t('common.remove')}
                  onClick={() => expenses.remove(i)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-self-start"
              onClick={() => expenses.append({ title: '', amount: 0 })}
            >
              <Plus />
              {t('purchases.addExpense')}
            </Button>
          </CardContent>
        </Card>
      )}

      {showCost && preview && (
        <p className="text-right font-medium" data-testid="purchase-total">
          {t('purchases.total')}: {formatMoney(preview.reduce((a, l) => a + l.landedTotal, 0))}
        </p>
      )}

      {formState.errors.expenses && (
        <p className="text-sm text-destructive">{t('validation.failed')}</p>
      )}
      <ErrorText error={createState.error ?? updateState.error ?? confirmState.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={createState.isLoading || updateState.isLoading}>
          {t('purchases.saveDraft')}
        </Button>
        {role && COST_VISIBLE_ROLES.includes(role) && (
          <Button
            type="button"
            variant="secondary"
            disabled={confirmState.isLoading}
            onClick={() => void onConfirm()}
          >
            {t('purchases.confirm')}
          </Button>
        )}
        <Button type="button" variant="ghost" asChild>
          <Link to="/purchases">{t('common.back')}</Link>
        </Button>
      </div>
      {purchase && showCost && <CancelBox purchaseId={purchase.id} />}
    </form>
  );
}

function ProductPicker({
  products,
  onPick,
}: {
  products: ProductDto[];
  onPick: (p: ProductDto) => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const matches = query
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query) ||
            p.barcode === q.trim(),
        )
        .slice(0, 8)
    : [];
  return (
    <div className="grid gap-1">
      <Input
        aria-label={t('purchases.addProduct')}
        placeholder={t('purchases.addProduct')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {matches.length > 0 && (
        <ul className="divide-y rounded-md border">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 p-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onPick(p);
                  setQ('');
                }}
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-muted-foreground">{p.sku}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t('purchases.noProductFound')}{' '}
          <Link className="underline" to="/products/new">
            {t('products.add')}
          </Link>
        </p>
      )}
    </div>
  );
}

function CancelBox({ purchaseId }: { purchaseId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [cancel, { isLoading, error }] = useCancelPurchaseMutation();
  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="justify-self-start text-destructive"
        onClick={() => setOpen(true)}
      >
        {t('purchases.cancel')}
      </Button>
    );
  }
  return (
    <Card>
      <CardContent className="grid gap-2 pt-4">
        <Label htmlFor="cancel-reason">{t('common.reason')}</Label>
        <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <ErrorText error={error} />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading || reason.trim().length < 3}
            onClick={() => void cancel({ id: purchaseId, body: { reason: reason.trim() } })}
          >
            {t('purchases.cancel')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t('common.close')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PurchaseView({ purchase: p }: { purchase: PurchaseDto }) {
  const { t } = useTranslation();
  const showCost = canSeeCost(useAppSelector((s) => s.auth.user?.role));
  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardContent className="grid gap-1 pt-4 text-sm">
          <p>
            {t('purchases.supplier')}: {p.supplierName ?? t('purchases.noSupplier')}
          </p>
          <p className="text-muted-foreground">
            {formatDate(p.createdAt)} · {p.createdByName}
          </p>
          {p.confirmedAt && (
            <p className="text-muted-foreground">
              {t('purchaseStatus.TASDIQLANGAN')}: {formatDate(p.confirmedAt)}
            </p>
          )}
          {p.cancelledAt && (
            <p className="text-destructive">
              {t('purchaseStatus.BEKOR')}: {formatDate(p.cancelledAt)} — {p.cancelReason}
            </p>
          )}
          {p.note && <p>{p.note}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('purchases.lines')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {p.lines.map((l) => (
              <li key={l.id} className="flex items-start gap-3 py-2">
                <Link
                  to={`/products/${l.productId}`}
                  className="min-w-0 flex-1 underline-offset-2 hover:underline"
                >
                  {l.productName}
                </Link>
                <div className="shrink-0 text-right">
                  <p>
                    {formatQty(l.quantity)} {t(`units.${l.unit}`)}
                    {showCost && l.price != null && ` × ${formatMoney(l.price)}`}
                  </p>
                  {showCost && l.unitCost != null && (
                    <p className="text-muted-foreground">
                      {t('purchases.unitCost')}: {formatMoney(l.unitCost)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {showCost && p.expenses && p.expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('purchases.expenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {p.expenses.map((e) => (
                <li key={e.id} className="flex justify-between py-2">
                  <span>{e.title}</span>
                  <span>{formatMoney(e.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {showCost && p.total != null && (
        <p className="text-right font-medium">
          {t('purchases.total')}: {formatMoney(p.total)}
        </p>
      )}
      {showCost && p.status === 'TASDIQLANGAN' && <CancelBox purchaseId={p.id} />}
    </div>
  );
}
