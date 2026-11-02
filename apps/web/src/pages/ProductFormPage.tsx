import { zodResolver } from '@hookform/resolvers/zod';
import {
  canSeeCost,
  type ProductCreateInput,
  productCreateSchema,
  type ProductDto,
  UNITS,
} from '@savdo/shared';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { CategorySelect } from '@/components/CategorySelect';
import { ErrorText, PageHeader } from '@/components/common';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { optionalNumber } from '@/lib/format';
import { useAppSelector } from '@/store';
import { useCreateProductMutation, useProductQuery, useUpdateProductMutation } from '@/store/api';

export function ProductFormPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data, isLoading } = useProductQuery(id ?? '', { skip: !id });
  if (id && isLoading) return <p className="text-muted-foreground">{t('app.loading')}</p>;
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title={id ? t('products.edit') : t('products.add')} />
      <ProductForm key={data?.id ?? 'new'} product={id ? data : undefined} />
    </div>
  );
}

function ProductForm({ product }: { product?: ProductDto }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showCost = canSeeCost(useAppSelector((s) => s.auth.user?.role));
  const [create, createState] = useCreateProductMutation();
  const [update, updateState] = useUpdateProductMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
  } = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: product
      ? {
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          unit: product.unit,
          categoryId: product.categoryId,
          minStock: product.minStock,
          salePrice: product.priceManual ? product.salePrice : undefined,
        }
      : { unit: 'dona', minStock: 0 },
  });

  const onSubmit = handleSubmit(async (v) => {
    const body = { ...v, categoryId: v.categoryId || null };
    // Narx maydoni o'zgartirilmagan bo'lsa yubormaymiz (aks holda qo'lda narx bo'lib qoladi)
    if (!dirtyFields.salePrice) delete body.salePrice;
    const r = product ? await update({ id: product.id, body }) : await create(body);
    if (r.data) navigate(`/products/${r.data.id}`, { replace: true });
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <form noValidate className="grid gap-3" onSubmit={onSubmit}>
          <Field id="p-name" label={t('products.name')} error={errors.name?.message}>
            <Input id="p-name" {...register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="p-sku" label={t('products.sku')} error={errors.sku?.message}>
              <Input id="p-sku" {...register('sku')} />
            </Field>
            <Field id="p-barcode" label={t('products.barcode')} error={errors.barcode?.message}>
              <Input id="p-barcode" inputMode="numeric" {...register('barcode')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="p-unit" label={t('products.unit')} error={errors.unit?.message}>
              <Select id="p-unit" {...register('unit')}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`units.${u}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="p-min" label={t('products.minStock')} error={errors.minStock?.message}>
              <Input
                id="p-min"
                type="number"
                inputMode="decimal"
                step="any"
                {...register('minStock', { setValueAs: optionalNumber })}
              />
            </Field>
          </div>
          <Field id="p-cat" label={t('products.category')} error={errors.categoryId?.message}>
            <CategorySelect
              id="p-cat"
              emptyLabel={t('products.noCategory')}
              {...register('categoryId', { setValueAs: (v) => (v ? v : null) })}
            />
          </Field>
          {showCost && (
            <Field id="p-price" label={t('products.manualPrice')} error={errors.salePrice?.message}>
              <Input
                id="p-price"
                type="number"
                inputMode="numeric"
                step={1}
                placeholder={t('products.autoPriceHint')}
                {...register('salePrice', { setValueAs: optionalNumber })}
              />
            </Field>
          )}
          <ErrorText error={createState.error ?? updateState.error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={createState.isLoading || updateState.isLoading}>
              {t('common.save')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
