import { zodResolver } from '@hookform/resolvers/zod';
import { type SupplierCreateInput, supplierCreateSchema, type SupplierDto } from '@savdo/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Badge, ErrorText, PageHeader } from '@/components/common';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useCreateSupplierMutation,
  useSuppliersQuery,
  useUpdateSupplierMutation,
} from '@/store/api';

type Mode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; supplier: SupplierDto };

export function SuppliersPage() {
  const { t } = useTranslation();
  const { data = [] } = useSuppliersQuery();
  const [mode, setMode] = useState<Mode>({ kind: 'closed' });
  const [update, updateState] = useUpdateSupplierMutation();

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={t('suppliers.title')}
        actions={
          <Button size="sm" onClick={() => setMode({ kind: 'create' })}>
            <Plus />
            {t('common.add')}
          </Button>
        }
      />
      {mode.kind !== 'closed' && (
        <SupplierForm
          key={mode.kind === 'edit' ? mode.supplier.id : 'new'}
          supplier={mode.kind === 'edit' ? mode.supplier : undefined}
          onDone={() => setMode({ kind: 'closed' })}
        />
      )}
      <ErrorText error={updateState.error} />
      {data.length === 0 ? (
        <p className="text-muted-foreground">{t('suppliers.empty')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {data.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 p-3">
              <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                <p className="truncate font-medium">
                  {s.name} {!s.isActive && <Badge>{t('common.inactive')}</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[s.phone, s.inn && `${t('settings.inn')}: ${s.inn}`]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode({ kind: 'edit', supplier: s })}
              >
                {t('common.edit')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void update({ id: s.id, body: { isActive: !s.isActive } })}
              >
                {s.isActive ? t('common.deactivate') : t('common.activate')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SupplierForm({ supplier, onDone }: { supplier?: SupplierDto; onDone: () => void }) {
  const { t } = useTranslation();
  const [create, createState] = useCreateSupplierMutation();
  const [update, updateState] = useUpdateSupplierMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierCreateInput>({
    resolver: zodResolver(supplierCreateSchema),
    defaultValues: supplier
      ? { name: supplier.name, phone: supplier.phone, inn: supplier.inn }
      : undefined,
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <form
          noValidate
          className="grid gap-3"
          onSubmit={handleSubmit(async (v) => {
            const r = supplier ? await update({ id: supplier.id, body: v }) : await create(v);
            if (!r.error) onDone();
          })}
        >
          <Field id="s-name" label={t('suppliers.name')} error={errors.name?.message}>
            <Input id="s-name" {...register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="s-phone" label={t('suppliers.phone')} error={errors.phone?.message}>
              <Input id="s-phone" type="tel" inputMode="tel" {...register('phone')} />
            </Field>
            <Field id="s-inn" label={t('settings.inn')} error={errors.inn?.message}>
              <Input id="s-inn" inputMode="numeric" {...register('inn')} />
            </Field>
          </div>
          <ErrorText error={createState.error ?? updateState.error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={createState.isLoading || updateState.isLoading}>
              {t('common.save')}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
